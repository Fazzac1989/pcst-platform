'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { citySlug } from '@/lib/data';
import type { ActionResult } from './actions';

/**
 * Drafts the editorial sections of a country or city page — the "Why here"
 * intro, curriculum links, when to travel, useful phrases — the way the facts
 * panel is already drafted: Claude writes, the row is saved, and everything
 * stays editable in the database afterwards. Only the sections the pages
 * actually render are generated.
 *
 * Cities have no admin screen of their own: a city page appears when a
 * published single-city trip names it, so the generate button lives on the
 * country and covers the cities its trips visit.
 */

const seasonsSchema = {
  type: 'array',
  minItems: 3,
  maxItems: 4,
  items: {
    type: 'object',
    properties: {
      season: { type: 'string', description: 'Short label, e.g. "Spring" or "Dry season".' },
      months: { type: 'string', description: 'e.g. "March – May"' },
      note: { type: 'string', description: 'One sentence on what this window is like for a school group.' },
    },
    required: ['season', 'months', 'note'],
    additionalProperties: false,
  },
} as const;

const curriculumSchema = {
  type: 'array',
  minItems: 3,
  maxItems: 5,
  items: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'A school subject, e.g. "History" or "Geography".' },
      note: { type: 'string', description: 'One or two sentences on what the destination gives that subject.' },
    },
    required: ['subject', 'note'],
    additionalProperties: false,
  },
} as const;

const phrasesSchema = {
  type: 'array',
  minItems: 4,
  maxItems: 6,
  items: {
    type: 'object',
    properties: {
      phrase: { type: 'string', description: 'The phrase in the local language, romanised if needed.' },
      meaning: { type: 'string', description: 'Its English meaning.' },
    },
    required: ['phrase', 'meaning'],
    additionalProperties: false,
  },
} as const;

const COUNTRY_SCHEMA = {
  type: 'object',
  properties: {
    intro: {
      type: 'string',
      description:
        'The lead paragraph of the country page: why a school travels here. Two to three sentences.',
    },
    education_notes: {
      type: 'string',
      description: 'A second paragraph on what students take home. Two to three sentences.',
    },
    curriculum_links: curriculumSchema,
    climate_summary: { type: 'string', description: 'One or two sentences on the climate overall.' },
    seasons: seasonsSchema,
    useful_phrases: phrasesSchema,
  },
  required: [
    'intro',
    'education_notes',
    'curriculum_links',
    'climate_summary',
    'seasons',
    'useful_phrases',
  ],
  additionalProperties: false,
} as const;

const CITY_SCHEMA = {
  type: 'object',
  properties: {
    intro: {
      type: 'string',
      description: 'The lead paragraph of the city page: why a school travels here. Two to three sentences.',
    },
    education_notes: {
      type: 'string',
      description: 'A second paragraph on what students take home. Two to three sentences.',
    },
    getting_around: {
      type: 'string',
      description: 'One sentence on how a school group moves around the city, e.g. "Compact centre; metro and walking".',
    },
    curriculum_links: curriculumSchema,
    climate_summary: { type: 'string', description: 'One or two sentences on the climate overall.' },
    seasons: seasonsSchema,
    useful_phrases: phrasesSchema,
  },
  required: [
    'intro',
    'education_notes',
    'getting_around',
    'curriculum_links',
    'climate_summary',
    'seasons',
    'useful_phrases',
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You write destination-page copy for Premium Choice School Trips, a school-travel company that designs, prices and supports curriculum-built trips departing from Dubai. The reader is a teacher weighing the destination for their students.

Write warmly but concretely: real places, real subjects, no brochure froth ("hidden gems", "something for everyone") and no superlatives you cannot stand behind. British English. Every value must fit the narrow page section it is written for — respect the sentence counts in the field descriptions.

Curriculum links should lean on the subjects the company actually sells for this destination when they are supplied, and stay honest about what a visit genuinely teaches. Useful phrases are in the destination's own language, romanised where the script would defeat a teacher reading aloud.`;

type Generated = Record<string, unknown>;

async function draft(
  schema: Record<string, unknown>,
  brief: string
): Promise<Generated | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'The Claude API key is not configured on this environment.' };
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system: SYSTEM,
      messages: [{ role: 'user', content: brief }],
    });
    if (response.stop_reason === 'refusal') return { error: 'Claude declined this request.' };
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { error: 'Claude returned no content.' };
    return JSON.parse(block.text);
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    return { error: `Could not generate: ${e.message}` };
  }
}

