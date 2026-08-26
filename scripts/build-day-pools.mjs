/**
 * Assemble, for every itinerary day still without a photograph, the pool of
 * images we already own that could fill it.
 *
 *   node scripts/build-day-pools.mjs
 *
 * Shutterstock cannot license (the account's only real image plan, "PS Core
 * Free Product", is at 0 of 500 downloads), so every remaining day has to be
 * filled from photography the business already holds. Two sources, in order of
 * preference:
 *
 *   own      — an unused image from the trip's own gallery
 *   sibling  — an image from another trip in the same country, ideally the
 *              same city, which is still our own photography of the right place
 *
 * Images already in use as a day thumbnail on the same trip are excluded, so
 * no itinerary repeats a picture.
 *
 * Writes scripts/data/day-pools.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Broken drafts: their itineraries are unusable until the days are split. */
const SKIP = new Set(['china-trip', 'japan-art-design-and-technology', 'les-elfes-ski-trip']);

const urlOf = (e) => (typeof e === 'string' ? e : (e?.url ?? null));
const altOf = (e) => (typeof e === 'string' ? '' : (e?.alt ?? ''));

const { data: trips } = await db
  .from('trips')
  .select('id, slug, title, status, city, hero_image, gallery, country_id, countries(name, slug)')
  .order('slug');
const { data: allDays } = await db
  .from('itinerary_days')
  .select('id, trip_id, sort_order, title, display_title, summary, primary_location, highlights, image_url, description')
  .order('sort_order');

const { data: countries } = await db.from('countries').select('id, name, slug, hero_image, hero_alt, gallery');
const { data: cities } = await db.from('cities').select('id, name, slug, country_id, hero_image, hero_alt, gallery');
const countriesById = new Map((countries ?? []).map((c) => [c.id, c]));

const daysByTrip = new Map();
for (const d of allDays ?? []) {
  if (!daysByTrip.has(d.trip_id)) daysByTrip.set(d.trip_id, []);
  daysByTrip.get(d.trip_id).push(d);
}

/** Every image in use as a day thumbnail, so siblings never hand over a picture
 *  that is already doing this job elsewhere. */
const usedAsDay = new Set((allDays ?? []).map((d) => d.image_url).filter(Boolean));

const out = [];
for (const trip of trips ?? []) {
  if (SKIP.has(trip.slug)) continue;
  const days = (daysByTrip.get(trip.id) ?? []).filter((d) => d.description?.trim());
  const missing = days.map((d, i) => ({ n: i + 1, d })).filter((x) => !x.d.image_url);
  if (!missing.length) continue;

  const ownUsed = new Set(days.map((d) => d.image_url).filter(Boolean));
  const own = (Array.isArray(trip.gallery) ? trip.gallery : [])
    .map((e, i) => ({ url: urlOf(e), alt: altOf(e), from: 'own', trip: trip.slug, idx: i + 1 }))
    .filter((c) => c.url && !ownUsed.has(c.url));

  // Siblings in the same country. Same city first — a Tokyo day should not be
  // illustrated with a photograph of Kyoto if a Tokyo one exists.
  const siblings = (trips ?? []).filter(
    (t) => t.id !== trip.id && t.country_id && t.country_id === trip.country_id && !SKIP.has(t.slug)
  );
  const sibling = [];
  for (const s of siblings) {
    const sameCity =
      Boolean(trip.city && s.city && String(s.city).toLowerCase() === String(trip.city).toLowerCase());
    (Array.isArray(s.gallery) ? s.gallery : []).forEach((e, i) => {
      const url = urlOf(e);
      if (!url || ownUsed.has(url) || usedAsDay.has(url)) return;
      sibling.push({ url, alt: altOf(e), from: sameCity ? 'sibling-city' : 'sibling', trip: s.slug, idx: i + 1 });
    });
    if (s.hero_image && !ownUsed.has(s.hero_image) && !usedAsDay.has(s.hero_image)) {
      sibling.push({
        url: s.hero_image,
        alt: '',
        from: sameCity ? 'sibling-city-hero' : 'sibling-hero',
        trip: s.slug,
        idx: 0,
      });
    }
  }

  // The country and city records carry their own photography too — same
  // places, already ours, and a fair source for a day that has run out.
  const place = [];
  const cityRec = trip.city
    ? cities.find((c) => String(c.name).toLowerCase() === String(trip.city).toLowerCase())
    : null;
  for (const [rec, kind] of [
    [cityRec, 'city-record'],
    [countriesById.get(trip.country_id), 'country-record'],
  ]) {
    if (!rec) continue;
    (Array.isArray(rec.gallery) ? rec.gallery : []).forEach((e, i) => {
      const url = urlOf(e);
      if (!url || ownUsed.has(url) || usedAsDay.has(url)) return;
      place.push({ url, alt: altOf(e), from: kind, trip: rec.slug ?? rec.name, idx: i + 1 });
    });
    if (rec.hero_image && !ownUsed.has(rec.hero_image) && !usedAsDay.has(rec.hero_image)) {
      place.push({ url: rec.hero_image, alt: rec.hero_alt ?? '', from: `${kind}-hero`, trip: rec.slug ?? rec.name, idx: 0 });
    }
  }

  const rank = {
    own: 0,
    'sibling-city': 1,
    'sibling-city-hero': 2,
    'city-record': 3,
    'city-record-hero': 4,
    sibling: 5,
    'sibling-hero': 6,
    'country-record': 7,
    'country-record-hero': 8,
  };
  const pool = [...own, ...sibling, ...place]
    .filter((c, i, a) => a.findIndex((x) => x.url === c.url) === i)
    .sort((a, b) => rank[a.from] - rank[b.from]);

  out.push({
    trip: trip.slug,
    title: trip.title,
    status: trip.status,
    country: trip.countries?.name ?? null,
    city: trip.city ?? null,
    totalDays: days.length,
    missing: missing.map((x) => ({
      day: x.n,
      title: x.d.display_title || x.d.title || `Day ${x.n}`,
      place: x.d.primary_location ?? null,
      summary: (x.d.summary ?? x.d.description ?? '').slice(0, 260),
      highlights: (Array.isArray(x.d.highlights) ? x.d.highlights : [])
        .map((h) => String(h?.name ?? h ?? '').trim())
        .filter(Boolean)
        .slice(0, 6),
    })),
    pool,
  });
}

mkdirSync('scripts/data', { recursive: true });
writeFileSync('scripts/data/day-pools.json', JSON.stringify(out, null, 1));

let short = 0;
for (const t of out) {
  const enough = t.pool.length >= t.missing.length;
  if (!enough) short++;
  console.log(
    `${t.trip.padEnd(50)} need ${String(t.missing.length).padStart(2)}  pool ${String(t.pool.length).padStart(3)}` +
      `  (own ${t.pool.filter((p) => p.from === 'own').length}` +
      `, city ${t.pool.filter((p) => p.from.startsWith('sibling-city') || p.from.startsWith('city-record')).length}` +
      `, country ${t.pool.filter((p) => !p.from.startsWith('own') && !p.from.startsWith('sibling-city') && !p.from.startsWith('city-record')).length})` +
      (enough ? '' : '   << SHORT')
  );
}
console.log(
  `\n${out.length} trips, ${out.reduce((n, t) => n + t.missing.length, 0)} days to fill, ${short} without enough images`
);
