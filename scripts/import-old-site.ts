/**
 * One-off (but idempotent) import of premiumchoiceschooltrips.com content,
 * crawled into scripts/data/old-site-migration.json.
 *
 * - Upserts all 19 subjects and 33 countries (with regions)
 * - Skips trips whose title matches an existing DB trip (the curated set)
 * - Downloads each trip's hero photo and re-hosts it in the trip-images bucket
 * - Publishes everything except trips that need editorial review (no subject)
 *
 * Usage: npx tsx scripts/import-old-site.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// The old site's full menus (some subjects/countries have no trips yet — migrate anyway)
const ALL_SUBJECTS = [
  'Art & Design', 'Business & Economics', 'Design and Technology', 'English Literature',
  'Film & Media Studies', 'Geography', 'History', 'Languages', 'Mathematics', 'Music',
  'Outdoor Education', 'Performing Arts', 'Politics', 'Religious', 'Science', 'Skiing',
  'Sport & Physical Education', 'STEAM', 'Volunteering',
];

const REGIONS: Record<string, string> = {
  Australia: 'Oceania', Austria: 'Europe', Belgium: 'Europe', Cambodia: 'Asia',
  'Czech Republic': 'Europe', France: 'Europe', Germany: 'Europe', Greece: 'Europe',
  'Hong Kong': 'Asia', Iceland: 'Europe', India: 'Asia', Ireland: 'Europe', Italy: 'Europe',
  Japan: 'Asia', Jordan: 'Middle East', Kenya: 'Africa', 'London, France & Belgium': 'Europe',
  Nepal: 'Asia', Netherlands: 'Europe', 'New Zealand': 'Oceania', Oman: 'Middle East',
  'Saudi Arabia': 'Middle East', Singapore: 'Asia', 'South Africa': 'Africa', Spain: 'Europe',
  'Sri Lanka': 'Asia', Switzerland: 'Europe', Turkey: 'Europe', Uganda: 'Africa',
  'United Kingdom': 'Europe', USA: 'Americas', Vietnam: 'Asia', Zambia: 'Africa',
};

const COUNTRY_CLEANUP: Record<string, string> = {
  Hongkong: 'Hong Kong',
  'Saudi  Arabia': 'Saudi Arabia',
  'London, France , Belgium': 'London, France & Belgium',
};

// Old ids that need special handling
const SKIP_IDS = new Set([93]); // "Bentota" — no country/itinerary/includes on the old site
const SUBJECT_OVERRIDES: Record<number, string> = { 24: 'Religious' }; // title: Religious Trip to Rome
const DRAFT_IDS = new Set([97]); // "Salalah Oman" — no subject on old site; review in admin

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const normTitle = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

async function rehostImage(imageUrl: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (imageUrl.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `migrated/${slug}.${ext}`;
    const { error } = await db.storage.from('trip-images').upload(path, buf, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return db.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
  } catch (e: any) {
    console.warn(`  ! image failed for ${slug}: ${e.message} — keeping old-site URL`);
    return imageUrl;
  }
}

async function main() {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), 'scripts', 'data', 'old-site-migration.json'), 'utf8')
  );
  const trips: any[] = data.trips;
  console.log(`Importing from crawl of ${data.crawled}: ${trips.length} trips`);

  // 1. Subjects
  const subjectRows = ALL_SUBJECTS.map((name) => ({ name, slug: slugify(name) }));
  {
    const { error } = await db.from('subjects').upsert(subjectRows, { onConflict: 'name' });
    if (error) throw new Error(`subjects: ${error.message}`);
  }

  // 2. Countries (menu list + any found in trips, cleaned)
  const countryNames = new Set<string>(Object.keys(REGIONS));
  for (const t of trips) {
    const clean = COUNTRY_CLEANUP[t.country] ?? t.country;
    if (clean && clean !== 'Admin') countryNames.add(clean);
  }
  const countryRows = [...countryNames].map((name) => ({
    name,
    slug: slugify(name),
    region: REGIONS[name] ?? null,
  }));
  {
    const { error } = await db.from('countries').upsert(countryRows, { onConflict: 'name' });
    if (error) throw new Error(`countries: ${error.message}`);
  }

  const { data: subjects } = await db.from('subjects').select('id, name');
  const { data: countries } = await db.from('countries').select('id, name');
  const subjectId = new Map(subjects!.map((r) => [r.name, r.id]));
  const countryId = new Map(countries!.map((r) => [r.name, r.id]));

  // 3. Existing trips (for dedupe against the curated set and idempotent re-runs)
  const { data: existing } = await db.from('trips').select('slug, title');
  const existingTitles = new Set(existing!.map((t) => normTitle(t.title)));
  const existingSlugs = new Set(existing!.map((t) => t.slug));

  let imported = 0, skippedDup = 0, skippedJunk = 0, drafts = 0;

  for (const t of trips) {
    if (SKIP_IDS.has(t.oldId)) { skippedJunk++; console.log(`  – skip #${t.oldId} ${t.title} (junk/incomplete)`); continue; }
    if (existingTitles.has(normTitle(t.title))) { skippedDup++; console.log(`  – skip #${t.oldId} ${t.title} (already curated)`); continue; }

    let slug = slugify(t.title);
    if (existingSlugs.has(slug)) { skippedDup++; console.log(`  – skip #${t.oldId} ${t.title} (slug exists)`); continue; }

    const subjectName = SUBJECT_OVERRIDES[t.oldId] ?? (t.subject === 'Admin' ? null : t.subject);
    const countryName = COUNTRY_CLEANUP[t.country] ?? (t.country === 'Admin' ? null : t.country);
    const isDraft = DRAFT_IDS.has(t.oldId) || !subjectName || !countryName || !t.itinerary.length;

    const hero = t.images.length ? await rehostImage(t.images[0], slug) : null;

    const { data: trip, error } = await db
      .from('trips')
      .insert({
        slug,
        title: t.title,
        subject_id: subjectName ? subjectId.get(subjectName) ?? null : null,
        country_id: countryName ? countryId.get(countryName) ?? null : null,
        city: t.city || null,
        duration_days: t.days ?? Math.max(1, (t.nights ?? 0) + 1),
        duration_nights: t.nights ?? Math.max(0, (t.days ?? 1) - 1),
        departs: 'Dubai',
        hero_image: hero,
        overview: t.overview,
        includes: t.includes,
        status: isDraft ? 'draft' : 'published',
        featured: false,
      })
      .select('id')
      .single();
    if (error) { console.error(`  ✗ ${t.title}: ${error.message}`); continue; }

    if (t.itinerary.length) {
      const { error: dayErr } = await db.from('itinerary_days').insert(
        t.itinerary.map((d: any, i: number) => ({
          trip_id: trip.id,
          sort_order: i + 1,
          label: d.label,
          title: d.title || '',
          description: d.description,
        }))
      );
      if (dayErr) console.error(`  ✗ itinerary ${t.title}: ${dayErr.message}`);
    }

    existingSlugs.add(slug);
    existingTitles.add(normTitle(t.title));
    imported++;
    if (isDraft) drafts++;
    console.log(`  ✓ #${t.oldId} ${t.title} (${t.itinerary.length} days${isDraft ? ', DRAFT' : ''})`);
  }

  const { count } = await db.from('trips').select('*', { count: 'exact', head: true });
  console.log(`\nDone. Imported ${imported} (${drafts} drafts for review), skipped ${skippedDup} duplicates, ${skippedJunk} junk. ${count} trips now in database.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
