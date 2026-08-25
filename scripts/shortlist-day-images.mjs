/**
 * Build a Shutterstock shortlist for every itinerary day that still has no
 * photograph.
 *
 *   node scripts/shortlist-day-images.mjs
 *
 * Search works on the current API token; licensing does not — the account
 * returns "Subscription is unusable" for every image, so the files cannot be
 * pulled automatically. This produces the next best thing: for each day, the
 * search that describes it and the three best candidates, each with its
 * Shutterstock id and page link, ready to license by hand.
 *
 * Writes scripts/data/day-image-shortlist.json and .html
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

const TOKEN = process.env.SHUTTERSTOCK_API_TOKEN;
if (!TOKEN) throw new Error('SHUTTERSTOCK_API_TOKEN is not set');

const SKIP = new Set(['china-trip', 'japan-art-design-and-technology', 'les-elfes-ski-trip']);

/**
 * --widen re-runs only the days a previous pass left empty, searching the
 * place rather than the specific attraction. Kept separate so a full run
 * stays inside one rate-limit window.
 */
const WIDEN = process.argv.includes('--widen');
let PREVIOUS = new Map();
if (WIDEN) {
  const { readFileSync } = await import('node:fs');
  const prev = JSON.parse(readFileSync('scripts/data/day-image-shortlist.json', 'utf8'));
  for (const row of prev.days) {
    if (row.candidates.length > 0) PREVIOUS.set(`${row.trip}#${row.day}`, row);
  }
  console.log(`widening: ${PREVIOUS.size} days already have candidates and will be kept`);
}

/**
 * What to search for. The day's own place and highlights beat its title:
 * "Petra" and "The Treasury" find photographs, "A Full Day Inside" does not.
 * Generic arrival and departure days fall back to the destination itself.
 */
