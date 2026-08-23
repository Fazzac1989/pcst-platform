/**
 * Download every image the public site currently serves and lay them out as
 * numbered contact sheets, so the whole library can be eyeballed for stock
 * watermarks in a few passes rather than one page at a time.
 *
 *   node scripts/build-contact-sheets.mjs
 *
 * Writes scripts/data/contact/sheet-NN.jpg plus index.json mapping every tile
 * number back to its trip, role and URL. Read-only against the database.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const URL_ = process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const OUT = 'scripts/data/contact';
const COLS = 5;
const ROWS = 5;
const TILE_W = 420;
const TILE_H = 300;
const PER_SHEET = COLS * ROWS;

mkdirSync(OUT, { recursive: true });

const { data: trips, error } = await db
  .from('trips')
  .select('slug, title, status, hero_image, gallery')
  .order('slug');
if (error) throw new Error(error.message);

/** Every image on the public site, in a stable order. */
const items = [];
for (const t of trips) {
  if (t.hero_image) items.push({ slug: t.slug, role: 'hero', url: t.hero_image });
  const gallery = Array.isArray(t.gallery) ? t.gallery : [];
  gallery.forEach((g, i) => {
    const url = typeof g === 'string' ? g : g?.url;
    if (url) items.push({ slug: t.slug, role: `gallery ${i + 1}`, url });
  });
}

// The same photograph can be reused; audit each file once.
const seen = new Map();
for (const it of items) {
  if (!seen.has(it.url)) seen.set(it.url, { ...it, usedBy: [] });
  seen.get(it.url).usedBy.push(`${it.slug} ${it.role}`);
}
const unique = [...seen.values()];
console.log(`${items.length} image references, ${unique.length} distinct files`);

const label = (n) =>
  Buffer.from(
    `<svg width="${TILE_W}" height="${TILE_H}">
       <rect x="0" y="0" width="54" height="26" fill="#101820" fill-opacity="0.82"/>
       <text x="8" y="19" font-family="monospace" font-size="16" fill="#ffffff">${n}</text>
     </svg>`
  );

let index = 0;
const manifest = [];

for (let sheet = 0; sheet * PER_SHEET < unique.length; sheet++) {
  const slice = unique.slice(sheet * PER_SHEET, (sheet + 1) * PER_SHEET);
  const composites = [];

  for (let i = 0; i < slice.length; i++) {
    const item = slice[i];
    const n = ++index;
    manifest.push({ n, sheet: sheet + 1, slug: item.slug, role: item.role, url: item.url, usedBy: item.usedBy });
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const tile = await sharp(buf)
        .resize(TILE_W, TILE_H, { fit: 'cover', position: 'centre' })
        .composite([{ input: label(n), top: 0, left: 0 }])
        .jpeg({ quality: 78 })
        .toBuffer();
      composites.push({
        input: tile,
        left: (i % COLS) * TILE_W,
        top: Math.floor(i / COLS) * TILE_H,
      });
    } catch (e) {
      console.log(`  #${n} ${item.slug} ${item.role} — ${e.message}`);
    }
  }

  const file = `${OUT}/sheet-${String(sheet + 1).padStart(2, '0')}.jpg`;
  await sharp({
    create: { width: COLS * TILE_W, height: ROWS * TILE_H, channels: 3, background: '#20303a' },
  })
    .composite(composites)
    .jpeg({ quality: 80 })
    .toFile(file);
  console.log(`${file} — ${slice.length} tiles`);
}

writeFileSync(`${OUT}/index.json`, JSON.stringify({ total: unique.length, tiles: manifest }, null, 2));
console.log(`\n${Math.ceil(unique.length / PER_SHEET)} sheets, index written to ${OUT}/index.json`);
