/**
 * Seed the Finland Winter Activity Adventure proposal from the reference file.
 *
 * The reference (reference/finland-proposal.html) is the design target for the
 * whole Brochure Studio, and it is also the only place this trip's content
 * exists. Parsing it rather than retyping it means the seeded proposal is the
 * reference — same words, same timetable, same terms — so the renderer can be
 * compared against it honestly.
 *
 * Idempotent: re-running replaces the proposal and its children rather than
 * creating a second copy. Images are content-addressed by their position in
 * the document, so a re-run overwrites rather than duplicating in Storage.
 *
 * Usage: npx tsx scripts/seed-finland-proposal.ts [--dry]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const dry = process.argv.includes('--dry');

const SLUG = 'finland-winter-activity-adventure';
const BUCKET = 'brochure-images';
const REFERENCE = 'reference/finland-proposal.html';

/* ────────────────────────────── parsing ────────────────────────────── */

// reference/ is gitignored — it holds large local-only design files — so the
// script says what is missing rather than failing on an unhelpful ENOENT.
if (!existsSync(REFERENCE)) {
  throw new Error(
    `${REFERENCE} is missing. It is not committed (reference/ is gitignored); ` +
      'copy the Finland proposal HTML there before seeding.',
  );
}

const html = readFileSync(REFERENCE, 'utf8');

