/**
 * School Trips image audit.
 *
 * Reads every image reference used by the public School Trips site, records it
 * for rollback, then checks each one for reachability, resolution, hosting and
 * duplication. Read-only: it changes nothing.
 *
 *   node scripts/audit-images.mjs
 *
 * Writes scripts/data/image-audit-backup.json and prints a report.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
const MIN_HERO_WIDTH = 2400;
const MIN_GALLERY_WIDTH = 1600;

/* ---------- gather every reference ---------- */

const refs = [];
const add = (r) => refs.push(r);

const [{ data: trips }, { data: days }, { data: countries }, { data: subjects }, curatedRes] = await Promise.all([
  db.from('trips').select('id, slug, title, status, hero_image, hero_alt, gallery, subjects(name), countries(name)').order('id'),
  db.from('itinerary_days').select('id, trip_id, sort_order, label, title, image_url, image_alt').order('trip_id'),
  db.from('countries').select('id, name, slug'),
  db.from('subjects').select('id, name, slug'),
  db.from('trip_images').select('*').eq('approved', true).order('trip_id').order('sort_order'),
]);

const tripById = new Map((trips ?? []).map((t) => [t.id, t]));

// Curated images supersede the legacy fields wherever a trip has them.
const curated = curatedRes?.error ? [] : curatedRes.data ?? [];
const curatedByTrip = new Map();
for (const c of curated) {
  (curatedByTrip.get(c.trip_id) ?? curatedByTrip.set(c.trip_id, []).get(c.trip_id)).push(c);
}
for (const c of curated) {
  const t = tripById.get(c.trip_id);
  add({
    page: t ? `/trips/${t.slug}` : `trip#${c.trip_id}`,
    route: 'app/trips/[slug]/page.tsx',
    component: c.role === 'hero' ? 'thero' : 'tgal',
    table: 'trip_images', recordId: c.id, field: 'url', role: c.role,
    url: c.url, alt: c.alt_text ?? '', status: t?.status ?? 'unknown',
    trip: t?.title ?? null, curated: true,
    licence: c.licence, photographer: c.photographer, source: c.source,
    subject: t?.subjects?.name ?? null, country: t?.countries?.name ?? null,
  });
}

for (const t of trips ?? []) {
  // Skip legacy references for trips that have been repopulated.
  if (curatedByTrip.has(t.id)) continue;
  if (t.hero_image) {
    add({
      page: `/trips/${t.slug}`, route: 'app/trips/[slug]/page.tsx', component: 'thero',
      table: 'trips', recordId: t.id, field: 'hero_image', role: 'hero',
      url: t.hero_image, alt: t.hero_alt ?? '', status: t.status,
      trip: t.title, subject: t.subjects?.name ?? null, country: t.countries?.name ?? null,
    });
  }
  const gallery = Array.isArray(t.gallery) ? t.gallery : [];
  gallery.forEach((g, i) => {
    const url = typeof g === 'string' ? g : g?.url;
    const alt = typeof g === 'string' ? '' : g?.alt ?? '';
    if (url) {
      add({
        page: `/trips/${t.slug}`, route: 'app/trips/[slug]/page.tsx', component: 'tgallery',
        table: 'trips', recordId: t.id, field: `gallery[${i}]`, role: 'gallery',
        url, alt, status: t.status, trip: t.title,
        subject: t.subjects?.name ?? null, country: t.countries?.name ?? null,
      });
    }
  });
}

for (const d of days ?? []) {
  if (!d.image_url) continue;
  const t = tripById.get(d.trip_id);
  add({
    page: t ? `/trips/${t.slug}` : `trip#${d.trip_id}`, route: 'app/trips/[slug]/ItineraryPanel.tsx',
    component: 'itin-panel', table: 'itinerary_days', recordId: d.id,
    field: 'image_url', role: 'itinerary', url: d.image_url, alt: d.image_alt ?? '',
    status: t?.status ?? 'unknown', trip: t?.title ?? null, day: d.label ?? `Day ${d.sort_order}`,
    subject: t?.subjects?.name ?? null, country: t?.countries?.name ?? null,
  });
}

