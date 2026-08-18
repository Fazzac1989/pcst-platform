/**
 * Build a country master page: its editorial content and its own photography.
 *
 *   node scripts/curate-country.mjs japan iceland
 *   node scripts/curate-country.mjs --all
 *
 * Content is drafted by Claude against the subjects that country actually
 * carries; the climate summary is grounded in measured Open-Meteo records for
 * the capital rather than invented. Photography comes from Wikimedia Commons
 * under free licences, with the rights metadata recorded.
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

/* ---------------- photography ---------------- */

async function searchRaw(gsrsearch, limit = 30) {
  const url =
    `${API}?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(gsrsearch)}&gsrnamespace=6&gsrlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata|mime`;
  try {
    const j = await (await fetch(url, { headers: UA })).json();
    return Object.values(j?.query?.pages ?? {})
      .map((p) => {
        const ii = p.imageinfo?.[0];
        if (!ii?.url || !ii.width) return null;
        const m = ii.extmetadata ?? {};
        return {
          title: String(p.title).replace(/^File:/, ''),
          width: ii.width, height: ii.height, mime: ii.mime,
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

// Commons holds a great deal of art and cartography alongside photography.
// A 19th-century oil painting once became a country hero, so screen the
// obvious cases out before anything reaches the picker.
const ARTWORK = /(painting|portrait of|oil on canvas|engraving|etching|lithograph|woodcut|watercolou?r|drawing|sketch|illustration|diagram|schematic|blueprint|\bmap\b|atlas|poster|coat of arms|banknote|postage stamp|\bcoin\b|logo|emblem|\bflag of\b|scale model|replica of|\b1[0-8]\d\d\b)/i;

async function search(query, { minWidth = 2400, minRatio = 0.5, maxRatio = 3 } = {}) {
  const keep = (l) =>
    l.filter(
      (c) =>
        c.mime !== 'image/svg+xml' && c.width >= minWidth &&
        c.licence && FREE.test(c.licence) && !BLOCKED.test(c.licence) &&
        c.ratio >= minRatio && c.ratio <= maxRatio &&
        !ARTWORK.test(`${c.title} ${c.description ?? ''}`)
    );
  const [quality, all] = await Promise.all([
    searchRaw(`filetype:bitmap incategory:"Quality images" ${query}`).then(keep),
    searchRaw(`filetype:bitmap ${query}`).then(keep),
  ]);
  const qUrls = new Set(quality.map((c) => c.sourceUrl));
  const seen = new Set();
  return [...quality, ...all]
    .filter((c) => (seen.has(c.sourceUrl) ? false : seen.add(c.sourceUrl)))
    .map((c) => ({ ...c, qualityReviewed: qUrls.has(c.sourceUrl) }))
    .sort((a, b) => Number(b.qualityReviewed) - Number(a.qualityReviewed) || b.width - a.width);
}

const ROLES = [
  { role: 'hero', label: 'Hero — the country at a glance', minWidth: 3000, minRatio: 1.7, maxRatio: 2.6 },
  { role: 'gallery', label: 'Iconic landmark — the postcard shot' },
  { role: 'gallery', label: 'Food — colourful local dishes, markets or street food' },
  { role: 'gallery', label: 'Walking and exploring — streets, old towns, students on foot' },
  { role: 'gallery', label: 'Adventure — the active, outdoor, memorable side' },
  { role: 'gallery', label: 'Culture — festivals, traditions, crafts, performance' },
];

const scaled = (title, w) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${w}`;

/**
 * Commons matches all the words in a query, so a four-word phrase like
 * "Bushwalking Blue Mountains Three Sisters" often finds nothing while
 * "Blue Mountains" finds plenty. Try the specific phrase, then broaden.
 */
function queryVariants(query, countryName) {
  const words = query.trim().split(/\s+/);
  const out = [query];
  for (let n = words.length - 1; n >= 2; n--) out.push(words.slice(0, n).join(' '));
  // Proper nouns usually carry the subject, so try those alone.
  const proper = words.filter((w) => /^[A-ZÞÐÁÉÍÓÚÖÆ]/.test(w));
  if (proper.length >= 2) out.push(proper.slice(0, 3).join(' '));
  out.push(`${countryName} ${words[words.length - 1]}`);
  return [...new Set(out)];
}

/** Search across progressively broader queries and looser constraints. */
async function findCandidates(query, role, countryName) {
  const constraints = [
    { minWidth: role.minWidth ?? 2400, minRatio: role.minRatio ?? 0.5, maxRatio: role.maxRatio ?? 3 },
    { minWidth: Math.round((role.minWidth ?? 2400) * 0.8), minRatio: (role.minRatio ?? 0.5) - 0.2, maxRatio: (role.maxRatio ?? 3) + 0.3 },
    { minWidth: 1800 },
  ];
  for (const q of queryVariants(query, countryName)) {
    for (const opts of constraints) {
      const found = await search(q, opts);
      if (found.length) return { candidates: found, usedQuery: q };
    }
  }
  return { candidates: [], usedQuery: query };
}

/* ---------------- editorial content ---------------- */

const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string', description: 'Two sentences on why a school would bring students here.' },
    education_notes: { type: 'string', description: 'Two to three sentences on what makes this country valuable as a classroom: what students can see or do here that they cannot at home.' },
    curriculum_links: {
      type: 'array',
      description: 'One entry per subject given, in the same order.',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          note: { type: 'string', description: 'One sentence on what this country offers that subject, naming real places.' },
        },
        required: ['subject', 'note'],
        additionalProperties: false,
      },
    },
    climate_summary: { type: 'string', description: 'Two sentences on the climate as a visiting school group experiences it.' },
    seasons: {
      type: 'array',
      description: 'Exactly four entries: Spring, Summer, Autumn, Winter.',
      items: {
        type: 'object',
        properties: {
          season: { type: 'string' },
          months: { type: 'string', description: 'e.g. "March to May"' },
          note: { type: 'string', description: 'Under 90 characters: what it is like and whether it suits a school trip.' },
        },
        required: ['season', 'months', 'note'],
        additionalProperties: false,
      },
    },
    safety_notes: { type: 'string', description: 'Two sentences a teacher or parent would want: general safety, health and anything to prepare. Factual, reassuring, not alarmist.' },
    getting_there: { type: 'string', description: 'One or two sentences on flying from Dubai: rough flight time, whether it is direct, and time difference.' },
    useful_phrases: {
      type: 'array',
      description: 'Four short phrases students would enjoy using. Empty array if the country is English-speaking.',
      items: {
        type: 'object',
        properties: {
          phrase: { type: 'string' },
          meaning: { type: 'string' },
        },
        required: ['phrase', 'meaning'],
        additionalProperties: false,
      },
    },
    image_queries: {
      type: 'array',
      description:
        'One Wikimedia Commons search per image role, in the order given, all different. Name a real, ' +
        'photographable subject in 2-5 words. For food, name a dish or a named market. For walking, name a ' +
        'street, old town or trail. For adventure, name the activity and place. For culture, name a festival, ' +
        'craft or performance tradition.',
      items: { type: 'string' },
    },
  },
  required: ['intro', 'education_notes', 'curriculum_links', 'climate_summary', 'seasons', 'safety_notes', 'getting_there', 'useful_phrases', 'image_queries'],
  additionalProperties: false,
};

const CONTENT_SYSTEM = `You write destination pages for a premium school-travel company based in Dubai, read by teachers planning a trip and by the parents they must reassure.

Be specific and factual. Name real museums, sites, landforms and institutions rather than writing in generalities. Never invent statistics, prices or dates. Keep the tone warm but professional — this is a company that schools trust with their students, not a holiday brochure.

Write British English. Do not use exclamation marks. Do not describe the country as "vibrant", "bustling", "a feast for the senses" or similar travel-brochure filler.

For image_queries, remember Wikimedia Commons indexes named subjects: "Fushimi Inari torii gates" finds photographs, "vibrant street life" finds nothing.`;

async function draftContent(country, subjects, avgTemp) {
  const res = await claude.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: CONTENT_SCHEMA } },
    system: CONTENT_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Country: ${country.name}\n` +
          `Capital: ${country.capital ?? '(unknown)'}\n` +
          `Measured average annual temperature in the capital: ${avgTemp !== null ? avgTemp + '°C' : '(unknown)'}\n` +
          `School trips we run here cover these subjects: ${subjects.join(', ') || '(none yet)'}\n` +
          `Trips depart from Dubai.\n\n` +
          `Image roles, in order:\n${ROLES.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === 'text');
  return JSON.parse(block.text);
}

async function pickImage(candidates, label, country, usedSubjects) {
  const pool = candidates.slice(0, 10);
  if (!pool.length) return null;
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 800,
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
              index: { type: 'integer' },
              alt_text: { type: 'string' },
            },
            required: ['suitable', 'index', 'alt_text'],
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
        'Then relevance: it must genuinely show the stated role for this country.\n\n' +
        'Reject outright: night shots unless the role is explicitly about lights, grey or rainy scenes, ' +
        'close-ups of signs, plaques, statues or architectural details, museum object photographs on plain ' +
        'backgrounds, empty rooms, building sites, scaffolding, and anything that is a map, plan, diagram, ' +
        'painting, engraving or scale model rather than a photograph.\n\n' +
        'Write British English alt text describing only what the title and description support.',
      messages: [
        {
          role: 'user',
          content:
            `Country: ${country.name}\nRole: ${label}\n` +
            (usedSubjects.length ? `Already used — pick a different subject:\n${usedSubjects.map((s) => `  - ${s}`).join('\n')}\n` : '') +
            `\nCandidates:\n` +
            pool.map((c, i) => `[${i}] ${c.title}\n     ${c.width}x${c.height}${c.qualityReviewed ? ', Quality image' : ''}\n     ${c.description ?? '(no description)'}`).join('\n'),
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = JSON.parse(block.text);
    // Leave the slot empty rather than publish something the picker rejected.
    if (out.suitable === false) return null;
    return { candidate: pool[Math.max(0, Math.min(pool.length - 1, out.index))], altText: out.alt_text ?? '' };
  } catch {
    return { candidate: pool[0], altText: '' };
  }
}

/* ---------------- run ---------------- */

const args = process.argv.slice(2);
let slugs = args.filter((a) => !a.startsWith('--'));
if (args.includes('--all')) {
  const { data } = await db.from('countries').select('slug').order('name');
  slugs = (data ?? []).map((c) => c.slug);
}
if (!slugs.length) throw new Error('Pass country slugs, or --all');

for (const slug of slugs) {
  const { data: country } = await db
    .from('countries')
    .select('id, name, slug, capital, avg_temp_c')
    .eq('slug', slug)
    .maybeSingle();
  if (!country) { console.log(`\n!! ${slug} — not found`); continue; }

  // Only the subjects this country actually carries trips for.
  const { data: trips } = await db
    .from('trips')
    .select('status, subjects(name)')
    .eq('country_id', country.id)
    .eq('status', 'published');
  const subjects = [...new Set((trips ?? []).map((t) => t.subjects?.name).filter(Boolean))];

  console.log(`\n${'='.repeat(70)}\n${country.name}  (${subjects.length} subjects, ${trips?.length ?? 0} published trips)`);

  let content;
  try {
    content = await draftContent(country, subjects, country.avg_temp_c === null ? null : Number(country.avg_temp_c));
  } catch (e) {
    console.log(`  !! content failed: ${e.message}`);
    continue;
  }

  const { error: cErr } = await db
    .from('countries')
    .update({
      intro: content.intro,
      education_notes: content.education_notes,
      curriculum_links: content.curriculum_links,
      climate_summary: content.climate_summary,
      seasons: content.seasons,
      safety_notes: content.safety_notes,
      getting_there: content.getting_there,
      useful_phrases: content.useful_phrases,
      content_updated_at: new Date().toISOString(),
    })
    .eq('id', country.id);
  if (cErr) { console.log(`  !! save failed: ${cErr.message}`); continue; }
  console.log(`  OK  content: intro, education notes, ${content.curriculum_links.length} curriculum links, ${content.seasons.length} seasons, ${content.useful_phrases.length} phrases`);

  // Replace any previous photography for this country.
  const { data: old } = await db.from('country_images').select('url').eq('country_id', country.id);
  for (const o of old ?? []) {
    const p = o.url?.split(`/${BUCKET}/`)[1];
    if (p) await db.storage.from(BUCKET).remove([decodeURIComponent(p)]);
  }
  await db.from('country_images').delete().eq('country_id', country.id);

  const used = [];
  let order = 0;
  for (const [i, role] of ROLES.entries()) {
    const query = content.image_queries[i] ?? `${country.name} landmark`;
    const { candidates, usedQuery } = await findCandidates(query, role, country.name);
    if (!candidates.length) { console.log(`  --  ${role.label.padEnd(32)} nothing free for "${query}"`); continue; }

    const chosen = await pickImage(candidates, role.label, country, used);
    if (!chosen) {
      console.log(`  --  ${role.label.padEnd(32)} no acceptable photograph among the candidates`);
      continue;
    }
    used.push(chosen.candidate.title.replace(/\.(jpg|jpeg|png)$/i, '').slice(0, 70));

    try {
      const buf = Buffer.from(await (await fetch(scaled(chosen.candidate.title, role.role === 'hero' ? 2600 : 1800), { headers: UA })).arrayBuffer());
      const ext = chosen.candidate.mime === 'image/png' ? 'png' : 'jpg';
      const path = `countries/${country.slug}/${role.role}-${Date.now()}-${order}.${ext}`;
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, buf, {
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg', cacheControl: '31536000',
      });
      if (upErr) throw new Error(upErr.message);
      const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      const { error } = await db.from('country_images').insert({
        country_id: country.id, role: role.role, url, alt_text: chosen.altText,
        caption: chosen.candidate.description?.slice(0, 160) ?? null,
        width: chosen.candidate.width, height: chosen.candidate.height, bytes: buf.length,
        source: 'Wikimedia Commons', source_url: chosen.candidate.sourceUrl,
        photographer: chosen.candidate.photographer, licence: chosen.candidate.licence,
        attribution_required: !/^(cc0|public domain|pdm)/i.test(chosen.candidate.licence ?? ''),
        downloaded_at: new Date().toISOString(), sort_order: order++, approved: true,
      });
      if (error) throw new Error(error.message);
      console.log(`  OK  ${role.label.padEnd(32)} ${String(chosen.candidate.width).padStart(5)}px r${chosen.candidate.ratio.toFixed(2)} ${(chosen.candidate.licence ?? '?').padEnd(13)}${chosen.candidate.qualityReviewed ? ' [QI]' : ''}`);
      console.log(`        q: "${usedQuery}"${usedQuery !== query ? ` (broadened from "${query}")` : ''}`);
    } catch (e) {
      console.log(`  !!  ${role.label.padEnd(32)} ${e.message}`);
    }
  }
}
