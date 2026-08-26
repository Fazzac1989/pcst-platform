/**
 * Fill the last imageless itinerary days from Wikimedia Commons.
 *
 *   node scripts/fill-days-from-commons.mjs            → dry run: resolve every
 *       entry, print the picks, write a contact sheet to review
 *   node scripts/fill-days-from-commons.mjs --apply    → download, upload to
 *       storage, write image_url/image_alt, record the credits
 *
 * These are the days the business owns no photograph of — Disney parks, the
 * DMZ, Bali's volcano and reefs, the Empty Quarter and the rest — and the
 * Shutterstock account cannot license anything, so the pictures come from
 * Commons under free licences instead. The plan in
 * scripts/data/commons-day-plan.json names each day's subject and search
 * queries; this script asks the Commons API for candidates and accepts only
 * photographs under CC0, public domain, CC BY or CC BY-SA, large enough
 * (≥1100px wide) and landscape enough (1.05–2.4) to work as a day thumbnail.
 *
 * The dry run writes scripts/data/commons-day-choices.json and a contact
 * sheet at scripts/data/commons-day-preview.html. Review the sheet; to
 * override a pick, put the exact "File:..." title into that entry's "prefer"
 * list in the plan and re-run. --apply uses the recorded choices (so what was
 * previewed is what is applied), mirrors each file into the trip-images
 * bucket under commons-fill/days/, and writes only days that still have no
 * image — a choice made in the admin is never overwritten. Every applied
 * image's author, licence and source page land in
 * scripts/data/commons-day-credits.json, which is the attribution record the
 * licences require us to keep.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  return i > -1 ? process.argv[i + 1] : null;
})();

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'PCST-platform day-image fill (contact: info@premiumchoicetravel.com)';
const BUCKET = 'trip-images';
const PLAN_PATH = 'scripts/data/commons-day-plan.json';
const CHOICES_PATH = 'scripts/data/commons-day-choices.json';
const CREDITS_PATH = 'scripts/data/commons-day-credits.json';
const PREVIEW_PATH = 'scripts/data/commons-day-preview.html';

/** Free licences only. Anything else — including CC BY-NC and "fair use" — is refused. */
const LICENSE_OK = /^(pd|public domain|cc0|cc[- ]by(?:[- ]sa)?)\b/i;
/** Files that are pictures OF something else — maps, crests, montages — never make good day photographs. */
const TITLE_BAD = /\b(map|logo|flag|coat[ _]of[ _]arms|seal|diagram|chart|floor[ _]?plan|poster|stamp|banknote|coin|screenshot|montage|collage|locator)\b/i;

const read = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));
const plan = read(PLAN_PATH).entries.filter((e) => !ONLY || e.trip === ONLY);

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

const IIPROPS = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600' };

function candidateFrom(page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  const meta = ii.extmetadata ?? {};
  const license = meta.License?.value ?? meta.LicenseShortName?.value ?? '';
  const strip = (html) => (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return {
    title: page.title,
    pageUrl: ii.descriptionurl,
    // iiurlwidth gives a 1600px thumbnail; originals can run to 100MB scans.
    downloadUrl: ii.thumburl ?? ii.url,
    width: ii.width,
    height: ii.height,
    mime: ii.mime,
    license,
    licenseShort: strip(meta.LicenseShortName?.value) || license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    author: strip(meta.Artist?.value) || 'unknown',
    assessed: /featured|quality|valued/i.test(meta.Assessments?.value ?? ''),
  };
}

function acceptable(c) {
  if (!c) return false;
  if (c.mime !== 'image/jpeg') return false;
  if (!LICENSE_OK.test(c.license) && !LICENSE_OK.test(c.licenseShort)) return false;
  if (TITLE_BAD.test(c.title)) return false;
  if (c.width < 1100) return false;
  const aspect = c.width / c.height;
  return aspect >= 1.05 && aspect <= 2.4;
}

async function byTitles(titles) {
  if (!titles.length) return [];
  const data = await api({ action: 'query', titles: titles.join('|'), ...IIPROPS });
  return Object.values(data.query?.pages ?? {}).map(candidateFrom);
}

async function bySearch(query) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: '20',
    ...IIPROPS,
  });
  const pages = Object.values(data.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  return pages.map(candidateFrom);
}

/**
 * A pinned "prefer" title that checks out always wins. Otherwise the queries
 * run in the plan's order, and within a query the search ranking mostly
 * stands — a community-assessed photograph (featured/quality/valued) is the
 * one exception, pulled to the front because those are vetted pictures.
 */
async function resolve(entry) {
  const preferred = (await byTitles(entry.prefer ?? [])).filter(acceptable);
  if (preferred.length) return { pick: preferred[0], runnersUp: [] };
  for (const q of entry.queries) {
    const ok = (await bySearch(q)).filter(acceptable);
    if (!ok.length) continue;
    ok.sort((a, b) => Number(b.assessed) - Number(a.assessed));
    return { pick: ok[0], runnersUp: ok.slice(1, 4) };
  }
  return null;
}

/* --- resolve every entry ------------------------------------------------ */

