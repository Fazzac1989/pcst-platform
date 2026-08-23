/**
 * Put the original premiumchoiceschooltrips.com photography back on the
 * migrated catalogue.
 *
 *   node scripts/migrate-legacy-images.mjs              → dry run, prints the plan
 *   node scripts/migrate-legacy-images.mjs --apply      → uploads and writes
 *   node scripts/migrate-legacy-images.mjs --apply --only=barcelona-art-trip
 *
 * Reads scripts/data/legacy-images.json (see scrape-legacy-images.mjs), matches
 * each legacy trip to a trip in the database, then copies its images into the
 * trip-images bucket and writes trips.hero_image / hero_alt / gallery.
 *
 * Titles were rewritten during the migration ("Barcelona Art Trip" became
 * "Barcelona Uncovered!…"), so matching is by country first and title
 * similarity second, with the subject as a tie-breaker. Every match is printed
 * with its score: a dry run is meant to be read before --apply is used.
 *
 * Quality rules, because the old CMS downscaled everything it stored:
 *   · the hero is whichever image is largest — banner or gallery
 *   · gallery images below MIN_GALLERY_WIDTH are left behind, and reported
 *   · a trip whose best image cannot clear MIN_HERO_WIDTH is reported and skipped
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL = process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error('Set PCST_SUPABASE_URL and PCST_SUPABASE_SERVICE_ROLE_KEY in .env.local');

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? null;
/** Leave every hero exactly as it is and only rebuild galleries. */
const GALLERY_ONLY = process.argv.includes('--gallery-only');
const BUCKET = 'trip-images';
const MIN_HERO_WIDTH = 1400;

/**
 * The gallery floor is deliberately low. These are the photographs the
 * business chose for each trip, and the mosaic renders a tile at roughly a
 * third of the page — about 480px — so a 500px original is honest at that
 * size. Holding out for 1000px threw away more than half the gallery, which
 * is the wrong trade: a complete set of the operator's own pictures beats a
 * sparse one of stock. Only true thumbnails are left behind.
 */
const MIN_GALLERY_WIDTH = 500;
const MAX_GALLERY = 20;

const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Words that say nothing about which trip this is. */
const STOP = new Set([
  'trip', 'trips', 'tour', 'tours', 'to', 'the', 'a', 'of', 'and', 'in', 'school',
  'experience', 'adventure', 'study', 'visit', 'educational',
]);

const tokens = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));

function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/** The legacy CMS wrote countries loosely: "Hongkong", "Saudi  Arabia". */
const COUNTRY_ALIASES = {
  hongkong: 'hong kong',
  'saudi arabia': 'saudi arabia',
  'london france belgium': 'london france and belgium',
  usa: 'usa',
  holland: 'netherlands',
};
const countryKey = (s) => {
  const n = norm(s).replace(/^the /, '');
  return COUNTRY_ALIASES[n] ?? n;
};

/* ------------------------------------------------------------------ */

const { trips: legacy } = JSON.parse(readFileSync('scripts/data/legacy-images.json', 'utf8'));

const { data: dbTrips, error } = await db
  .from('trips')
  .select('id, slug, title, status, city, hero_image, gallery, countries(name), subjects(name)')
  .order('id');
if (error) throw new Error(error.message);

/* --- match ------------------------------------------------------- */

// The migration rewrote trip titles but kept the slug it had generated from
// the ORIGINAL title, so the slug is the strongest link back to the old site:
// "Japan, Where Tradition Meets Tomorrow" still lives at
// /trips/japan-art-design-technology. Title similarity is the fallback.
const slugify = (s) =>
  norm(s).replace(/\s+/g, '-');

const taken = new Set();
const matches = [];
const unmatched = [];

const pairs = [];
for (const l of legacy) {
  const legacySlug = slugify(l.title);
  for (const t of dbTrips) {
    const sameCountry = countryKey(l.country) === countryKey(t.countries?.name ?? '');
    const byTitle = similarity(l.title, t.title);
    // Compare the legacy title against the database slug as well as the title.
    const bySlug = Math.max(
      similarity(legacySlug.replace(/-/g, ' '), (t.slug ?? '').replace(/-/g, ' ')),
      legacySlug === t.slug ? 1 : 0
    );
    const best = Math.max(byTitle, bySlug);
    const subject = norm(l.subject) && norm(l.subject) === norm(t.subjects?.name ?? '') ? 0.12 : 0;
    if (!sameCountry && best < 0.55) continue;
    pairs.push({
      l, t,
      score: (sameCountry ? 0.3 : 0) + best * 0.7 + subject,
      byTitle, bySlug, sameCountry,
      how: bySlug >= byTitle ? 'slug' : 'title',
    });
  }
}
pairs.sort((a, b) => b.score - a.score);