/** The published trips give the copy its grounding: subjects sold, cities visited. */
async function tripBrief(db: ReturnType<typeof createClient>, countryId: number) {
  const { data } = await db
    .from('trips')
    .select('title, city, status, subjects(name)')
    .eq('country_id', countryId)
    .eq('status', 'published');
  const trips = data ?? [];
  const subjects = [...new Set(trips.map((t: any) => t.subjects?.name).filter(Boolean))];
  return {
    subjects,
    lines: trips.map((t: any) => `- ${t.title} (${t.subjects?.name ?? 'General'}${t.city ? `, ${t.city}` : ''})`),
  };
}

/** Draft and save the editorial sections of one country's page. */
export async function generateCountryPageContent(id: number): Promise<ActionResult> {
  const db = createClient();
  const { data: country, error: readErr } = await db
    .from('countries')
    .select('id, name, slug')
    .eq('id', id)
    .maybeSingle();
  if (readErr || !country) return { ok: false, error: readErr?.message ?? 'Country not found.' };

  const { subjects, lines } = await tripBrief(db, id);
  const result = await draft(
    COUNTRY_SCHEMA,
    `Country: ${country.name}\n\n` +
      (lines.length
        ? `The trips we currently sell there:\n${lines.join('\n')}\n\nSubjects sold: ${subjects.join(', ')}`
        : 'No published trips yet — write for the destination itself.')
  );
  if ('error' in result) return { ok: false, error: result.error as string };

  const { error } = await db
    .from('countries')
    .update({
      intro: result.intro,
      education_notes: result.education_notes,
      curriculum_links: result.curriculum_links,
      climate_summary: result.climate_summary,
      seasons: result.seasons,
      useful_phrases: result.useful_phrases,
      content_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/countries/[slug]', 'page');
  return { ok: true, id };
}

/** Draft and save one city's page content, creating its row if this is the first time. */
export async function generateCityPageContent(
  countryId: number,
  cityName: string
): Promise<ActionResult> {
  const db = createClient();
  const { data: country, error: readErr } = await db
    .from('countries')
    .select('id, name')
    .eq('id', countryId)
    .maybeSingle();
  if (readErr || !country) return { ok: false, error: readErr?.message ?? 'Country not found.' };

  const name = cityName.trim();
  const slug = citySlug(name);
  if (!name || !slug) return { ok: false, error: 'No city name given.' };

  const { subjects, lines } = await tripBrief(db, countryId);
  const result = await draft(
    CITY_SCHEMA,
    `City: ${name}, ${country.name}\n\n` +
      (lines.length
        ? `The trips we currently sell in ${country.name}:\n${lines.join('\n')}\n\nSubjects sold: ${subjects.join(', ')}`
        : 'No published trips yet — write for the destination itself.')
  );
  if ('error' in result) return { ok: false, error: result.error as string };

  const { error } = await db.from('cities').upsert(
    {
      name,
      slug,
      country_id: countryId,
      intro: result.intro,
      education_notes: result.education_notes,
      getting_around: result.getting_around,
      curriculum_links: result.curriculum_links,
      climate_summary: result.climate_summary,
      seasons: result.seasons,
      useful_phrases: result.useful_phrases,
      content_updated_at: new Date().toISOString(),
    },
    { onConflict: 'slug' }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/cities/[slug]', 'page');
  return { ok: true };
}
