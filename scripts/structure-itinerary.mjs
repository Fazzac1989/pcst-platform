/**
 * Build the structured presentation layer for one or more trips.
 *
 *   npx tsx scripts/structure-itinerary.mjs japan-design-and-technology
 *   npx tsx scripts/structure-itinerary.mjs --all
 *   npx tsx scripts/structure-itinerary.mjs --all --force
 *
 * Non-destructive: it only writes the new columns. itinerary_days.description,
 * title, images, pricing, inclusions and slugs are never touched.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { extractDay, extractTripHighlights, EXTRACT_MODEL } from '../lib/itinerary/extract.ts';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const force = args.includes('--force');
let slugs = args.filter((a) => !a.startsWith('--'));

if (args.includes('--all')) {
  const { data } = await db.from('trips').select('slug').eq('status', 'published').order('title');
  slugs = (data ?? []).map((t) => t.slug);
}
if (!slugs.length) throw new Error('Pass trip slugs, or --all');

console.log(`${slugs.length} trip(s) to process\n`);

for (const slug of slugs) {
  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, subjects(name), countries(name), itinerary_days(id, sort_order, label, title, description, structured_at)')
    .eq('slug', slug)
    .maybeSingle();
  if (!trip) { console.log(`!! ${slug} — not found`); continue; }

  const days = (trip.itinerary_days ?? []).sort((a, b) => a.sort_order - b.sort_order);
  if (!days.length) { console.log(`-- ${slug} — no itinerary days`); continue; }
  if (!force && days.every((d) => d.structured_at)) {
    console.log(`== ${slug} — already structured (use --force to redo)`);
    continue;
  }

  console.log(`${'='.repeat(66)}\n${trip.title}  (${days.length} days)`);
  const done = [];

  for (const d of days) {
    if (!force && d.structured_at) { console.log(`   day ${d.sort_order}: already done`); continue; }
    if (!d.description?.trim()) { console.log(`   day ${d.sort_order}: no description, skipped`); continue; }
    try {
      const s = await extractDay({
        dayNumber: d.sort_order, totalDays: days.length, label: d.label,
        title: d.title, description: d.description,
        tripTitle: trip.title, subject: trip.subjects?.name ?? null, country: trip.countries?.name ?? null,
      });

      const { error } = await db
        .from('itinerary_days')
        .update({
          display_title: s.displayTitle,
          summary: s.summary,
          primary_location: s.primaryLocation,
          highlights: s.highlights.map((h) => ({
            name: h.name, summary: h.summary, type: h.type, location: h.location,
            conditional: h.conditional, conditional_text: h.conditionalText,
          })),
          learning_focus: s.learningFocus,
          experience_types: s.experienceTypes,
          locations: s.locations,
          meals: s.meals,
          transport: s.transport,
          notices: s.notices,
          review_flags: s.reviewFlags,
          structured_at: new Date().toISOString(),
          structured_model: EXTRACT_MODEL,
        })
        .eq('id', d.id);
      if (error) throw new Error(error.message);

      done.push({ dayNumber: d.sort_order, title: s.displayTitle, summary: s.summary, highlights: s.highlights.map((h) => h.name) });
      const flags = s.reviewFlags.length ? `  (${s.reviewFlags.length} flag${s.reviewFlags.length > 1 ? 's' : ''})` : '';
      console.log(`   day ${String(d.sort_order).padStart(2)}: ${s.displayTitle.padEnd(34)} ${s.highlights.length} highlights${flags}`);
    } catch (e) {
      console.log(`   day ${d.sort_order}: FAILED — ${e.message}`);
    }
  }

  if (done.length) {
    try {
      const highlights = await extractTripHighlights(trip.title, done);
      const journey = [];
      for (const d of days) {
        const { data: row } = await db.from('itinerary_days').select('primary_location').eq('id', d.id).maybeSingle();
        const place = row?.primary_location?.trim();
        if (!place) continue;
        const last = journey[journey.length - 1];
        if (last && last.location.toLowerCase() === place.toLowerCase()) last.to_day = d.sort_order;
        else journey.push({ location: place, from_day: d.sort_order, to_day: d.sort_order });
      }
      await db.from('trips').update({
        trip_highlights: highlights, journey, structured_at: new Date().toISOString(),
      }).eq('id', trip.id);
      console.log(`   trip: ${journey.map((j) => j.location).join(' -> ')}`);
      console.log(`   highlights: ${highlights.join(' · ')}`);
    } catch (e) {
      console.log(`   trip rollup FAILED — ${e.message}`);
    }
  }
}
