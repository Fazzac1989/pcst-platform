/**
 * Audit the migrated catalogue against premiumchoiceschooltrips.com.
 *
 *   node scripts/audit-legacy-catalogue.mjs
 *
 * Answers three questions:
 *   1. Which legacy trips have no counterpart in the database?
 *   2. Is each trip's hero the one from the old site, and where is it hosted?
 *   3. Does each trip's gallery match the old site, and what could be added?
 *
 * Discovery does not trust the /trips listing alone: it also walks every
 * country and subject filter and probes the id range, because a trip that
 * dropped off the index is exactly the kind that goes missing in a migration.
 *
 * Read-only. Writes scripts/data/legacy-audit.json.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE = 'https://premiumchoiceschooltrips.com';
const URL_ = process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error('Set PCST_SUPABASE_URL and PCST_SUPABASE_SERVICE_ROLE_KEY');
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const MAX_PROBE_ID = Number(process.argv.find((a) => a.startsWith('--max='))?.split('=')[1] ?? 130);

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"')
   .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const strip = (s) => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
const absolute = (p) => `${BASE}/${p.replace(/^\.?\//, '').trim().split('/').map(encodeURIComponent).join('/')}`;

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (audit)' } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 700 * (i + 1)));
  }
  return null;
}

/* ── 1. discover every trip id the old site will serve ─────────────── */

const ids = new Set();
const addIds = (html) => {
  for (const m of html.matchAll(/trips&(?:amp;)?id=(\d+)/g)) ids.add(Number(m[1]));
};

console.log('crawling the legacy site…');
const seeds = ['/trips', '/', '/countries', '/subjects'];
const filters = new Set();
for (const seed of seeds) {
  const html = await get(BASE + seed);
  if (!html) continue;
  addIds(html);
  for (const m of html.matchAll(/trips&(?:amp;)?(cid|sid)=(\d+)/g)) filters.add(`${m[1]}=${m[2]}`);
}
console.log(`  ${ids.size} ids from the index pages, ${filters.size} country/subject filters to walk`);

for (const f of filters) {
  const html = await get(`${BASE}/trips&${f}`);
  if (html) addIds(html);
}
console.log(`  ${ids.size} ids after walking the filters`);