/** Collapse whitespace and decode the handful of entities the file uses. */
function text(s: string) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep <b> — the timetable and flight rows use it for venues and codes. */
function richText(s: string) {
  return s
    .replace(/<(?!\/?b\b)[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

function section(id: string) {
  const start = html.indexOf(`id="${id}"`);
  if (start < 0) return '';
  // Sections are siblings; the next one begins at the following id= anchor.
  const next = html.indexOf('<section', start + 10);
  return html.slice(start, next < 0 ? html.length : next);
}

function all(re: RegExp, source: string) {
  return Array.from(source.matchAll(re));
}

/** Every data: URI in document order — days and cards reference these by index. */
const dataUris = all(/data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)/g, html).map((m) => ({
  mime: `image/${m[1]}`,
  ext: m[1] === 'jpeg' ? 'jpg' : m[1],
  base64: m[2],
}));

/** An <img> in document order, so an alt can be paired with its data URI. */
const imgTags = all(/<img[^>]*src="data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, html).map(
  (m, i) => ({
    index: i,
    alt: (m[0].match(/alt="([^"]*)"/) ?? ['', ''])[1],
  }),
);

function parseDays() {
  const days = all(/<article class="day[^"]*" data-day="(\d+)"[\s\S]*?<\/article>/g, html);
  return days.map((m) => {
    const block = m[0];
    const dayNumber = Number(m[1]) + 1;

    const photos = all(/<img[^>]*alt="([^"]*)"[^>]*>/g, block).map((p) => p[1]);
    const dateLine = text((block.match(/<p class="date">([\s\S]*?)<\/p>/) ?? ['', ''])[1]);
    const title = text((block.match(/<h3>([\s\S]*?)<\/h3>/) ?? ['', ''])[1]);
    const summary = text((block.match(/<p class="summary">([\s\S]*?)<\/p>/) ?? ['', ''])[1]);
    const overnight = text((block.match(/<div class="base">([\s\S]*?)<\/div>/) ?? ['', ''])[1]).replace(
      /^Overnight\s*/,
      '',
    );

    const items = all(/<li><time>([\s\S]*?)<\/time><span>([\s\S]*?)<\/span><\/li>/g, block).map(
      (it, i) => ({
        timeLabel: text(it[1]),
        text: richText(it[2]),
        sortOrder: i,
      }),
    );

    return { dayNumber, dateLine, title, summary, overnight, photos, items };
  });
}

function parseFlights() {
  const block = section('flights');
  const rows = all(
    /<div class="row" role="row"><span class="fl">([\s\S]*?)<\/span><span class="leg">([\s\S]*?)<\/span><span class="t">([\s\S]*?)<\/span><span class="t arr">([\s\S]*?)<\/span><span class="stat">([\s\S]*?)<\/span><\/div>/g,
    block,
  );
  // Group headings mark where the return leg starts.
  const outboundEnd = block.indexOf('Return');
  return rows.map((m, i) => {
    const leg = m[2];
    const route = text((leg.match(/<b>([\s\S]*?)<\/b>/) ?? ['', ''])[1]);
    const note = text((leg.match(/<small>([\s\S]*?)<\/small>/) ?? ['', ''])[1]);
    const [fromName, toName] = route.split('→').map((p) => p.trim());
    const depart = m[3];
    const arrive = m[4];
    return {
      flightNumber: text(m[1]),
      carrier: 'Finnair',
      fromName,
      toName,
      fromCode: text((depart.match(/<small>([\s\S]*?)<\/small>/) ?? ['', ''])[1]),
      toCode: text((arrive.match(/<small>([\s\S]*?)<\/small>/) ?? ['', ''])[1]),
      departLabel: text(depart.replace(/<small>[\s\S]*?<\/small>/, '')),
      arriveLabel: text(arrive.replace(/<small>[\s\S]*?<\/small>/, '')),
      cabin: text(m[5]),
      note,
      direction: (outboundEnd >= 0 && m.index! > outboundEnd ? 'return' : 'outbound') as
        | 'outbound'
        | 'return',
      sortOrder: i,
    };
  });
}

function parseTerms() {
  const block = section('terms');
  return all(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<div class="body">([\s\S]*?)<\/div>/g, block).map(
    (m) => ({
      heading: text(m[1]),
      // Paragraphs and lists are kept; the renderer trusts this HTML because
      // it comes from our own reference file, not from user input.
      bodyHtml: m[2].replace(/\s+/g, ' ').trim(),
    }),
  );
}

function parseGlance() {
  const block = html.slice(html.indexOf('class="glance"'), html.indexOf('id="overview"'));
  return all(/<div><b>([\s\S]*?)<\/b><small>([\s\S]*?)<\/small><\/div>/g, block).map((m) => ({
    value: text(m[1]),
    label: text(m[2]),
  }));
}

function parseExperiences() {
  const block = section('experiences');
  return all(
    /<figcaption><b>([\s\S]*?)<\/b><small>([\s\S]*?)<\/small><\/figcaption>/g,
    block,
  ).map((m) => ({ title: text(m[1]), caption: text(m[2]) }));
}

/** The two lists sit in .inc and .exc inside the price section. */
function parseList(cls: 'inc' | 'exc') {
  const block = section('price');
  const start = block.indexOf(`class="${cls}"`);
  if (start < 0) return [];
  const end = block.indexOf('</ul>', start);
  return all(/<li>([\s\S]*?)<\/li>/g, block.slice(start, end))
    .map((m) => text(m[1]))
    .filter(Boolean);
}

/* ────────────────────────────── seeding ────────────────────────────── */

async function uploadImages() {
  const ids: number[] = [];
  // Clear this seed's previous image rows so a re-run replaces rather than
  // accumulates. Storage objects are content-addressed and overwritten in
  // place, so only the rows need removing.
  await db.from('brochure_images').delete().contains('tags', ['finland']);

  for (let i = 0; i < dataUris.length; i++) {
    const { base64, ext, mime } = dataUris[i];
    const buffer = Buffer.from(base64, 'base64');
    // Content-addressed so a re-run overwrites the same object.
    const digest = createHash('sha1').update(buffer).digest('hex').slice(0, 12);
    const path = `finland/${String(i).padStart(2, '0')}-${digest}.${ext}`;

    if (!dry) {
      const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: '31536000',
      });
      if (error) throw new Error(`upload ${path}: ${error.message}`);

      const { data: row, error: rowError } = await db
        .from('brochure_images')
        .insert({ storage_path: path, alt: imgTags[i]?.alt ?? '', tags: ['finland'] })
        .select('id')
        .single();
      if (rowError) throw new Error(`image row ${path}: ${rowError.message}`);
      ids.push(row.id);
    } else {
      ids.push(-1);
    }
  }
  return ids;
}

