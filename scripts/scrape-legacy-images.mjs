/**
 * Scrape the original premiumchoiceschooltrips.com for each trip's own
 * photography, so the migrated catalogue can be re-imaged with the pictures the
 * business actually chose.
 *
 *   node scripts/scrape-legacy-images.mjs            → writes the manifest
 *   node scripts/scrape-legacy-images.mjs --probe    → also measures every image
 *
 * The old site is a PHP CMS: each trip is /trips&id=N with a parallax hero
 * (cms/lib/banner/…) and a slider-pro carousel (cms/lib/galimages/…). The
 * sidebar carries thumbnails of *other* trips, so everything from `<aside` on
 * is discarded before parsing.
 *
 * Output: scripts/data/legacy-images.json — read by migrate-legacy-images.mjs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = 'https://premiumchoiceschooltrips.com';
const PROBE = process.argv.includes('--probe');
const OUT = 'scripts/data/legacy-images.json';

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const strip = (s) => decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

/** The CMS stores raw filenames; only the path segment needs escaping. */
function absolute(path) {
  const clean = path.replace(/^\.?\//, '').trim();
  return `${BASE}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (migration)' } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}

/** JPEG/PNG/GIF/WebP dimensions + byte size, without decoding the whole file. */
async function probe(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (migration)' } });
    if (!res.ok) return { ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, bytes: buf.length, ...dimensions(buf) };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}

function dimensions(b) {
  // PNG
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // GIF
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49) {
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  }
  // WebP (VP8X / VP8 / VP8L)
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = b.toString('ascii', 12, 16);
    if (fmt === 'VP8X') return { width: (b.readUIntLE(24, 3) & 0xffffff) + 1, height: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fmt === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  // JPEG — walk the segment markers to the first SOF
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return { width: null, height: null };
}

/** Shutterstock asset ids leak through the CMS filenames on stock images. */
function shutterstockId(filename) {
  const m = filename.match(/shutterstock[_-](\d{6,})/i);
  return m ? m[1] : null;
}

async function scrapeTrip(id) {
  const html = await get(`${BASE}/trips&id=${id}`);
  if (!html) return null;

  // The sidebar advertises other trips; nothing after it belongs to this one.
  const body = html.split(/<aside\b/i)[0];

  const title = strip(body.match(/<section class="parallax-window2[\s\S]*?<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  if (!title) return null;

  const hero = body.match(/class="parallax-window2"[^>]*background:\s*url\(([^)]+)\)/i)?.[1]?.trim() ?? null;

  const carousel = body.match(/id="Img_carousel"[\s\S]*?(?=<\/div>\s*<\/div>\s*<div class="container|$)/i)?.[0] ?? body;
  const gallery = [...carousel.matchAll(/data-large="([^"]+)"/gi)].map((m) => decode(m[1]));

  // enquiry&sid=History&cid=Jordan &ccid=Amman&dur=5 Days - 4 Nights
  const enq = body.match(/href="enquiry&(?:amp;)?([^"]*)"/i)?.[1] ?? '';
  const param = (k) => decode(enq.match(new RegExp(`(?:^|&(?:amp;)?)${k}=([^&]*)`, 'i'))?.[1] ?? '').trim();

  const unique = [...new Set(gallery)];
  return {
    legacyId: id,
    url: `${BASE}/trips&id=${id}`,
    title,
    subject: param('sid'),
    country: param('cid'),
    city: param('ccid'),
    duration: param('dur'),
    hero: hero ? { path: hero, url: absolute(hero), shutterstock: shutterstockId(hero) } : null,
    gallery: unique.map((path) => ({ path, url: absolute(path), shutterstock: shutterstockId(path) })),
  };
}

/* ------------------------------------------------------------------ */

const index = await get(`${BASE}/trips`);
if (!index) throw new Error('Could not load the trips index.');
const ids = [...new Set([...index.matchAll(/trips&(?:amp;)?id=(\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
console.log(`${ids.length} trips listed on the legacy site\n`);

const trips = [];
for (const id of ids) {
  const trip = await scrapeTrip(id);
  if (!trip) {
    console.log(`  id=${id} — could not read`);
    continue;
  }
  trips.push(trip);
  console.log(`  id=${String(id).padStart(3)} ${trip.title} — ${trip.gallery.length} gallery${trip.hero ? ' + hero' : ''}`);
}

if (PROBE) {
  console.log('\nMeasuring images…');
  const seen = new Map();
  for (const trip of trips) {
    for (const img of [trip.hero, ...trip.gallery].filter(Boolean)) {
      if (seen.has(img.url)) Object.assign(img, seen.get(img.url));
      else {
        const info = await probe(img.url);
        seen.set(img.url, info);
        Object.assign(img, info);
      }
    }
  }
  console.log(`measured ${seen.size} distinct images`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ scrapedAt: new Date().toISOString(), trips }, null, 2));

const all = trips.flatMap((t) => [t.hero, ...t.gallery].filter(Boolean));
const stock = all.filter((i) => i.shutterstock);
console.log(`\n${trips.length} trips, ${all.length} image references (${new Set(all.map((i) => i.url)).size} distinct)`);
console.log(`${stock.length} carry a Shutterstock id in the filename`);
if (PROBE) {
  const small = all.filter((i) => i.width && i.width < 1200);
  const failed = all.filter((i) => i.ok === false);
  console.log(`${small.length} image references are under 1200px wide`);
  console.log(`${failed.length} could not be downloaded`);
}
console.log(`\nwritten to ${OUT}`);