// Subject and country pages borrow a trip hero rather than owning an image.
const derived = { subjects: (subjects ?? []).length, countries: (countries ?? []).length };

/* ---------- check each reference ---------- */

async function probe(url) {
  const out = { reachable: false, status: 0, bytes: null, type: null, width: null, height: null };
  try {
    const res = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-65535' } });
    out.status = res.status;
    out.reachable = res.ok || res.status === 206;
    out.type = res.headers.get('content-type');
    const len = res.headers.get('content-range')?.split('/')?.[1] ?? res.headers.get('content-length');
    out.bytes = len ? Number(len) : null;
    const buf = Buffer.from(await res.arrayBuffer());
    Object.assign(out, dimensions(buf));
  } catch {
    /* leave as unreachable */
  }
  return out;
}

/** Minimal header parsing — enough for JPEG, PNG and WebP. */
function dimensions(b) {
  try {
    if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') {
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = b.toString('ascii', 12, 16);
      if (fmt === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      if (fmt === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') {
        const n = b.readUInt32LE(21);
        return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 };
      }
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
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
  } catch {
    /* unknown */
  }
  return { width: null, height: null };
}

console.log(`Probing ${refs.length} image references…\n`);
for (const r of refs) {
  const p = await probe(r.url);
  Object.assign(r, p);
  r.host = (() => { try { return new URL(r.url).host; } catch { return 'invalid-url'; } })();
  r.hotlinked = r.host !== SUPABASE_HOST;
  const min = r.role === 'hero' ? MIN_HERO_WIDTH : MIN_GALLERY_WIDTH;
  r.issues = [
    !p.reachable && 'unreachable',
    p.reachable && p.width && p.width < min && `below-min-width (${p.width}px, want ${min}px)`,
    p.reachable && !p.width && 'dimensions-unknown',
    !r.alt?.trim() && 'missing-alt',
    r.hotlinked && 'hotlinked-not-hosted',
    !r.licence && 'no-licence-metadata',
  ].filter(Boolean);
}

/* ---------- duplicates ---------- */

const byUrl = new Map();
for (const r of refs) {
  const key = r.url.split('?')[0];
  (byUrl.get(key) ?? byUrl.set(key, []).get(key)).push(r);
}
const duplicates = [...byUrl.entries()].filter(([, v]) => v.length > 1);

/* ---------- coverage ---------- */

const published = (trips ?? []).filter((t) => t.status === 'published');
const coverage = published.map((t) => {
  const cur = curatedByTrip.get(t.id) ?? [];
  if (cur.length) {
    const dayImgsC = (days ?? []).filter((d) => d.trip_id === t.id && d.image_url).length;
    return {
      id: t.id, slug: t.slug, title: t.title,
      subject: t.subjects?.name ?? null, country: t.countries?.name ?? null,
      curated: true,
      hero: cur.some((c) => c.role === 'hero'),
      heroAlt: cur.some((c) => c.role === 'hero' && c.alt_text?.trim()),
      gallery: cur.filter((c) => c.role === 'gallery').length,
      itinerary: dayImgsC,
      total: cur.length + dayImgsC,
    };
  }
  const gallery = Array.isArray(t.gallery) ? t.gallery.filter((g) => (typeof g === 'string' ? g : g?.url)) : [];
  const dayImgs = (days ?? []).filter((d) => d.trip_id === t.id && d.image_url).length;
  return {
    id: t.id, slug: t.slug, title: t.title,
    subject: t.subjects?.name ?? null, country: t.countries?.name ?? null,
    hero: Boolean(t.hero_image), heroAlt: Boolean(t.hero_alt?.trim()),
    gallery: gallery.length, itinerary: dayImgs,
    total: (t.hero_image ? 1 : 0) + gallery.length + dayImgs,
  };
});

