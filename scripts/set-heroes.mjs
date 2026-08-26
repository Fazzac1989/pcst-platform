/**
 * Point country and trip hero images at better photographs.
 *
 *   node scripts/set-heroes.mjs           → dry run
 *   node scripts/set-heroes.mjs --apply
 *
 * Every replacement is a photograph the business already owns; nothing new is
 * licensed here. Each is checked against the watermark audit and for a live
 * file before it is written.
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

const audit = JSON.parse(readFileSync('scripts/data/watermark-audit.json', 'utf8').replace(/^﻿/, ''));
const flagged = new Map();
for (const f of audit.findings ?? []) for (const i of f.images ?? []) flagged.set(i.url, f.issue);

const CHANGES = [
  {
    table: 'countries',
    slug: 'usa',
    url: `${B}legacy/geography-trip-to-east-coast-usa/gallery-7.jpg`,
    alt: 'The Manhattan skyline at sunset, the Empire State Building at its centre',
    why: 'was Central Park treetops — asked for something more spectacular',
  },
  {
    table: 'countries',
    slug: 'new-zealand',
    url: `${B}legacy/adventure-trip-to-new-zealand/gallery-3.jpg`,
    alt: 'A snow-capped New Zealand mountain range above flowering hillsides',
    why: 'was an aerial of a beach town — asked for a mountain range',
  },
  {
    table: 'countries',
    slug: 'indonesia',
    url: `${B}shutterstock/trips/63/g0-1832872639.jpg`,
    alt: 'Turquoise water and distant hills on the Indonesian coast',
    why: 'was a close-up of macaques — asked for something more of the destination',
  },
  {
    table: 'trips',
    slug: 'florida-business-studies-trip',
    url: `${B}shutterstock/trips/45/g3-772416994.jpg`,
    alt: 'The Florida waterfront skyline at dusk',
    why: 'the hero was a photograph of a Himalayan mountain range',
  },
];

let done = 0;
const problems = [];

for (const c of CHANGES) {
  const bad = flagged.get(c.url);
  if (bad) {
    problems.push(`${c.slug}: REFUSED — ${bad}`);
    continue;
  }
  const head = await fetch(c.url, { method: 'HEAD' });
  if (!head.ok) {
    problems.push(`${c.slug}: image returns ${head.status}`);
    continue;
  }

  const { data: row } = await db.from(c.table).select('id, slug, hero_image').eq('slug', c.slug).maybeSingle();
  if (!row) {
    problems.push(`${c.slug}: no row in ${c.table}`);
    continue;
  }

  console.log(`  ${c.table}/${c.slug} — ${c.why}`);
  console.log(`      was ${(row.hero_image ?? '(none)').replace(B, '')}`);
  console.log(`      now ${c.url.replace(B, '')}`);

  if (APPLY) {
    const { error } = await db
      .from(c.table)
      .update({ hero_image: c.url, hero_alt: c.alt })
      .eq('id', row.id);
    if (error) problems.push(`${c.slug}: ${error.message}`);
    else done++;
  } else {
    done++;
  }
}

console.log(`\n${done} hero${done === 1 ? '' : 'es'} ${APPLY ? 'set' : 'would be set'}`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log(`  ${p}`);
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
