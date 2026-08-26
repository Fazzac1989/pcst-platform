/**
 * Replace day photographs that do not show what happens on the day.
 *
 *   node scripts/repoint-day-images.mjs           → dry run
 *   node scripts/repoint-day-images.mjs --apply
 *
 * Unlike apply-day-pool-plan.mjs this overwrites days that already have an
 * image, so each entry names both the day and the photograph by URL rather
 * than by a pool index that could drift.
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
const B = 'https://jdqvbzjzbyfrgnsluaon.supabase.co/storage/v1/object/public/trip-images/';

/**
 * Studio London's days carried generic London stock — three aerial skylines
 * and two posed group shots — none of which showed the day's actual subject.
 * These are the trip's own photographs plus museum and set interiors from the
 * other London trips. Day 7 already showed the city from above, which is
 * exactly what the Sky Garden day is, so it is left alone.
 */
const REPOINT = [
  {
    trip: 'studio-london',
    days: {
      1: { url: `${B}shutterstock/trips/56/g0-1449954317.jpg`, alt: 'The Thames and the London Eye on the illuminated river walk' },
      2: { url: `${B}shutterstock/trips/56/g2-1394225840.jpg`, alt: 'Studying paintings in a London gallery' },
      3: { url: `${B}shutterstock/trips/56/g3-362072849.jpg`, alt: 'A London street on the way to Shoreditch' },
      4: { url: `${B}legacy/london-film-and-drama-trip/gallery-8.jpg`, alt: 'Museum galleries of the kind explored at the V&A' },
      5: { url: `${B}legacy/london-film-and-drama-trip/hero.jpg`, alt: 'A built set at the Warner Bros. Studio Tour' },
      6: { url: `${B}legacy/london-film-and-drama-trip/gallery-5.jpg`, alt: 'Objects on display in a London museum collection' },
    },
  },
];

let done = 0;
const problems = [];

for (const entry of REPOINT) {
  const { data: trip } = await db.from('trips').select('id, slug, title').eq('slug', entry.trip).single();
  if (!trip) {
    problems.push(`${entry.trip}: not found`);
    continue;
  }
  const { data: rows } = await db
    .from('itinerary_days')
    .select('id, sort_order, display_title, title, image_url, description')
    .eq('trip_id', trip.id)
    .order('sort_order');
  const days = (rows ?? []).filter((d) => d.description?.trim());

  for (const [dayStr, pick] of Object.entries(entry.days)) {
    const n = Number(dayStr);
    const row = days[n - 1];
    if (!row) {
      problems.push(`${entry.trip} day ${n}: no such day`);
      continue;
    }
    // Refuse to point at something that is not there.
    const head = await fetch(pick.url, { method: 'HEAD' });
    if (!head.ok) {
      problems.push(`${entry.trip} day ${n}: image returns ${head.status}`);
      continue;
    }
    console.log(`  ${entry.trip} day ${n} — ${row.display_title || row.title}`);
    console.log(`      was ${(row.image_url ?? '(none)').replace(B, '')}`);
    console.log(`      now ${pick.url.replace(B, '')}`);

    if (APPLY) {
      const { error } = await db
        .from('itinerary_days')
        .update({ image_url: pick.url, image_alt: pick.alt })
        .eq('id', row.id);
      if (error) problems.push(`${entry.trip} day ${n}: ${error.message}`);
      else done++;
    } else {
      done++;
    }
  }
}

console.log(`\n${done} day image${done === 1 ? '' : 's'} ${APPLY ? 'repointed' : 'would be repointed'}`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log(`  ${p}`);
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
