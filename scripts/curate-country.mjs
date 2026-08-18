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

async function search(query, { minWidth = 2400, minRatio = 0.5, maxRatio = 3 } = {}) {
  const keep = (l) =>
    l.filter(
      (c) =>
        c.mime !== 'image/svg+xml' && c.width >= minWidth &&
        c.licence && FREE.test(c.licence) && !BLOCKED.test(c.licence) &&
        c.ratio >= minRatio && c.ratio <= maxRatio
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
  { role: 'gallery', label: 'Iconic landmark' },
  { role: 'gallery', label: 'Educational attraction' },
  { role: 'gallery', label: 'Culture and daily life' },
  { role: 'gallery', label: 'Landscape and nature' },
  { role: 'gallery', label: 'Architecture or cityscape' },
];

const scaled = (title, w) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${w}`;

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
      description: 'One Wikimedia Commons search per image role, in the order given. Name a real landmark or place, 2-5 words. All different.',
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
              index: { type: 'integer' },
              alt_text: { type: 'string' },
            },
            required: ['index', 'alt_text'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You are the photography director for a premium school-travel website. Pick the candidate with the most ' +
        'visual impact that clearly shows the right place. Favour bright natural daylight, strong colour, and ' +
        'wide establishing views where the subject fills the frame. Reject dull overcast scenes, close-ups of ' +
        'details, signs or statues, cluttered frames, scaffolding, and anything that is a map, plan, painting ' +
        'or model rather than a photograph. Write British English alt text describing only what the title and ' +
        'description support.',
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
    const attempts = [
      { minWidth: role.minWidth ?? 2400, minRatio: role.minRatio ?? 0.5, maxRatio: role.maxRatio ?? 3 },
      { minWidth: Math.round((role.minWidth ?? 2400) * 0.8), minRatio: (role.minRatio ?? 0.5) - 0.2, maxRatio: (role.maxRatio ?? 3) + 0.3 },
      { minWidth: 1800 },
    ];
    let candidates = [];
    for (const opts of attempts) {
      candidates = await search(query, opts);
      if (candidates.length) break;
    }
    if (!candidates.length) { console.log(`  --  ${role.label.padEnd(32)} nothing free for "${query}"`); continue; }

    const chosen = await pickImage(candidates, role.label, country, used);
    if (!chosen) continue;
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
      console.log(`        q: "${query}"`);
    } catch (e) {
      console.log(`  !!  ${role.label.padEnd(32)} ${e.message}`);
    }
  }
}
