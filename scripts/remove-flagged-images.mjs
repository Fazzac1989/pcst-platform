/**
 * Remove specific gallery images flagged by the watermark audit.
 *
 *   node scripts/remove-flagged-images.mjs                    → dry run
 *   node scripts/remove-flagged-images.mjs --apply
 *   node scripts/remove-flagged-images.mjs --apply --group="Stock or photographer watermark"
 *
 * Reads scripts/data/watermark-audit.json and drops the named entries from
 * trips.gallery. Heroes are never touched here — a trip with no hero looks
 * broken, so those are re-pointed by hand instead.
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
const GROUPS = process.argv
  .filter((a) => a.startsWith('--group='))
  .map((a) => a.slice('--group='.length));

const DEFAULT_GROUPS = ['Broken — image will not load', 'Unsuitable — wrong subject or unusable quality'];
const wanted = GROUPS.length ? GROUPS : DEFAULT_GROUPS;

const audit = JSON.parse(readFileSync('scripts/data/watermark-audit.json', 'utf8'));
const findings = audit.findings.filter((f) => wanted.includes(f.issue));

console.log(`groups: ${wanted.join(' | ')}`);
console.log(`${findings.length} trip(s) affected\n`);

// Collect the URLs to drop per trip; matching on URL rather than index means a
// concurrent edit cannot make this remove the wrong picture.
const dropByTrip = new Map();
for (const f of findings) {
  for (const img of f.images) {
    if (img.role === 'hero') {
      console.log(`  skipping ${f.slug} hero — replace by hand`);
      continue;
    }
    if (!dropByTrip.has(f.slug)) dropByTrip.set(f.slug, new Set());
    dropByTrip.get(f.slug).add(img.url);
  }
}

for (const [slug, urls] of dropByTrip) {
  const { data: trip, error } = await db
    .from('trips')
    .select('id, gallery')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !trip) {
    console.log(`  ${slug} — could not read (${error?.message ?? 'not found'})`);
    continue;
  }
  const before = Array.isArray(trip.gallery) ? trip.gallery : [];
  const after = before.filter((g) => !urls.has(typeof g === 'string' ? g : g?.url));
  const removed = before.length - after.length;
  console.log(`  ${slug.padEnd(46)} ${before.length} → ${after.length} (${removed} removed)`);

  if (APPLY && removed > 0) {
    const { error: wErr } = await db.from('trips').update({ gallery: after }).eq('id', trip.id);
    if (wErr) console.log(`    write failed: ${wErr.message}`);
  }
}

if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
else console.log('\nDone. Revalidate the affected trip pages.');
