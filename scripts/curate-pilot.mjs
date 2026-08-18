/**
 * Populate curated photography for a set of trips.
 *
 *   node scripts/curate-pilot.mjs iceland japan-art-design-technology berlin
 *
 * For each trip it builds seven role-based searches against Wikimedia Commons,
 * asks Claude to pick the best candidate for each role from the file titles and
 * descriptions, then downloads a scaled copy into Supabase storage and records
 * the rights metadata and alt text. Re-running a trip replaces its images.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const UA = { 'User-Agent': 'PremiumChoiceSchoolTrips/1.0 (info@premiumchoicetravel.com)' };
const API = 'https://commons.wikimedia.org/w/api.php';
const BUCKET = 'trip-images';
const FREE = /^(cc0|cc[- ]by([- ]sa)?([- ]\d(\.\d)?)?|public domain|pdm)/i;
const BLOCKED = /(nc|nd|fair use|non[- ]free)/i;
const strip = (s) => (s ? String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null);

async function searchRaw(gsrsearch, limit = 30) {
  const url =
    `${API}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(gsrsearch)}&gsrnamespace=6&gsrlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1200`;
  try {
    const j = await (await fetch(url, { headers: UA })).json();
    return Object.values(j?.query?.pages ?? {})
      .map((p) => {
        const ii = p.imageinfo?.[0];
        if (!ii?.url || !ii.width) return null;
        const m = ii.extmetadata ?? {};
        return {
          title: String(p.title).replace(/^File:/, ''),
          url: ii.url, width: ii.width, height: ii.height, mime: ii.mime,
          ratio: ii.width / ii.height,
          licence: strip(m.LicenseShortName?.value),
          photographer: strip(m.Artist?.value),
          description: strip(m.ImageDescription?.value)?.slice(0, 180) ?? null,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Commons reviewers maintain a Quality images category: technically sound,
 * well-exposed photographs. Search that first for a genuine quality signal,
 * then fall back to the whole archive if it is too thin.
 */
// Commons holds a great deal of art and cartography alongside photography.
// A 19th-century oil painting once became a country hero, so screen the
// obvious cases out before anything reaches the picker.
const ARTWORK = /(painting|portrait of|oil on canvas|engraving|etching|lithograph|woodcut|watercolou?r|drawing|sketch|illustration|diagram|schematic|blueprint|\bmap\b|atlas|poster|coat of arms|banknote|postage stamp|\bcoin\b|logo|emblem|\bflag of\b|scale model|replica of|\b1[0-8]\d\d\b)/i;

async function search(query, { minWidth = 2400, minRatio = 0.5, maxRatio = 3, limit = 30 } = {}) {
  const keep = (list) =>
    list.filter(
      (c) =>
        c.mime !== 'image/svg+xml' &&
        c.width >= minWidth &&
        c.licence && FREE.test(c.licence) && !BLOCKED.test(c.licence) &&
        c.ratio >= minRatio && c.ratio <= maxRatio &&
        !ARTWORK.test(`${c.title} ${c.description ?? ''}`)
    );

  // Search both, but never let the small Quality pool crowd out relevance:
  // the whole archive is where the on-itinerary subjects actually live.
  const [quality, all] = await Promise.all([
    searchRaw(`filetype:bitmap incategory:"Quality images" ${query}`, limit).then(keep),
    searchRaw(`filetype:bitmap ${query}`, limit).then(keep),
  ]);
  const qualityUrls = new Set(quality.map((c) => c.sourceUrl));

  const seen = new Set();
  return [...quality, ...all]
    .filter((c) => (seen.has(c.sourceUrl) ? false : seen.add(c.sourceUrl)))
    .map((c) => ({ ...c, qualityReviewed: qualityUrls.has(c.sourceUrl) }))
    .sort((a, b) => Number(b.qualityReviewed) - Number(a.qualityReviewed) || b.width - a.width);
}

