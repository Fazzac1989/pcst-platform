/**
 * Give each itinerary day a photograph.
 *
 *   node scripts/assign-day-images.mjs                 → dry run
 *   node scripts/assign-day-images.mjs --apply
 *   node scripts/assign-day-images.mjs --apply --only=jordan
 *
 * Reads scripts/data/day-image-plan.json, which maps a trip to a day-by-day
 * choice from that trip's own gallery:
 *
 *   { "jordan": { "1": 3, "2": 1, "3": 7 } }      day number → gallery position
 *
 * A day may instead name a URL directly, for the handful of days where the
 * trip's own photographs run out and a new one was licensed:
 *
 *   { "mongolia-life-on-the-steppe": { "5": "https://…" } }
 *
 * Only days that have no image are written, so re-running never overwrites a
 * choice already made in the admin.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? null;
const FORCE = process.argv.includes('--force');

const plan = JSON.parse(readFileSync('scripts/data/day-image-plan.json', 'utf8').replace(/^﻿/, ''));

let written = 0;
let skipped = 0;
const problems = [];

for (const [slug, dayMap] of Object.entries(plan)) {
  if (ONLY && slug !== ONLY) continue;

  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, gallery')
    .eq('slug', slug)
    .maybeSingle();
  if (!trip) {
    problems.push(`${slug}: trip not found`);
    continue;
  }

  const gallery = (Array.isArray(trip.gallery) ? trip.gallery : [])
    .map((g) => (typeof g === 'string' ? g : g?.url))
    .filter(Boolean);

  const { data: days } = await db
    .from('itinerary_days')
    .select('id, sort_order, title, display_title, image_url, description')
    .eq('trip_id', trip.id)
    .order('sort_order');

  const usable = (days ?? []).filter((d) => d.description?.trim());

  for (const [dayNumber, choice] of Object.entries(dayMap)) {
    const day = usable[Number(dayNumber) - 1];
    if (!day) {
      problems.push(`${slug} day ${dayNumber}: no such day`);
      continue;
    }
    if (day.image_url && !FORCE) {
      skipped++;
      continue;
    }

    const url = typeof choice === 'number' ? gallery[choice - 1] : String(choice);
    if (!url) {
      problems.push(`${slug} day ${dayNumber}: gallery has no image ${choice}`);
      continue;
    }

    const label = day.display_title || day.title || `Day ${dayNumber}`;
    console.log(`  ${slug} day ${dayNumber} → ${typeof choice === 'number' ? `gallery ${choice}` : 'licensed image'}  (${label})`);

    if (APPLY) {
      const { error } = await db
        .from('itinerary_days')
        .update({ image_url: url, image_alt: `${label} — ${trip.title}` })
        .eq('id', day.id);
      if (error) problems.push(`${slug} day ${dayNumber}: ${error.message}`);
      else written++;
    } else {
      written++;
    }
  }
}

console.log(`\n${written} day${written === 1 ? '' : 's'} ${APPLY ? 'written' : 'would be written'}, ${skipped} already had an image`);
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
