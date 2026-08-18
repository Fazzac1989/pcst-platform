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

async function search(query, { minWidth = 1600, landscapeOnly = false, limit = 24 } = {}) {
  const url =
    `${API}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}&gsrnamespace=6&gsrlimit=${limit}` +
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
      .filter((c) =>
        c && c.mime !== 'image/svg+xml' && c.width >= minWidth &&
        c.licence && FREE.test(c.licence) && !BLOCKED.test(c.licence) &&
        c.ratio <= 3 && c.ratio >= 0.5 && (!landscapeOnly || c.ratio >= 1.2)
      )
      .sort((a, b) => b.width - a.width);
  } catch {
    return [];
  }
}

const ROLES = [
  { role: 'hero', label: 'Hero — the trip at a glance', landscapeOnly: true, minWidth: 2000 },
  { role: 'gallery', label: 'Iconic destination' },
  { role: 'gallery', label: 'Educational experience' },
  { role: 'gallery', label: 'Student experience / activity' },
  { role: 'gallery', label: 'Culture & local life' },
  { role: 'gallery', label: 'Adventure & experience' },
  { role: 'gallery', label: 'Wow — the aspirational shot', landscapeOnly: true },
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
                description: 'Exactly seven searches, one per role, in the order given.',
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
        'architecture. Give seven different subjects; do not repeat one landmark across roles.',
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
    if (Array.isArray(out.queries) && out.queries.length >= 7) {
      return ROLES.map((r, i) => ({ ...r, query: out.queries[i].query }));
    }
  } catch {
    /* fall through */
  }
  return ROLES.map((r) => ({ ...r, query: `${fallbackPlace} landmark` }));
}

/** Rank by fit to the role, using the only signal available: text metadata. */
async function pick(candidates, { label, query }, trip, alreadyUsed) {
  const pool = candidates.filter((c) => !alreadyUsed.has(c.sourceUrl)).slice(0, 8);
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
              index: { type: 'integer', description: 'Zero-based index of the best candidate.' },
              alt_text: { type: 'string', description: 'One sentence, under 120 chars, describing what is visible. No "Photo of".' },
              reason: { type: 'string', description: 'Under 90 characters.' },
            },
            required: ['index', 'alt_text', 'reason'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You are choosing photography for a premium school-travel website. Pick the candidate that best fits the ' +
        'stated role for this specific trip: it must clearly show the right place and the right subject matter. ' +
        'Prefer wide, uncluttered, daylight views of the actual landmark or landscape over close-ups of details, ' +
        'signs, plaques, interiors of unrelated buildings, or images whose description suggests people posing. ' +
        'Reject anything that looks like a diagram, map, reconstruction or artwork of the place rather than a ' +
        'photograph of it. Write British English alt text describing only what the file title and description ' +
        'support — never invent detail.',
      messages: [
        {
          role: 'user',
          content:
            `Trip: ${trip.title}\nSubject: ${trip.subject}\nDestination: ${trip.city ?? trip.country}\n` +
            `Role needed: ${label}\nSearch used: "${query}"\n\nCandidates:\n` +
            pool.map((c, i) =>
              `[${i}] ${c.title}\n     ${c.width}x${c.height}, ${c.licence}\n     ${c.description ?? '(no description)'}`
            ).join('\n'),
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = JSON.parse(block.text);
    const chosen = pool[Math.max(0, Math.min(pool.length - 1, out.index))];
    return { candidate: chosen, altText: out.alt_text?.slice(0, 200) ?? '', reason: out.reason };
  } catch {
    return { candidate: pool[0], altText: '', reason: 'fallback: highest resolution' };
  }
}

const scaled = (title, width) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${width}`;

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

const slugs = process.argv.slice(2);
if (!slugs.length) throw new Error('Pass one or more trip slugs.');

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
  let order = 0;
  for (const plan of await plans(trip)) {
    const candidates = await search(plan.query, {
      minWidth: plan.minWidth ?? 1600,
      landscapeOnly: Boolean(plan.landscapeOnly),
    });
    if (!candidates.length) {
      console.log(`  --  ${plan.label.padEnd(34)} nothing free for "${plan.query}"`);
      continue;
    }
    const chosen = await pick(candidates, plan, trip, used);
    if (!chosen) { console.log(`  --  ${plan.label.padEnd(34)} nothing left`); continue; }
    used.add(chosen.candidate.sourceUrl);
    try {
      const { bytes } = await store(trip, plan.role, chosen, order++);
      console.log(
        `  OK  ${plan.label.padEnd(34)} ${String(chosen.candidate.width).padStart(5)}px ` +
        `${String(Math.round(bytes / 1024)).padStart(4)}KB ${(chosen.candidate.licence ?? '?').padEnd(13)} ` +
        `${(chosen.candidate.photographer ?? 'unknown').slice(0, 22)}`
      );
      console.log(`        alt: ${chosen.altText || '(none drafted)'}`);
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