const claimedLegacy = new Set();
for (const p of pairs) {
  if (claimedLegacy.has(p.l.legacyId) || taken.has(p.t.id)) continue;
  if (p.score < 0.45) continue;
  claimedLegacy.add(p.l.legacyId);
  taken.add(p.t.id);
  matches.push(p);
}

// Last resort: a legacy trip whose country has exactly one unclaimed trip
// left is that trip — "Umrah" and "The Sacred Journeys of Makkah & Madinah"
// share nothing but the country.
for (const l of legacy) {
  if (claimedLegacy.has(l.legacyId)) continue;
  const candidates = dbTrips.filter(
    (t) => !taken.has(t.id) && countryKey(l.country) === countryKey(t.countries?.name ?? '')
  );
  if (candidates.length === 1) {
    claimedLegacy.add(l.legacyId);
    taken.add(candidates[0].id);
    matches.push({ l, t: candidates[0], score: 0.5, how: 'country (only one left)', sameCountry: true });
  }
}

for (const l of legacy) if (!claimedLegacy.has(l.legacyId)) unmatched.push(l);

/* --- plan -------------------------------------------------------- */

const plan = [];
const problems = [];

for (const m of matches.sort((a, b) => a.t.title.localeCompare(b.t.title))) {
  const all = [m.l.hero, ...m.l.gallery].filter((i) => i && i.ok !== false && i.width);
  if (all.length === 0) {
    problems.push({ trip: m.t.title, slug: m.t.slug, legacy: m.l.title, issue: 'no readable images on the legacy page' });
    continue;
  }

  // Hero and gallery are decided separately: a trip whose banner is too small
  // can still have a usable gallery, and vice versa. Whatever the legacy site
  // cannot supply at a decent size is left as it is rather than replaced with
  // something worse — the point is better pictures, not older ones.
  const byWidth = [...all].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const best = byWidth[0];
  const heroCandidate = (best.width ?? 0) >= MIN_HERO_WIDTH ? best : null;
  const hero = GALLERY_ONLY ? null : heroCandidate;
  if (!GALLERY_ONLY && !hero) {
    problems.push({
      trip: m.t.title, slug: m.t.slug, legacy: m.l.title, part: 'hero',
      issue: `best legacy image is only ${best.width}×${best.height} — under the ${MIN_HERO_WIDTH}px hero floor, so the current hero is kept`,
    });
  }

  // Keep the legacy running order for the gallery; it is an edit, not a pile.
  // Whatever became the hero is skipped here so it does not appear twice,
  // whether or not this run is touching heroes.
  const gallery = m.l.gallery
    .filter((g) => g.ok !== false && (g.width ?? 0) >= MIN_GALLERY_WIDTH && g.url !== heroCandidate?.url)
    .slice(0, MAX_GALLERY);
  const dropped = m.l.gallery.filter((g) => (g.width ?? 0) < MIN_GALLERY_WIDTH || g.ok === false).length;

  // Enough of the original set to stand on its own — use it. Otherwise add
  // what there is to what the trip already has, rather than trading a full
  // gallery for a thin one.
  const current = Array.isArray(m.t.gallery)
    ? m.t.gallery.map((g) => (typeof g === 'string' ? g : g?.url)).filter(Boolean)
    : [];
  const mode = gallery.length >= 3 ? 'replace' : gallery.length > 0 ? 'append' : 'keep';
  if (mode === 'keep' && m.l.gallery.length > 0) {
    problems.push({
      trip: m.t.title, slug: m.t.slug, legacy: m.l.title, part: 'gallery',
      issue: `none of the ${m.l.gallery.length} legacy gallery images clear ${MIN_GALLERY_WIDTH}px, so the current gallery is kept`,
    });
  }

  if (hero || mode !== 'keep') plan.push({ match: m, hero, gallery, mode, current, dropped });
}

/* --- report ------------------------------------------------------ */

console.log(`legacy trips: ${legacy.length}   database trips: ${dbTrips.length}`);
console.log(`matched: ${matches.length}   unmatched legacy: ${unmatched.length}\n`);

