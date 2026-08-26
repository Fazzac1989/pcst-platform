/**
 * Drop photographs that show the wrong country.
 *
 *   node scripts/remove-wrong-country-images.mjs           → dry run
 *   node scripts/remove-wrong-country-images.mjs --apply
 *
 * Each entry was confirmed by eye before being listed here. Galleries hold
 * either plain URL strings (the older curated sets) or {url, alt} objects
 * (everything migrated from the old site), so both shapes are handled.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const APPLY = process.argv.includes('--apply');

/** slug → 1-based gallery positions, with what the picture actually shows. */
const WRONG = [
  { slug: 'bali-educational-adventure', position: 4, shows: 'Marrakech, Morocco', shouldBe: 'Indonesia' },
  { slug: 'the-uae-story-heritage-innovation-adventure', position: 3, shows: 'Stockholm, Sweden', shouldBe: 'United Arab Emirates' },
  { slug: 'hue-hoi-an-heritage-tour', position: 8, shows: 'Angkor Thom, Cambodia', shouldBe: 'Vietnam' },
];

/**
 * Checked and cleared, so they are not looked at again:
 *   the-uae-story-heritage-innovation-adventure-2 #3 — Dubai Marina at night,
 *     a different file from the near-identical trip above, and correct.
 *   language-trip-to-paris #7 — Porte Cailhau, Bordeaux. Wrong city but the
 *     right country, so out of scope here.
 */

const urlOf = (entry) => (typeof entry === 'string' ? entry : entry?.url ?? null);

let removed = 0;
const problems = [];

for (const target of WRONG) {
  const { data: trip, error } = await db
    .from('trips')
    .select('id, slug, gallery')
    .eq('slug', target.slug)
    .maybeSingle();
  if (error || !trip) {
    problems.push(`${target.slug}: not found`);
    continue;
  }

  const gallery = Array.isArray(trip.gallery) ? trip.gallery : [];
  const entry = gallery[target.position - 1];
  const url = urlOf(entry);
  if (!url) {
    problems.push(`${target.slug}: no image at position ${target.position}`);
    continue;
  }

  // Never pull an image a day is relying on.
  const { data: usedBy } = await db
    .from('itinerary_days')
    .select('id')
    .eq('image_url', url)
    .limit(1);
  if (usedBy?.length) {
    problems.push(`${target.slug} #${target.position}: in use as a day thumbnail — left alone`);
    continue;
  }

  const after = gallery.filter((_, i) => i !== target.position - 1);
  console.log(
    `  ${target.slug} #${target.position} — shows ${target.shows}, trip is ${target.shouldBe}` +
      `  (${gallery.length} → ${after.length})`
  );
  console.log(`      ${url.replace(/.*\/trip-images\//, '')}`);

  if (APPLY) {
    const { error: wErr } = await db.from('trips').update({ gallery: after }).eq('id', trip.id);
    if (wErr) problems.push(`${target.slug}: ${wErr.message}`);
    else removed++;
  } else {
    removed++;
  }
}

console.log(`\n${removed} image${removed === 1 ? '' : 's'} ${APPLY ? 'removed' : 'would be removed'}`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log(`  ${p}`);
}
if (!APPLY) console.log('\nDry run. Re-run with --apply to write.');