const ROLES = [
  // Heroes crop into a cinematic band, so only genuinely wide sources survive
  // it without looking magnified.
  { role: 'hero', label: 'Hero — the trip at a glance', minWidth: 3000, minRatio: 1.7, maxRatio: 2.6 },
  { role: 'gallery', label: 'Iconic landmark - the postcard shot', minWidth: 2400 },
  { role: 'gallery', label: 'Food - colourful local dishes, markets or street food', minWidth: 2000 },
  { role: 'gallery', label: 'Walking and exploring - streets, old towns, students on foot', minWidth: 2000 },
  { role: 'gallery', label: 'Adventure - the active, outdoor, memorable side', minWidth: 2400 },
  { role: 'gallery', label: 'Culture - festivals, traditions, crafts, performance', minWidth: 2000 },
];

/**
 * Commons indexes named subjects, not moods: "Tsukiji fish market" finds
 * photographs, "market street life" finds nothing. So name the actual places
 * this trip visits, and keep every one of them inside the destination.
 */
async function plans(trip) {
  const fallbackPlace = trip.city?.split(/[·,/]/)[0]?.trim() || trip.country || trip.title;
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1200,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              queries: {
                type: 'array',
                description: 'One search per role, in the order given, and the same number of them.',
                items: {
                  type: 'object',
                  properties: {
                    role_label: { type: 'string' },
                    query: { type: 'string', description: 'Named place or landmark, 2–5 words.' },
                  },
                  required: ['role_label', 'query'],
                  additionalProperties: false,
                },
              },
            },
            required: ['queries'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You write image-search terms for Wikimedia Commons, which indexes named subjects rather than themes. ' +
        'Every query must name a real, specific place, landmark, museum, monument or natural feature that this ' +
        'trip would genuinely visit or that sits in the destination itself. Two to five words, no adjectives ' +
        'like "beautiful" and no mood words like "vibrant street life".\n\n' +
        'Hard rules: never leave the destination. For a city trip, stay in or immediately around that city — ' +
        'never substitute scenery from elsewhere in the country. Match the trip subject: a geography trip wants ' +
        'landforms, a politics trip wants parliaments and memorials, an art trip wants galleries and ' +
        'architecture. Give a different subject for every role; never repeat a landmark across roles.',
      messages: [
        {
          role: 'user',
          content:
            `Trip: ${trip.title}\nSubject: ${trip.subject}\nCountry: ${trip.country}\n` +
            `Cities on the itinerary: ${trip.city ?? '(not stated)'}\n\n` +
            `Roles, in order:\n${ROLES.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = JSON.parse(block.text);
    if (Array.isArray(out.queries) && out.queries.length >= ROLES.length) {
      return ROLES.map((r, i) => ({ ...r, query: out.queries[i].query }));
    }
    throw new Error(`planner returned ${out.queries?.length ?? 0} queries, expected ${ROLES.length}`);
  } catch (e) {
    // A silent fallback here once filled a whole page with one landmark, so
    // make it loud rather than quietly degrading the result.
    console.log(`  !!  query planner failed (${e.message}) — falling back to generic terms`);
  }
  return ROLES.map((r) => ({ ...r, query: `${fallbackPlace} landmark` }));
}

/** Rank by fit to the role, using the only signal available: text metadata. */
async function pick(candidates, { label, query }, trip, alreadyUsed, usedSubjects = []) {
  const pool = candidates.filter((c) => !alreadyUsed.has(c.sourceUrl)).slice(0, 10);
  if (pool.length === 0) return null;
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 900,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              suitable: {
                type: 'boolean',
                description: 'False if none of the candidates is an acceptable photograph for this role.',
              },
              index: { type: 'integer', description: 'Zero-based index of the best candidate.' },
              alt_text: { type: 'string', description: 'One sentence, under 120 chars, describing what is visible. No "Photo of".' },
              reason: { type: 'string', description: 'Under 90 characters.' },
            },
            required: ['suitable', 'index', 'alt_text', 'reason'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You are the photography director for a premium school-travel website. These pictures have to make a ' +
        'teenager want to go and a parent feel confident.\n\n' +
        'Colour and light come first. Strongly prefer images whose title or description indicates bright ' +
        'daylight, blue sky, sunshine, vivid colour, blossom, autumn colour, festival, lanterns, market ' +
        'produce, painted buildings, sunset or clear mountain air. An image that is merely correct but flat, ' +
        'grey, overcast, dim or monochrome should lose to a livelier one every time.\n\n' +
        'Then relevance: it must genuinely show the stated role for this trip.\n\n' +
        'Reject outright: night shots unless the role is explicitly about lights, grey or rainy scenes, ' +
        'close-ups of signs, plaques, statues or architectural details, museum object photographs on plain ' +
        'backgrounds, empty rooms, building sites, scaffolding, and anything that is a map, plan, diagram, ' +
        'painting, engraving or scale model rather than a photograph.\n\n' +
        'Write British English alt text describing only what the title and description support — never invent ' +
        'detail.',
      messages: [
        {
          role: 'user',
          content:
            `Trip: ${trip.title}\nSubject: ${trip.subject}\nDestination: ${trip.city ?? trip.country}\n` +
            `Role needed: ${label}\nSearch used: "${query}"\n` +
            (usedSubjects.length
              ? `\nAlready used on this page — choose a DIFFERENT subject, not another view of these:\n` +
                usedSubjects.map((s) => `  - ${s}`).join('\n') + '\n'
              : '') +
            `\nCandidates:\n` +
            pool.map((c, i) =>
              `[${i}] ${c.title}\n     ${c.width}x${c.height}, ${c.licence}` +
              `${c.qualityReviewed ? ', reviewed as a Commons Quality image' : ''}\n` +
              `     ${c.description ?? '(no description)'}`
            ).join('\n'),
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = JSON.parse(block.text);
    // Leave the slot empty rather than publish something the picker rejected.
    if (out.suitable === false) return null;
    const chosen = pool[Math.max(0, Math.min(pool.length - 1, out.index))];
    return { candidate: chosen, altText: out.alt_text?.slice(0, 200) ?? '', reason: out.reason };
  } catch {
    return { candidate: pool[0], altText: '', reason: 'fallback: highest resolution' };
  }
}

const scaled = (title, width) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${width}`;

/**
 * Commons matches every word, so a long phrase often finds nothing while a
 * shorter one finds plenty. Try the specific phrase first, then broaden.
 */
function queryVariants(query, placeName) {
  const words = query.trim().split(/\s+/);
  const out = [query];
  for (let n = words.length - 1; n >= 2; n--) out.push(words.slice(0, n).join(' '));
  const proper = words.filter((w) => /^[A-ZÞÐÁÉÍÓÚÖÆ]/.test(w));
  if (proper.length >= 2) out.push(proper.slice(0, 3).join(' '));
  out.push(`${placeName} ${words[words.length - 1]}`);
  return [...new Set(out)];
}

async function findCandidates(query, plan, placeName) {
  const constraints = [
    { minWidth: plan.minWidth ?? 2400, minRatio: plan.minRatio ?? 0.5, maxRatio: plan.maxRatio ?? 3 },
    { minWidth: Math.round((plan.minWidth ?? 2400) * 0.8), minRatio: (plan.minRatio ?? 0.5) - 0.2, maxRatio: (plan.maxRatio ?? 3) + 0.3 },
    { minWidth: 1800 },
  ];
  for (const q of queryVariants(query, placeName)) {
    for (const opts of constraints) {
      const found = await search(q, opts);
      if (found.length) return { candidates: found, usedQuery: q };
    }
  }
  return { candidates: [], usedQuery: query };
}

async function store(trip, role, chosen, sortOrder) {
  const { candidate, altText } = chosen;
  const targetWidth = role === 'hero' ? 2600 : 1800;
  const res = await fetch(scaled(candidate.title, targetWidth), { headers: UA });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());

  const ext = candidate.mime === 'image/png' ? 'png' : 'jpg';
  const path = `curated/${trip.slug}/${role}-${Date.now()}-${sortOrder}.${ext}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: candidate.mime === 'image/png' ? 'image/png' : 'image/jpeg',
    cacheControl: '31536000',
  });
  if (upErr) throw new Error(upErr.message);
  const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error } = await db.from('trip_images').insert({
    trip_id: trip.id, role, url, alt_text: altText,
    caption: candidate.description?.slice(0, 160) ?? null,
    width: candidate.width, height: candidate.height, bytes: bytes.length,
    source: 'Wikimedia Commons', source_url: candidate.sourceUrl,
    photographer: candidate.photographer, licence: candidate.licence,
    attribution_required: !/^(cc0|public domain|pdm)/i.test(candidate.licence ?? ''),
    downloaded_at: new Date().toISOString(), sort_order: sortOrder, approved: true,
  });
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return { bytes: bytes.length };
}

/* ---------- run ---------- */

const args = process.argv.slice(2);
let slugs = args.filter((a) => !a.startsWith('--'));

if (args.includes('--all')) {
  // Published trips only, and skip any already repopulated unless --force.
  const { data: published } = await db
    .from('trips')
    .select('id, slug, title')
    .eq('status', 'published')
    .order('title');
  const { data: done } = await db.from('trip_images').select('trip_id');
  const doneIds = new Set((done ?? []).map((d) => d.trip_id));
  const pool = args.includes('--force')
    ? (published ?? [])
    : (published ?? []).filter((t) => !doneIds.has(t.id));
  slugs = pool.map((t) => t.slug);
  console.log(`${slugs.length} trips to process (${published?.length ?? 0} published, ${doneIds.size} already done)`);
}

if (!slugs.length) throw new Error('Pass one or more trip slugs, or --all');

for (const slug of slugs) {
  const { data: row } = await db
    .from('trips')
    .select('id, slug, title, city, status, subjects(name), countries(name)')
    .eq('slug', slug)
    .maybeSingle();
  if (!row) { console.log(`\n!! ${slug} — not found`); continue; }

  const trip = {
    id: row.id, slug: row.slug, title: row.title, city: row.city, status: row.status,
    subject: row.subjects?.name ?? null, country: row.countries?.name ?? null,
  };

  console.log(`\n${'='.repeat(70)}\n${trip.title}\n  ${trip.subject} · ${trip.country} · ${trip.city ?? '—'} · ${trip.status}`);

  // Clear any previous run so this is repeatable.
  const { data: old } = await db.from('trip_images').select('url').eq('trip_id', trip.id);
  for (const o of old ?? []) {
    const p = o.url?.split(`/${BUCKET}/`)[1];
    if (p) await db.storage.from(BUCKET).remove([decodeURIComponent(p)]);
  }
  await db.from('trip_images').delete().eq('trip_id', trip.id);

  const used = new Set();
  const usedSubjects = [];
  let order = 0;
  for (const plan of await plans(trip)) {
    // Broaden the wording and loosen the constraints rather than leave a gap.
    const place = trip.city?.split(/[·,/]/)[0]?.trim() || trip.country || trip.title;
    const { candidates, usedQuery } = await findCandidates(plan.query, plan, place);
    if (!candidates.length) {
      console.log(`  --  ${plan.label.padEnd(34)} nothing free for "${plan.query}"`);
      continue;
    }
    const chosen = await pick(candidates, plan, trip, used, usedSubjects);
    if (!chosen) {
      console.log(`  --  ${plan.label.padEnd(34)} no acceptable photograph among the candidates`);
      continue;
    }
    used.add(chosen.candidate.sourceUrl);
    usedSubjects.push(chosen.candidate.title.replace(/\.(jpg|jpeg|png)$/i, '').slice(0, 70));
    try {
      const { bytes } = await store(trip, plan.role, chosen, order++);
      console.log(
        `  OK  ${plan.label.padEnd(34)} ${String(chosen.candidate.width).padStart(5)}px ` +
        `r${chosen.candidate.ratio.toFixed(2)} ${String(Math.round(bytes / 1024)).padStart(4)}KB ` +
        `${(chosen.candidate.licence ?? '?').padEnd(13)} ${(chosen.candidate.photographer ?? 'unknown').slice(0, 20)}` +
        `${chosen.candidate.qualityReviewed ? ' [QI]' : ''}`
      );
      console.log(`        q: "${usedQuery}"  |  alt: ${chosen.altText || '(none drafted)'}`);
    } catch (e) {
      console.log(`  !!  ${plan.label.padEnd(34)} ${e.message}`);
    }
  }

  const { data: final } = await db.from('trip_images').select('role, alt_text').eq('trip_id', trip.id);
  const heroes = (final ?? []).filter((f) => f.role === 'hero').length;
  const galleries = (final ?? []).filter((f) => f.role === 'gallery').length;
  const noAlt = (final ?? []).filter((f) => !f.alt_text?.trim()).length;
  console.log(`  => ${heroes} hero, ${galleries} gallery, ${noAlt} without alt text  →  /trips/${trip.slug}`);
}