console.log('PLAN');
for (const p of plan) {
  if (ONLY && p.match.t.slug !== ONLY) continue;
  console.log(
    `  ${p.match.t.slug.padEnd(46)} ← ${p.match.l.title.slice(0, 34).padEnd(34)} ` +
      `hero ${p.hero ? `${p.hero.width}×${p.hero.height}` : 'kept'}  ` +
      `gallery ${p.mode === 'keep' ? 'kept' : `${p.mode} ${p.gallery.length}`}` +
      (p.dropped ? `  (${p.dropped} too small)` : '') +
      `  [${p.match.how} ${p.match.score.toFixed(2)}]`
  );
}

if (unmatched.length) {
  console.log('\nLEGACY TRIPS WITH NO MATCH IN THE DATABASE (left alone)');
  for (const l of unmatched) console.log(`  ${l.title}  [${l.country} | ${l.subject}]`);
}

const untouched = dbTrips.filter((t) => !taken.has(t.id));
if (untouched.length) {
  console.log('\nDATABASE TRIPS WITH NO LEGACY COUNTERPART (keeping current images)');
  for (const t of untouched) console.log(`  ${t.title}  [${t.countries?.name ?? '—'}]`);
}

if (problems.length) {
  console.log('\nNEEDS BETTER PHOTOGRAPHY');
  for (const p of problems) console.log(`  ${p.slug.padEnd(46)} ${p.issue}`);
}

writeFileSync(
  'scripts/data/legacy-migration-report.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      applied: APPLY,
      matched: plan.map((p) => ({
        slug: p.match.t.slug, tripId: p.match.t.id, legacyTitle: p.match.l.title,
        legacyUrl: p.match.l.url, score: Number(p.match.score.toFixed(3)),
        hero: p.hero ? { url: p.hero.url, width: p.hero.width, height: p.hero.height } : null,
        gallery: p.gallery.map((g) => ({ url: g.url, width: g.width, height: g.height })),
        droppedTooSmall: p.dropped,
      })),
      unmatchedLegacy: unmatched.map((l) => ({ title: l.title, country: l.country, url: l.url })),
      untouchedTrips: untouched.map((t) => ({ slug: t.slug, title: t.title })),
      problems,
    },
    null,
    2
  )
);
console.log('\nreport written to scripts/data/legacy-migration-report.json');

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to upload and write.');
  process.exit(0);
}

/* --- apply ------------------------------------------------------- */

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function mirror(url, slug, index) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (migration)' } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  const body = Buffer.from(await res.arrayBuffer());
  const path = `legacy/${slug}/${index}.${EXT[type] ?? 'jpg'}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, body, {
    contentType: type,
    upsert: true,
    cacheControl: '31536000',
  });
  if (upErr) throw new Error(`upload ${upErr.message}`);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

let done = 0;
const failures = [];
for (const p of plan) {
  const slug = p.match.t.slug;
  if (ONLY && slug !== ONLY) continue;
  try {
    const patch = {};
    if (p.hero) {
      patch.hero_image = await mirror(p.hero.url, slug, 'hero');
      patch.hero_alt = p.match.t.title;
    }
    const mirrored = [];
    for (const [i, g] of p.gallery.entries()) {
      try {
        mirrored.push({ url: await mirror(g.url, slug, `gallery-${i + 1}`), alt: `${p.match.t.title}` });
      } catch (e) {
        failures.push(`${slug} gallery ${i + 1}: ${e.message}`);
      }
    }

    if (p.mode === 'replace' && mirrored.length >= 3) {
      patch.gallery = mirrored;
    } else if (p.mode === 'append' && mirrored.length > 0) {
      const have = new Set(p.current);
      patch.gallery = [
        ...p.current.map((url) => ({ url, alt: p.match.t.title })),
        ...mirrored.filter((g) => !have.has(g.url)),
      ].slice(0, MAX_GALLERY);
    }
    if (Object.keys(patch).length === 0) continue;

    const { error: wErr } = await db.from('trips').update(patch).eq('id', p.match.t.id);
    if (wErr) throw new Error(wErr.message);
    done++;
    const galleryNote = patch.gallery ? `${p.mode} → ${patch.gallery.length} gallery` : 'gallery kept';
    console.log(`  ✓ ${slug} — ${p.hero ? 'hero' : 'hero kept'} + ${galleryNote}`);
  } catch (e) {
    failures.push(`${slug}: ${e.message}`);
    console.log(`  ✗ ${slug} — ${e.message}`);
  }
}

console.log(`\n${done} trips re-imaged.`);
if (failures.length) {
  console.log(`${failures.length} image failures:`);
  for (const f of failures) console.log(`  ${f}`);
}