// Probe the gaps: an unlisted trip still answers on its own URL.
const probe = [];
for (let i = 1; i <= MAX_PROBE_ID; i++) if (!ids.has(i)) probe.push(i);
let found = 0;
for (const id of probe) {
  const html = await get(`${BASE}/trips&id=${id}`, 1);
  if (!html) continue;
  const title = strip(html.match(/<section class="parallax-window2[\s\S]*?<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  if (title && !/^school trips$/i.test(title)) {
    ids.add(id);
    found++;
  }
}
console.log(`  ${found} further trip(s) found by probing ids 1–${MAX_PROBE_ID}`);
console.log(`  ${ids.size} legacy trips in total\n`);

/* ── 2. scrape each one ────────────────────────────────────────────── */

async function scrape(id) {
  const html = await get(`${BASE}/trips&id=${id}`);
  if (!html) return null;
  const body = html.split(/<aside\b/i)[0];
  const title = strip(body.match(/<section class="parallax-window2[\s\S]*?<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  if (!title) return null;
  const hero = body.match(/class="parallax-window2"[^>]*background:\s*url\(([^)]+)\)/i)?.[1]?.trim() ?? null;
  const carousel = body.match(/id="Img_carousel"[\s\S]*?(?=<\/div>\s*<\/div>\s*<div class="container|$)/i)?.[0] ?? body;
  const gallery = Array.from(new Set([...carousel.matchAll(/data-large="([^"]+)"/gi)].map((m) => decode(m[1]))));
  const enq = body.match(/href="enquiry&(?:amp;)?([^"]*)"/i)?.[1] ?? '';
  const param = (k) => decode(enq.match(new RegExp(`(?:^|&(?:amp;)?)${k}=([^&]*)`, 'i'))?.[1] ?? '').trim();
  return {
    legacyId: id,
    url: `${BASE}/trips&id=${id}`,
    title,
    subject: param('sid'),
    country: param('cid'),
    city: param('ccid'),
    hero: hero ? absolute(hero) : null,
    gallery: gallery.map(absolute),
  };
}

// Reuse the earlier scrape where we already measured the images.
const CACHE = 'scripts/data/legacy-images.json';
const measured = new Map();
if (existsSync(CACHE)) {
  const prev = JSON.parse(readFileSync(CACHE, 'utf8'));
  for (const t of prev.trips) {
    for (const img of [t.hero, ...t.gallery].filter(Boolean)) {
      if (img.width) measured.set(img.url, { width: img.width, height: img.height, bytes: img.bytes });
    }
  }
}

async function measure(url) {
  if (measured.has(url)) return measured.get(url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (audit)' } });
    if (!res.ok) return { width: null, height: null, error: res.status };
    const b = Buffer.from(await res.arrayBuffer());
    let dim = { width: null, height: null };
    if (b[0] === 0x89 && b[1] === 0x50) dim = { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    else if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
          dim = { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
          break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
    const info = { ...dim, bytes: b.length };
    measured.set(url, info);
    return info;
  } catch (e) {
    return { width: null, height: null, error: String(e.message ?? e) };
  }
}

console.log('reading each trip page…');
const legacy = [];
for (const id of Array.from(ids).sort((a, b) => a - b)) {
  const t = await scrape(id);
  if (t) legacy.push(t);
}
console.log(`  ${legacy.length} trips read\n`);

console.log('measuring images…');
for (const t of legacy) {
  t.heroInfo = t.hero ? await measure(t.hero) : null;
  t.galleryInfo = [];
  for (const g of t.gallery) t.galleryInfo.push({ url: g, ...(await measure(g)) });
}
console.log(`  ${measured.size} distinct images measured\n`);

/* ── 3. match against the database ─────────────────────────────────── */

const { data: dbTrips, error } = await db
  .from('trips')
  .select('id, slug, title, status, hero_image, gallery, countries(name), subjects(name)')
  .order('id');
if (error) throw new Error(error.message);

const norm = (s) => (s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['trip','trips','tour','tours','to','the','a','of','and','in','school','experience','adventure','study','visit','educational']);
const toks = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)));
const sim = (a, b) => {
  const A = toks(a), B = toks(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return (2 * n) / (A.size + B.size);
};
const ALIAS = { hongkong: 'hong kong', holland: 'netherlands' };
const ckey = (s) => { const n = norm(s).replace(/^the /, ''); return ALIAS[n] ?? n; };
const slugify = (s) => norm(s).replace(/\s+/g, '-');

const pairs = [];
for (const l of legacy) {
  const lslug = slugify(l.title);
  for (const t of dbTrips) {
    const sameCountry = ckey(l.country) === ckey(t.countries?.name ?? '');
    const byTitle = sim(l.title, t.title);
    const bySlug = Math.max(sim(lslug.replace(/-/g, ' '), (t.slug ?? '').replace(/-/g, ' ')), lslug === t.slug ? 1 : 0);
    const best = Math.max(byTitle, bySlug);
    if (!sameCountry && best < 0.55) continue;
    pairs.push({ l, t, score: (sameCountry ? 0.3 : 0) + best * 0.7, how: bySlug >= byTitle ? 'slug' : 'title' });
  }
}
pairs.sort((a, b) => b.score - a.score);

const claimedL = new Set(), claimedT = new Set(), matches = [];
for (const p of pairs) {
  if (claimedL.has(p.l.legacyId) || claimedT.has(p.t.id) || p.score < 0.45) continue;
  claimedL.add(p.l.legacyId); claimedT.add(p.t.id); matches.push(p);
}
for (const l of legacy) {
  if (claimedL.has(l.legacyId)) continue;
  const left = dbTrips.filter((t) => !claimedT.has(t.id) && ckey(l.country) === ckey(t.countries?.name ?? ''));
  if (left.length === 1) { claimedL.add(l.legacyId); claimedT.add(left[0].id); matches.push({ l, t: left[0], score: 0.5, how: 'country' }); }
}

const missing = legacy.filter((l) => !claimedL.has(l.legacyId));
const extra = dbTrips.filter((t) => !claimedT.has(t.id));

/* ── 4. compare the imagery ────────────────────────────────────────── */

const urls = (g) => (Array.isArray(g) ? g.map((x) => (typeof x === 'string' ? x : x?.url)).filter(Boolean) : []);
const source = (u) =>
  !u ? 'none'
  : /\/legacy\//.test(u) ? 'legacy site'
  : /shutterstock/i.test(u) ? 'Shutterstock (curated)'
  : /commons|wikimedia/i.test(u) ? 'Wikimedia'
  : /supabase\.co/.test(u) ? 'uploaded'
  : 'external';

const report = [];
for (const m of matches.sort((a, b) => a.t.slug.localeCompare(b.t.slug))) {
  const dbGallery = urls(m.t.gallery);
  const legacyBig = m.l.galleryInfo.filter((g) => (g.width ?? 0) >= 1000);
  report.push({
    slug: m.t.slug,
    title: m.t.title,
    status: m.t.status,
    legacyTitle: m.l.title,
    legacyUrl: m.l.url,
    matchedBy: m.how,
    hero: {
      source: source(m.t.hero_image),
      fromLegacy: /\/legacy\//.test(m.t.hero_image ?? ''),
      legacyBest: m.l.heroInfo?.width ? `${m.l.heroInfo.width}×${m.l.heroInfo.height}` : null,
    },
    gallery: {
      count: dbGallery.length,
      fromLegacy: dbGallery.filter((u) => /\/legacy\//.test(u)).length,
      sources: Array.from(new Set(dbGallery.map(source))),
      legacyUsableAvailable: legacyBig.length,
      legacyTotal: m.l.gallery.length,
      couldAdd: Math.max(0, legacyBig.length - dbGallery.filter((u) => /\/legacy\//.test(u)).length),
    },
  });
}

/* ── 5. report ─────────────────────────────────────────────────────── */

console.log('═══ 1. LEGACY TRIPS WITH NO COUNTERPART IN THE NEW SYSTEM ═══');
if (!missing.length) console.log('  none — every legacy trip is matched\n');
else {
  for (const l of missing) console.log(`  ${l.title}  [${l.country} | ${l.subject}]  ${l.url}`);
  console.log('');
}

console.log('═══ 2. HERO IMAGE SOURCE ═══');
const heroNotLegacy = report.filter((r) => !r.hero.fromLegacy);
console.log(`  ${report.length - heroNotLegacy.length} of ${report.length} heroes come from the old site`);
if (heroNotLegacy.length) {
  console.log('  not from the old site:');
  for (const r of heroNotLegacy)
    console.log(`    ${r.slug.padEnd(46)} ${r.hero.source.padEnd(22)} best legacy: ${r.legacyBest ?? r.hero.legacyBest ?? 'n/a'}`);
}
console.log('');

console.log('═══ 3. GALLERY ═══');
const galGaps = report.filter((r) => r.gallery.couldAdd > 0);
console.log(`  ${report.filter((r) => r.gallery.fromLegacy > 0).length} of ${report.length} galleries use the old site's photographs`);
if (galGaps.length) {
  console.log('  legacy images available but not yet used:');
  for (const r of galGaps)
    console.log(`    ${r.slug.padEnd(46)} has ${r.gallery.count} (${r.gallery.fromLegacy} legacy) · could add ${r.gallery.couldAdd}`);
}
console.log('');

console.log('═══ TRIPS IN THE NEW SYSTEM WITH NO LEGACY ORIGIN ═══');
for (const t of extra) console.log(`  ${t.slug.padEnd(46)} ${t.title}`);

mkdirSync('scripts/data', { recursive: true });
writeFileSync(
  'scripts/data/legacy-audit.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      legacyTripCount: legacy.length,
      databaseTripCount: dbTrips.length,
      missingFromNewSystem: missing.map((l) => ({ title: l.title, country: l.country, subject: l.subject, url: l.url, hero: l.hero, gallery: l.gallery })),
      trips: report,
      newOnly: extra.map((t) => ({ slug: t.slug, title: t.title })),
    },
    null,
    2
  )
);
console.log('\nwritten to scripts/data/legacy-audit.json');