async function main() {
  const days = parseDays();
  const flights = parseFlights();
  const terms = parseTerms();
  const glance = parseGlance();
  const experiences = parseExperiences();
  const inclusions = parseList('inc');
  const exclusions = parseList('exc');

  console.log('── parsed from the reference ──');
  console.log(`days          : ${days.length}`);
  console.log(`timetable rows: ${days.reduce((n, d) => n + d.items.length, 0)}`);
  console.log(`flights       : ${flights.length} (${flights.filter((f) => f.direction === 'return').length} return)`);
  console.log(`terms sections: ${terms.length}`);
  console.log(`experiences   : ${experiences.length}`);
  console.log(`glance stats  : ${glance.length}`);
  console.log(`inclusions    : ${inclusions.length} · exclusions: ${exclusions.length}`);
  console.log(`images        : ${dataUris.length}`);

  if (dry) {
    console.log('\nDry run — nothing written.');
    console.log('\nDay 1 sample:', JSON.stringify(days[0], null, 1).slice(0, 700));
    return;
  }

  const imageIds = await uploadImages();
  console.log(`\nuploaded ${imageIds.length} images to ${BUCKET}`);

  // Replace any previous seed rather than adding a second copy.
  const { data: existing } = await db.from('brochures').select('id').eq('slug', SLUG).maybeSingle();
  if (existing) await db.from('brochures').delete().eq('id', existing.id);

  const priceStat = glance.find((g) => /per student/i.test(g.label));
  const price = Number((priceStat?.value ?? '').replace(/[^0-9.]/g, '')) || null;
  const studentStat = glance.find((g) => /basis for pricing/i.test(g.label));

  const { data: brochure, error } = await db
    .from('brochures')
    .insert({
      slug: SLUG,
      kind: 'proposal',
      status: 'draft',
      title: 'Finland Winter Activity Adventure',
      subtitle: 'Six days in Helsinki and Finnish Lapland',
      prepared_for: 'Your school',
      price_per_student: price,
      currency: 'AED',
      price_basis_note: studentStat?.label ?? null,
      student_count: Number((studentStat?.value ?? '').replace(/[^0-9]/g, '')) || null,
      free_places_teachers: 2,
      free_places_pct_staff: 1,
      hero_effect: true,
      travel_start: '2026-01-18',
      travel_end: '2026-01-23',
    })
    .select('id')
    .single();
  if (error || !brochure) throw new Error(`brochure: ${error?.message}`);

  // Terms: one versioned set, marked default so new proposals inherit it.
  const { data: termsSet, error: termsError } = await db
    .from('brochure_terms_sets')
    .insert({
      name: 'Premium Choice Travel — service levels and booking conditions',
      version: 1,
      sections: terms,
      is_default: true,
      effective_from: '2026-01-01',
    })
    .select('id')
    .single();
  if (termsError) throw new Error(`terms: ${termsError.message}`);
  await db.from('brochures').update({ terms_set_id: termsSet.id }).eq('id', brochure.id);

  // Days, with three photographs each taken in document order.
  let photoCursor = 0;
  for (const day of days) {
    const dayImages = imageIds.slice(photoCursor, photoCursor + day.photos.length);
    photoCursor += day.photos.length;

    const { data: dayRow, error: dayError } = await db
      .from('brochure_days')
      .insert({
        brochure_id: brochure.id,
        day_number: day.dayNumber,
        title: day.title,
        summary: day.summary,
        overnight: day.overnight,
        image_ids: dayImages,
        sort_order: day.dayNumber - 1,
      })
      .select('id')
      .single();
    if (dayError) throw new Error(`day ${day.dayNumber}: ${dayError.message}`);

    if (day.items.length) {
      const { error: itemError } = await db.from('brochure_day_items').insert(
        day.items.map((it) => ({
          day_id: dayRow.id,
          time_label: it.timeLabel,
          text: it.text,
          sort_order: it.sortOrder,
        })),
      );
      if (itemError) throw new Error(`day ${day.dayNumber} items: ${itemError.message}`);
    }
  }

  if (flights.length) {
    const { error: flightError } = await db.from('brochure_flights').insert(
      flights.map((f) => ({
        brochure_id: brochure.id,
        direction: f.direction,
        flight_number: f.flightNumber,
        carrier: f.carrier,
        from_code: f.fromCode,
        from_name: f.fromName,
        to_code: f.toCode,
        to_name: f.toName,
        // Times in the reference are labels ("00:35", "Check-in 21:30") rather
        // than timestamps, so they are kept as the note and rendered verbatim.
        note: [f.departLabel && `Departs ${f.departLabel}`, f.arriveLabel && `Arrives ${f.arriveLabel}`, f.note, f.cabin]
          .filter(Boolean)
          .join(' · '),
        sort_order: f.sortOrder,
      })),
    );
    if (flightError) throw new Error(`flights: ${flightError.message}`);
  }

  await db.from('proposal_events').insert({
    brochure_id: brochure.id,
    event: 'created',
    metadata: { source: 'seed', reference: REFERENCE },
  });

  console.log(`\n✓ seeded brochure ${brochure.id} (${SLUG})`);
  console.log(`  ${days.length} days · ${days.reduce((n, d) => n + d.items.length, 0)} timetable rows`);
  console.log(`  ${flights.length} flights · ${terms.length} terms sections · ${imageIds.length} images`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
