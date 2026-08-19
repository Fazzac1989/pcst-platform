// Deliberately not marked `server-only`: the migration and verification
// scripts import this directly so the prompt they exercise is the same one
// production uses. It is only ever imported from server actions and scripts.
import Anthropic from '@anthropic-ai/sdk';
import { HIGHLIGHT_TYPES, type StructuredDay } from './schema';

/**
 * Turns one day's descriptive itinerary into structured display data.
 *
 * The single rule that matters: this EXTRACTS, it never INVENTS. The source
 * copy often hedges on purpose — "a carefully selected automotive, engineering
 * or interactive technology experience" is deliberately unnamed because the
 * supplier is not fixed. Naming a specific factory there would put a promise on
 * the page that the operator has not made.
 */

const DAY_SCHEMA = {
  type: 'object',
  properties: {
    display_title: {
      type: 'string',
      description: 'A short, evocative title of 2–5 words. Reuse the original day title if it is already good.',
    },
    summary: {
      type: 'string',
      description:
        '15–30 words on why the day is interesting. Start with the substance, never with logistics. ' +
        'Do not begin with "After breakfast" or "You will be met by". Do not restate the title.',
    },
    primary_location: {
      type: 'string',
      description:
        'Exactly ONE town or city, e.g. "Tokyo". Never a pair, never "Tokyo and Nikko", never a ' +
        'region or country. On a day that travels between places, give the destination — where the ' +
        'group ends up that night. This drives a journey rail, so it must be a single place name.',
    },
    highlights: {
      type: 'array',
      description:
        '3–5 for a full sightseeing day; fewer for an arrival, departure or transfer day. ' +
        'Only genuinely significant experiences.',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description:
              'Exactly as the source names it. If the source is deliberately unspecific, keep it ' +
              'unspecific — "Engineering & Mobility Experience", never a named company.',
          },
          summary: { type: 'string', description: 'Up to 10 words on what it is.' },
          type: { type: 'string', enum: HIGHLIGHT_TYPES as unknown as string[] },
          location: { type: 'string', description: 'Where it is, or empty if unstated.' },
          conditional: {
            type: 'boolean',
            description: 'True if the source hedges it in any way.',
          },
          conditional_text: {
            type: 'string',
            description:
              'The hedge in a few words, e.g. "Subject to availability", "Weather permitting". ' +
              'Empty when conditional is false.',
          },
        },
        required: ['name', 'summary', 'type', 'location', 'conditional', 'conditional_text'],
        additionalProperties: false,
      },
    },
    learning_focus: {
      type: 'array',
      description:
        '2–5 curriculum themes the day genuinely supports. Short labels of one to three words, as they ' +
        'would appear on a syllabus — "Robotics", "Sustainability", "Design Technology" — not sentences ' +
        'or "and" phrases. Empty on a pure transfer day.',
      items: { type: 'string' },
    },
    experience_types: {
      type: 'array',
      description: '2–5 broad tags, e.g. Technology, Museum, Culture, Nature.',
      items: { type: 'string' },
    },
    locations: {
      type: 'array',
      description: 'Every named place in the day: cities, districts, sites.',
      items: { type: 'string' },
    },
    meals: {
      type: 'array',
      description: 'Only meals the source states are included. Any of Breakfast, Lunch, Dinner.',
      items: { type: 'string' },
    },
    transport: {
      type: 'array',
      description: 'Meaningful journeys only. Not routine coach transfers.',
      items: {
        type: 'object',
        properties: {
          mode: { type: 'string', description: 'e.g. Shinkansen, Ferry, Cable car, Domestic flight' },
          from: { type: 'string' },
          to: { type: 'string' },
          highlight: {
            type: 'boolean',
            description: 'True when the journey is itself an experience worth selling.',
          },
        },
        required: ['mode', 'from', 'to', 'highlight'],
        additionalProperties: false,
      },
    },
    notices: {
      type: 'array',
      description:
        'Day-level caveats from the source, e.g. "Museum entry subject to ticket availability". ' +
        'These must never be lost.',
      items: { type: 'string' },
    },
    review_flags: {
      type: 'array',
      description: 'Anything a human should check. Shown only to staff.',
      items: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['ambiguous-name', 'conditional', 'unclear-location', 'inferred-theme', 'other'],
          },
          note: { type: 'string' },
        },
        required: ['kind', 'note'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'display_title', 'summary', 'primary_location', 'highlights', 'learning_focus',
    'experience_types', 'locations', 'meals', 'transport', 'notices', 'review_flags',
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You convert one day of a school-trip itinerary into structured data for a premium travel website.

You EXTRACT. You never INVENT. Every value must be supported by the day's text in front of you.

The hard rule, and the one that matters most: where the source is deliberately unspecific, stay unspecific. Operators write "a carefully selected automotive, engineering or interactive technology experience" precisely because the supplier is not fixed. Turning that into a named factory, museum or company puts a promise on a public page that the company has not made. Never name an attraction, restaurant, hotel, university, factory, activity or transport operator the source does not name. Never invent timings, inclusions or prices.

Conditional language must survive. If the source says subject to availability, subject to confirmation, weather permitting, depending on flight times, depending on the programme, or anything similar, set conditional true on that highlight and record the hedge. If the caveat applies to the whole day rather than one item, put it in notices instead. Losing a caveat during summarisation is the worst thing you can do here.

Choosing highlights: pick the 3–5 things a reader would remember — signature attractions, major educational experiences, workshops, distinctive cultural experiences, memorable journeys, major landmarks. Do not promote breakfast, hotel check-in or check-out, routine coach transfers or airport formalities, unless the source presents one as a genuine experience. An arrival or departure day may legitimately have only one or two highlights.

Writing the summary: say why the day is worth doing. Lead with the substance, not the logistics. British English. No exclamation marks. Do not open with "After breakfast" or "You will be met by", and do not simply restate the title.

Use review_flags to point staff at anything you were unsure of: a name that might be ambiguous, a theme you inferred rather than read, a location you could not pin down.`;

export type ExtractInput = {
  dayNumber: number;
  totalDays: number;
  label: string | null;
  title: string;
  description: string;
  tripTitle: string;
  subject: string | null;
  country: string | null;
};

export const EXTRACT_MODEL = 'claude-opus-5';

export async function extractDay(input: ExtractInput): Promise<StructuredDay> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured.');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: DAY_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Trip: ${input.tripTitle}\n` +
          `Subject: ${input.subject ?? '(not stated)'}\n` +
          `Country: ${input.country ?? '(not stated)'}\n` +
          `This is day ${input.dayNumber} of ${input.totalDays}.\n\n` +
          `Day title: ${input.title}\n\n` +
          `Day description — the only source you may use:\n---\n${input.description}\n---`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new Error('Claude declined this day.');
  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No content returned.');

  const out = JSON.parse(block.text);
  return {
    displayTitle: out.display_title ?? '',
    summary: out.summary ?? '',
    primaryLocation: out.primary_location ?? '',
    highlights: (out.highlights ?? []).map((h: any) => ({
      name: h.name, summary: h.summary, type: h.type, location: h.location,
      conditional: Boolean(h.conditional), conditionalText: h.conditional_text ?? '',
    })),
    learningFocus: out.learning_focus ?? [],
    experienceTypes: out.experience_types ?? [],
    locations: out.locations ?? [],
    meals: out.meals ?? [],
    transport: out.transport ?? [],
    notices: out.notices ?? [],
    reviewFlags: out.review_flags ?? [],
  };
}

