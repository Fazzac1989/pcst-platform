/**
 * Put the chosen photographs onto the itinerary days.
 *
 *   node scripts/apply-day-pool-plan.mjs           → dry run, prints each pairing
 *   node scripts/apply-day-pool-plan.mjs --apply
 *
 * Reads the pools written by build-day-pools.mjs and the hand-made plan in
 * scripts/data/day-pool-plan.json, which maps a trip's day number to a
 * 1-based index into that trip's pool. An "_own_hero" entry instead names a
 * day that should take the trip's own hero image, for the rare case where the
 * one photograph that depicts the day is already the trip's hero.
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
const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
const pools = read('scripts/data/day-pools.json');
const plan = read('scripts/data/day-pool-plan.json');
const poolFor = new Map(pools.map((p) => [p.trip, p]));

/**
 * A hard stop rather than a warning. Several of the legacy galleries hold
 * watermarked stock and third-party posters, and the pools happily offer them
 * up; putting one on an itinerary day would publish someone else's watermark.
 */
const audit = read('scripts/data/watermark-audit.json');
const flagged = new Map();
for (const f of audit.findings ?? []) {
  for (const img of f.images ?? []) flagged.set(img.url, f.issue);
}

const { data: trips } = await db.from('trips').select('id, slug, title, hero_image, hero_alt');
const { data: allDays } = await db
  .from('itinerary_days')
  .select('id, trip_id, sort_order, title, display_title, image_url, description')
  .order('sort_order');
const daysByTrip = new Map();
for (const d of allDays ?? []) {
  if (!daysByTrip.has(d.trip_id)) daysByTrip.set(d.trip_id, []);
  daysByTrip.get(d.trip_id).push(d);
}

let done = 0;
const problems = [];

for (const [slug, days] of Object.entries(plan)) {
  if (slug.startsWith('_')) continue;
  const trip = trips.find((t) => t.slug === slug);
  const pool = poolFor.get(slug);
  if (!trip || !pool) {
    problems.push(`${slug}: no trip or pool`);
    continue;
  }
  const rows = (daysByTrip.get(trip.id) ?? []).filter((d) => d.description?.trim());

  for (const [dayStr, pick] of Object.entries(days)) {
    const n = Number(dayStr);
    const row = rows[n - 1];
    if (!row) {
      problems.push(`${slug} day ${n}: no such day`);
      continue;
    }
    if (row.image_url) {
      problems.push(`${slug} day ${n}: already has an image — skipped`);
      continue;
    }

    const chosen =
      pick === '_own_hero'
        ? trip.hero_image && { url: trip.hero_image, alt: trip.hero_alt ?? '', from: 'own-hero' }
        : pool.pool[pick - 1];
    if (!chosen?.url) {
      problems.push(`${slug} day ${n}: pool has no entry ${pick}`);
      continue;
    }
    const bad = flagged.get(chosen.url);
    if (bad) {
      problems.push(`${slug} day ${n}: REFUSED — ${bad}`);
      continue;
    }

    const label = row.display_title || row.title || `Day ${n}`;
    const alt = chosen.alt || `${label} — ${pool.title}`;
    console.log(`  ${slug} day ${n} — ${label}`);
    console.log(`      [${chosen.from}] ${chosen.url.replace(/.*\/trip-images\//, '')}`);

    if (APPLY) {
      const { error } = await db
        .from('itinerary_days')
        .update({ image_url: chosen.url, image_alt: alt })
        .eq('id', row.id);
      if (error) problems.push(`${slug} day ${n}: ${error.message}`);
      else done++;
    } else {
      done++;
    }
  }
}

console.log(`\n${done} day image${done === 1 ? '' : 's'} ${APPLY ? 'set' : 'would be set'}`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log(`  ${p}`);
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
