/**
 * Where day photographs still stand.
 *
 *   node scripts/day-image-report.mjs
 *
 * Lists every published day that has no photograph, with the day's own
 * subject, so it is clear what each gap actually needs.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const { data: trips } = await db
  .from('trips')
  .select('id, slug, title, status, countries(name)')
  .order('title');
const { data: days } = await db
  .from('itinerary_days')
  .select('trip_id, sort_order, title, display_title, primary_location, highlights, image_url, description')
  .order('sort_order');

const byTrip = new Map();
for (const d of days ?? []) {
  if (!byTrip.has(d.trip_id)) byTrip.set(d.trip_id, []);
  byTrip.get(d.trip_id).push(d);
}

let total = 0;
let covered = 0;
const gaps = [];

for (const t of trips ?? []) {
  if (t.status !== 'published') continue;
  const rows = (byTrip.get(t.id) ?? []).filter((d) => d.description?.trim());
  total += rows.length;
  covered += rows.filter((d) => d.image_url).length;
  const missing = rows
    .map((d, i) => ({ n: i + 1, d }))
    .filter((x) => !x.d.image_url);
  if (missing.length) gaps.push({ t, rows, missing });
}

for (const { t, rows, missing } of gaps) {
  console.log(`\n${t.title}  (${t.countries?.name ?? '?'}) — ${missing.length} of ${rows.length} days`);
  for (const { n, d } of missing) {
    const hl = (Array.isArray(d.highlights) ? d.highlights : [])
      .map((h) => h?.name ?? h)
      .filter(Boolean)
      .slice(0, 3)
      .join('; ');
    console.log(`   day ${n}: ${d.display_title || d.title}${hl ? ` — ${hl}` : ''}`);
  }
}

console.log(
  `\n${covered} of ${total} published days have a photograph (${Math.round((covered / total) * 100)}%). ` +
    `${total - covered} left across ${gaps.length} trips.`
);