/* ---------- write backup ---------- */

mkdirSync('scripts/data', { recursive: true });
const backup = {
  generatedAt: new Date().toISOString(),
  supabaseHost: SUPABASE_HOST,
  scope: 'Premium Choice School Trips only',
  counts: {
    references: refs.length,
    publishedTrips: published.length,
    allTrips: (trips ?? []).length,
    subjects: derived.subjects,
    countries: derived.countries,
  },
  references: refs,
  coverage,
};
writeFileSync('scripts/data/image-audit-backup.json', JSON.stringify(backup, null, 2));

/* ---------- report ---------- */

const count = (pred) => refs.filter(pred).length;
const line = (l, v) => console.log(`  ${String(l).padEnd(38)} ${v}`);

console.log('='.repeat(64));
console.log('SCHOOL TRIPS IMAGE AUDIT');
console.log('='.repeat(64));
line('Published trips', published.length);
line('Total trips (inc. draft/archived)', (trips ?? []).length);
line('Subject pages', derived.subjects);
line('Country pages', derived.countries);
console.log('');
line('Image references found', refs.length);
line('  heroes', count((r) => r.role === 'hero'));
line('  gallery images', count((r) => r.role === 'gallery'));
line('  itinerary images', count((r) => r.role === 'itinerary'));
console.log('');
line('Unreachable / broken', count((r) => !r.reachable));
line('Hotlinked (not self-hosted)', count((r) => r.hotlinked));
line('Missing alt text', count((r) => !r.alt?.trim()));
line('Below minimum width', count((r) => r.issues.some((i) => i.startsWith('below-min-width'))));
line('Dimensions undetectable', count((r) => r.issues.includes('dimensions-unknown')));
line('Missing licence metadata', count((r) => !r.licence));
line('Curated (rights recorded)', count((r) => r.curated));
line('Duplicate URLs (distinct)', duplicates.length);
console.log('');

const hosts = [...new Set(refs.map((r) => r.host))];
console.log('  Hosts in use:');
for (const h of hosts) console.log(`    ${h} — ${count((r) => r.host === h)}`);
console.log('');

console.log('COVERAGE AGAINST THE 7-IMAGE STANDARD (published trips)');
line('With a hero image', coverage.filter((c) => c.hero).length + ' / ' + coverage.length);
line('With hero alt text', coverage.filter((c) => c.heroAlt).length + ' / ' + coverage.length);
line('With 6+ gallery images', coverage.filter((c) => c.gallery >= 6).length + ' / ' + coverage.length);
line('With any gallery image', coverage.filter((c) => c.gallery > 0).length + ' / ' + coverage.length);
line('With any itinerary image', coverage.filter((c) => c.itinerary > 0).length + ' / ' + coverage.length);
line('Meeting the 7-image minimum', coverage.filter((c) => c.hero && c.gallery >= 6).length + ' / ' + coverage.length);
console.log('');

if (duplicates.length) {
  console.log('MOST REUSED IMAGES');
  duplicates.sort((a, b) => b[1].length - a[1].length).slice(0, 10).forEach(([url, list]) => {
    console.log(`  ${list.length}x  ${url.slice(0, 72)}`);
    console.log(`        ${[...new Set(list.map((r) => r.trip))].join(' | ').slice(0, 100)}`);
  });
  console.log('');
}

console.log('WEAKEST PAGES (fewest images, published only)');
coverage.sort((a, b) => a.total - b.total || a.title.localeCompare(b.title)).slice(0, 20)
  .forEach((c, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${c.title.slice(0, 44).padEnd(45)} ` +
      `hero:${c.hero ? 'Y' : 'N'} gallery:${String(c.gallery).padStart(2)} itin:${String(c.itinerary).padStart(2)} total:${c.total}`
    );
  });

console.log('\nBackup written to scripts/data/image-audit-backup.json');