let choices;
if (APPLY && existsSync(CHOICES_PATH)) {
  // Apply what the dry run previewed, not a fresh search that might differ.
  choices = read(CHOICES_PATH);
  console.log(`using recorded choices from ${CHOICES_PATH}`);
} else {
  choices = [];
  for (const entry of plan) {
    const resolved = await resolve(entry);
    if (!resolved) {
      choices.push({ trip: entry.trip, day: entry.day, subject: entry.subject, pick: null });
      console.log(`  NOTHING FOUND  ${entry.trip} day ${entry.day} — ${entry.subject}`);
      continue;
    }
    choices.push({ trip: entry.trip, day: entry.day, subject: entry.subject, alt: entry.alt, ...resolved });
    console.log(`  ${entry.trip} day ${entry.day}`);
    console.log(`      ${resolved.pick.title}  [${resolved.pick.licenseShort}] ${resolved.pick.width}×${resolved.pick.height}`);
  }
}

const found = choices.filter((c) => c.pick);
const gaps = choices.filter((c) => !c.pick);

if (!APPLY) {
  writeFileSync(CHOICES_PATH, JSON.stringify(choices, null, 2));
  const card = (c) => `
    <div class="card">
      <img src="${c.pick.downloadUrl}" loading="lazy" alt="">
      <p><b>${c.trip} — day ${c.day}</b><br>${c.subject}</p>
      <p class="meta"><a href="${c.pick.pageUrl}">${c.pick.title.replace('File:', '')}</a><br>
      ${c.pick.licenseShort} · ${c.pick.author} · ${c.pick.width}×${c.pick.height}</p>
      ${(c.runnersUp ?? []).length ? `<p class="meta">also considered: ${c.runnersUp.map((r) => `<a href="${r.pageUrl}">${r.title.replace('File:', '')}</a>`).join(' · ')}</p>` : ''}
    </div>`;
  writeFileSync(
    PREVIEW_PATH,
    `<!doctype html><meta charset="utf-8"><title>Commons day-image choices</title>
<style>body{font:14px/1.5 system-ui;margin:24px;background:#f6f5f2}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px}
.card{background:#fff;border:1px solid #ddd;border-radius:6px;padding:12px}
.card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:4px}
.meta{color:#666;font-size:12px}</style>
<h1>Commons choices — ${found.length} of ${choices.length} days</h1>
<p>To override a pick, add the exact File: title to that entry's "prefer" list in commons-day-plan.json and re-run the dry run.</p>
<div class="grid">${found.map(card).join('')}</div>
${gaps.length ? `<h2>Nothing acceptable found</h2><ul>${gaps.map((g) => `<li>${g.trip} day ${g.day} — ${g.subject}</li>`).join('')}</ul>` : ''}`
  );
  console.log(`\n${found.length} of ${choices.length} days resolved.`);
  console.log(`Contact sheet: ${PREVIEW_PATH}`);
  console.log('Dry run. Review the sheet, then re-run with --apply to write.');
  process.exit(0);
}

/* --- apply -------------------------------------------------------------- */

const db = createClient(
  process.env.PCST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
if (!(process.env.PCST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('No service role key in .env.local — cannot write.');
  process.exit(1);
}

const { data: trips } = await db.from('trips').select('id, slug, title');
const { data: allDays } = await db
  .from('itinerary_days')
  .select('id, trip_id, sort_order, image_url, description')
  .order('sort_order');
const daysByTrip = new Map();
for (const d of allDays ?? []) {
  if (!daysByTrip.has(d.trip_id)) daysByTrip.set(d.trip_id, []);
  daysByTrip.get(d.trip_id).push(d);
}

const credits = existsSync(CREDITS_PATH) ? read(CREDITS_PATH) : [];
let done = 0;
const problems = [];

for (const c of found) {
  const trip = trips?.find((t) => t.slug === c.trip);
  if (!trip) {
    problems.push(`${c.trip}: no such trip`);
    continue;
  }
  // Day numbering matches the report and the pool plan: rows with a
  // description, in sort order, counted from 1.
  const rows = (daysByTrip.get(trip.id) ?? []).filter((d) => d.description?.trim());
  const row = rows[c.day - 1];
  if (!row) {
    problems.push(`${c.trip} day ${c.day}: no such day`);
    continue;
  }
  if (row.image_url) {
    problems.push(`${c.trip} day ${c.day}: already has an image — skipped`);
    continue;
  }

  try {
    const res = await fetch(c.pick.downloadUrl, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    const path = `commons-fill/days/${c.trip}/day${String(c.day).padStart(2, '0')}.jpg`;
    const { error: upErr } = await db.storage.from(BUCKET).upload(path, body, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    });
    if (upErr) throw new Error(`upload ${upErr.message}`);
    const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const { error } = await db
      .from('itinerary_days')
      .update({ image_url: url, image_alt: c.alt })
      .eq('id', row.id);
    if (error) throw new Error(error.message);

    credits.push({
      trip: c.trip,
      day: c.day,
      storagePath: path,
      file: c.pick.title,
      source: c.pick.pageUrl,
      author: c.pick.author,
      license: c.pick.licenseShort,
      licenseUrl: c.pick.licenseUrl,
    });
    done++;
    console.log(`  set ${c.trip} day ${c.day} ← ${c.pick.title}`);
  } catch (e) {
    problems.push(`${c.trip} day ${c.day}: ${e.message}`);
  }
}

writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2));
console.log(`\n${done} day image${done === 1 ? '' : 's'} set; credits recorded in ${CREDITS_PATH}`);
if (gaps.length) console.log(`${gaps.length} day(s) had no acceptable Commons match — see the dry-run output.`);
if (problems.length) {
  console.log('problems:');
  for (const p of problems) console.log(`  ${p}`);
}
console.log('\nRemember: node scripts/revalidate-all.mjs so the pages pick the images up.');
