/**
 * Idempotent seed: loads reference/trips-seed.json into Supabase via the
 * service-role key. Safe to re-run — upserts subjects, countries and trips
 * by their unique keys and replaces per-trip itinerary days.
 *
 * Usage: npm run seed
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

type SeedTrip = {
  slug: string;
  title: string;
  subject: string;
  country: string;
  city: string;
  duration: string; // "5 days / 4 nights"
  departs: string;
  hero_image: string;
  status: string;
  overview: string[];
  itinerary: { label: string; title: string; description: string }[];
  includes: string[];
};

const FEATURED = new Set(['jordan', 'iceland', 'london', 'berlin', 'paris', 'athens']);

const REGIONS: Record<string, string> = {
  Greece: 'Europe',
  Germany: 'Europe',
  Iceland: 'Europe',
  Japan: 'Asia',
  Jordan: 'Middle East',
  'United Kingdom': 'Europe',
  France: 'Europe',
  'Czech Republic': 'Europe',
  Singapore: 'Asia',
  USA: 'Americas',
};

// The 7 standard terms from the reference trip page's terms accordion.
const BOOKING_TERMS = [
  'Upon confirmation of the booking, a 25% deposit is non-refundable.',
  'Passport copies of all passengers are required within 10 days of confirming the booking.',
  'Cancellation 90–61 days before departure: 50% of the total cost is charged.',
  'Cancellation 60–31 days before departure: 75% of the total cost is charged.',
  'Cancellation 30–1 day before departure: no refund is given.',
  'Visa refusal or no appointment available: 25% non-refundable from the date of confirmation; 90–61 days 50%, 60–31 days 75%, 30–1 day 100% non-refundable.',
  'If passenger numbers are reduced, rates are subject to revision.',
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const parseDuration = (d: string): { days: number; nights: number } => {
  const m = d.match(/(\d+)\s*days?\s*\/\s*(\d+)\s*nights?/i);
  if (!m) throw new Error(`Unparseable duration: "${d}"`);
  return { days: Number(m[1]), nights: Number(m[2]) };
};

async function main() {
  const raw = readFileSync(join(process.cwd(), 'reference', 'trips-seed.json'), 'utf8');
  const trips: SeedTrip[] = JSON.parse(raw).trips;
  console.log(`Seeding ${trips.length} trips…`);

  // 1. Subjects + countries derived from trip data
  const subjects = [...new Set(trips.map((t) => t.subject))].map((name) => ({
    name,
    slug: slugify(name),
  }));
  const countries = [...new Set(trips.map((t) => t.country))].map((name) => ({
    name,
    slug: slugify(name),
    region: REGIONS[name] ?? null,
  }));

  {
    const { error } = await db.from('subjects').upsert(subjects, { onConflict: 'name' });
    if (error) throw new Error(`subjects: ${error.message}`);
  }
  {
    const { error } = await db.from('countries').upsert(countries, { onConflict: 'name' });
    if (error) throw new Error(`countries: ${error.message}`);
  }

  const { data: subjectRows, error: sErr } = await db.from('subjects').select('id,name');
  if (sErr) throw new Error(sErr.message);
  const { data: countryRows, error: cErr } = await db.from('countries').select('id,name');
  if (cErr) throw new Error(cErr.message);
  const subjectId = new Map(subjectRows!.map((r) => [r.name, r.id]));
  const countryId = new Map(countryRows!.map((r) => [r.name, r.id]));

  // 2. Trips
  for (const t of trips) {
    const { days, nights } = parseDuration(t.duration);
    const row = {
      slug: t.slug,
      title: t.title,
      subject_id: subjectId.get(t.subject),
      country_id: countryId.get(t.country),
      city: t.city,
      duration_days: days,
      duration_nights: nights,
      departs: t.departs,
      hero_image: t.hero_image,
      overview: t.overview,
      includes: t.includes,
      status: t.status,
      featured: FEATURED.has(t.slug),
    };
    const { data: tripRow, error } = await db
      .from('trips')
      .upsert(row, { onConflict: 'slug' })
      .select('id')
      .single();
    if (error) throw new Error(`trip ${t.slug}: ${error.message}`);

    // Replace itinerary — handles reordering/removals on re-runs.
    const { error: delErr } = await db.from('itinerary_days').delete().eq('trip_id', tripRow!.id);
    if (delErr) throw new Error(`itinerary clear ${t.slug}: ${delErr.message}`);
    const dayRows = t.itinerary.map((d, i) => ({
      trip_id: tripRow!.id,
      sort_order: i + 1,
      label: d.label,
      title: d.title,
      description: d.description,
    }));
    const { error: dayErr } = await db.from('itinerary_days').insert(dayRows);
    if (dayErr) throw new Error(`itinerary ${t.slug}: ${dayErr.message}`);
    console.log(`  ✓ ${t.slug} (${dayRows.length} days${row.featured ? ', featured' : ''})`);
  }

  // 3. Booking terms
  const { error: termErr } = await db.from('booking_terms').upsert(
    BOOKING_TERMS.map((text, i) => ({ sort_order: i + 1, text })),
    { onConflict: 'sort_order' }
  );
  if (termErr) throw new Error(`booking_terms: ${termErr.message}`);

  const { count } = await db.from('trips').select('*', { count: 'exact', head: true });
  console.log(`Done. ${count} trips in database, ${BOOKING_TERMS.length} booking terms.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