function queryFor(day, trip) {
  const place = (day.primary_location ?? '').trim();
  const highlights = (Array.isArray(day.highlights) ? day.highlights : [])
    .map((h) => String(h?.name ?? '').trim())
    .filter(Boolean)
    // Meals, transfers and free time are not photographable subjects.
    .filter((h) => !/dinner|lunch|breakfast|free time|transfer|airport|flight|leisure|shopping|reflection|briefing|orientation|welcome|return/i.test(h));

  const subject = highlights[0] ?? '';
  const country = trip.countries?.name ?? '';
  const parts = [subject, place || country].filter(Boolean);
  if (parts.length === 0) return `${country} landmark`;
  // Add the country when the subject is ambiguous on its own.
  const q = parts.join(' ');
  return q.length < 12 && country ? `${q} ${country}` : q;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The API rate-limits hard once a burst of searches goes through, and a 429
 * looks exactly like "no results" if it is not handled — which quietly empties
 * the whole shortlist. Space the calls out and back off when told to.
 */
async function search(q, attempt = 0) {
  const url =
    'https://api.shutterstock.com/v2/images/search' +
    `?query=${encodeURIComponent(q)}` +
    '&per_page=3&image_type=photo&orientation=horizontal&ai_generated=false&sort=relevance';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

  if (res.status === 429) {
    if (attempt >= 5) throw new Error('rate limited repeatedly — stopping rather than writing an empty shortlist');
    const wait = 4000 * 2 ** attempt;
    console.log(`    rate limited, waiting ${wait / 1000}s`);
    await sleep(wait);
    return search(q, attempt + 1);
  }
  if (!res.ok) return [];

  const json = await res.json();
  await sleep(700);
  return (json.data ?? []).map((r) => ({
    id: String(r.id),
    description: String(r.description ?? '').slice(0, 120),
    preview: r.assets?.large_thumb?.url || r.assets?.preview?.url || '',
    page: `https://www.shutterstock.com/image-photo/${r.id}`,
  }));
}

/* ------------------------------------------------------------------ */

const { data: trips } = await db
  .from('trips')
  .select('id, slug, title, status, countries(name), subjects(name)')
  .order('slug');
const { data: allDays } = await db
  .from('itinerary_days')
  .select('id, trip_id, sort_order, title, display_title, summary, primary_location, highlights, image_url, description')
  .order('sort_order');

const byTrip = new Map();
for (const d of allDays ?? []) {
  if (!byTrip.has(d.trip_id)) byTrip.set(d.trip_id, []);
  byTrip.get(d.trip_id).push(d);
}

const out = [];
let n = 0;

for (const trip of trips ?? []) {
  if (SKIP.has(trip.slug)) continue;
  const days = (byTrip.get(trip.id) ?? []).filter((d) => d.description?.trim());
  const missing = days.filter((d) => !d.image_url);
  if (missing.length === 0) continue;

  for (const day of missing) {
    const position = days.indexOf(day) + 1;
    /**
     * One search per day, because the API allows only 100 an hour and there
     * are 82 days. Narrow-then-widen tripled the calls and burned the whole
     * window, which comes back as 429 and reads exactly like "no results".
     * Days that find nothing are re-run by --widen in a later window, which
     * is a far shorter list.
     */
    const country = trip.countries?.name ?? '';
    const place = (day.primary_location ?? '').trim();
    const specific = queryFor(day, trip);
    const broad = place && country ? `${place} ${country}` : place || country || `${country} landmark`;

    // On a widening pass, keep whatever the first pass already found.
    const kept = PREVIOUS.get(`${trip.slug}#${position}`);
    const q = kept ? kept.query : WIDEN ? broad : specific;
    const candidates = kept ? kept.candidates : await search(q);
    n++;
    out.push({
      trip: trip.slug,
      tripTitle: trip.title,
      status: trip.status,
      country: trip.countries?.name ?? null,
      day: position,
      dayTitle: day.display_title || day.title || `Day ${position}`,
      place: day.primary_location ?? null,
      query: q,
      candidates,
    });
    console.log(`  ${trip.slug} day ${position}: "${q}" → ${candidates.length} candidates`);
  }
}

mkdirSync('scripts/data', { recursive: true });
writeFileSync('scripts/data/day-image-shortlist.json', JSON.stringify({ generatedAt: new Date().toISOString(), days: out }, null, 2));

/* --- a page to work through --- */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const byTripGroups = new Map();
for (const row of out) {
  if (!byTripGroups.has(row.trip)) byTripGroups.set(row.trip, []);
  byTripGroups.get(row.trip).push(row);
}

const html = `<h1>Day photographs still to license</h1>
<p class="lede">${out.length} days across ${byTripGroups.size} trips. Three candidates each, chosen by searching the day's own place and highlights. Click an image to open it on Shutterstock.</p>
${[...byTripGroups.entries()].map(([slug, rows]) => `
<section>
  <h2>${esc(rows[0].tripTitle)}</h2>
  <p class="meta">${esc(slug)} · ${esc(rows[0].country ?? '')} · ${rows.length} day${rows.length === 1 ? '' : 's'} · ${esc(rows[0].status)}</p>
  ${rows.map((r) => `
  <div class="day">
    <div class="dayhead"><b>Day ${r.day}</b> ${esc(r.dayTitle)}${r.place ? ` <span>${esc(r.place)}</span>` : ''}</div>
    <div class="q">search: <code>${esc(r.query)}</code></div>
    <div class="cands">
      ${r.candidates.map((c) => `<a href="${esc(c.page)}" target="_blank" rel="noreferrer">
        <img src="${esc(c.preview)}" alt="${esc(c.description)}" loading="lazy">
        <span>${esc(c.id)}</span>
      </a>`).join('')}
    </div>
  </div>`).join('')}
</section>`).join('')}`;

writeFileSync('scripts/data/day-image-shortlist.html', html);
console.log(`\n${n} days shortlisted → scripts/data/day-image-shortlist.json + .html`);