/* ------------------------------------------------------------------ */
/* Trip-level rollup                                                   */
/* ------------------------------------------------------------------ */

const TRIP_SCHEMA = {
  type: 'object',
  properties: {
    highlights: {
      type: 'array',
      description:
        '6–8 short phrases naming what makes the whole trip distinctive, drawn only from the days given. ' +
        'Two to four words each, e.g. "Shinkansen Engineering", "Hiroshima Peace Memorial".',
      items: { type: 'string' },
    },
  },
  required: ['highlights'],
  additionalProperties: false,
} as const;

export async function extractTripHighlights(
  tripTitle: string,
  days: { dayNumber: number; title: string; summary: string; highlights: string[] }[]
): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 1200,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TRIP_SCHEMA } },
    system:
      'You summarise a school trip into a handful of headline themes for a website. Draw only on the days ' +
      'supplied — never introduce a place or experience that does not appear there. Two to four words each, ' +
      'title case, British English, no punctuation at the end.',
    messages: [
      {
        role: 'user',
        content:
          `Trip: ${tripTitle}\n\n` +
          days.map((d) =>
            `Day ${d.dayNumber} — ${d.title}\n  ${d.summary}\n  Highlights: ${d.highlights.join(', ') || '(none)'}`
          ).join('\n\n'),
      },
    ],
  });

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') return [];
  return JSON.parse(block.text).highlights ?? [];
}
