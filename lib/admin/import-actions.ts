'use server';

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

export type ParsedTrip = {
  title: string;
  subject: string;
  country: string;
  city: string;
  duration_days: number;
  duration_nights: number;
  departs: string;
  overview: string[];
  includes: string[];
  itinerary: { label: string; title: string; description: string }[];
};

export type ImportResult =
  | {
      ok: true;
      draft: ParsedTrip;
      /** Existing row this maps to, or null when it would need creating. */
      subjectMatch: { id: number | null; name: string };
      countryMatch: { id: number | null; name: string };
      notes: string[];
    }
  | { ok: false; error: string };

const TRIP_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Trip title, e.g. "Geography Trip to Iceland"' },
    subject: { type: 'string', description: 'Curriculum subject; empty string if not stated' },
    country: { type: 'string', description: 'Destination country; empty string if not stated' },
    city: { type: 'string', description: 'Cities or route, e.g. "Tokyo · Kyoto · Hiroshima"' },
    duration_days: { type: 'integer', description: 'Total days; 0 if not stated' },
    duration_nights: { type: 'integer', description: 'Total nights; 0 if not stated' },
    departs: { type: 'string', description: 'Departure city; empty string if not stated' },
    overview: {
      type: 'array',
      items: { type: 'string' },
      description: 'Prose paragraphs introducing the trip. Empty array if none.',
    },
    includes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short "what is included" lines. Empty array if none.',
    },
    itinerary: {
      type: 'array',
      description: 'One entry per day, in order.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'e.g. "Day 1" or "Days 3-4"' },
          title: { type: 'string', description: 'Short heading for the day' },
          description: { type: 'string', description: 'What happens that day' },
        },
        required: ['label', 'title', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'title',
    'subject',
    'country',
    'city',
    'duration_days',
    'duration_nights',
    'departs',
    'overview',
    'includes',
    'itinerary',
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You turn a school-trip description into structured data for a travel company's website.

Extract only what the document actually says. Never invent destinations, prices, dates, or activities that are not in the source. When a field is not stated, return an empty string, 0, or an empty array as the schema allows — do not guess.

Guidance:
- title: if the document has no explicit title, compose a natural one from the subject and destination (e.g. "History Trip to Berlin").
- subject: match one of the site's existing subjects when the document clearly fits it; otherwise use the subject named in the document.
- overview: rewrite the introductory material into two or three clean paragraphs of flowing prose aimed at teachers. Keep the document's facts; drop internal notes, pricing, and any sales boilerplate.
- includes: one short line per inclusion ("Return flights from Dubai", "Four nights' half-board accommodation"). Strip bullet characters.
- itinerary: one entry per day in order, with a label ("Day 1"), a short title, and a description of that day. Merge any per-day bullet lists into readable prose.
- Use British English and keep the tone factual and warm, matching a premium educational travel brand.`;

/** Pull plain text out of an uploaded document. */
async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (name.endsWith('.doc')) {
    throw new Error(
      'Old .doc files are not supported — open it in Word and use File → Save As → .docx.'
    );
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf')) {
    return buffer.toString('utf8');
  }
  throw new Error(`Unsupported file type "${name.split('.').pop()}" — upload a .docx, .txt or .md.`);
}

/** Loose match so "Great Britain" finds "United Kingdom"-style near misses by name. */
function findByName<T extends { id: number; name: string }>(rows: T[], value: string): T | null {
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return (
    rows.find((r) => r.name.toLowerCase() === needle) ??
    rows.find((r) => r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === needle.replace(/[^a-z0-9]/g, '')) ??
    null
  );
}

export async function parseTripDocument(formData: FormData): Promise<ImportResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The Claude API key is not configured on this environment.' };
  }

  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'Signed out — please log in again.' };

  // Source text: an uploaded document, or text pasted straight into the box.
  let source = String(formData.get('text') ?? '').trim();
  const file = formData.get('file');
  if (!source && file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, error: 'That file is over 8MB — try removing embedded images first.' };
    }
    try {
      source = (await extractText(file)).trim();
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
  if (!source) return { ok: false, error: 'Upload a document or paste the itinerary text.' };
  if (source.length < 80) {
    return { ok: false, error: 'That document looks empty — is the text in an image or a table?' };
  }

  const [{ data: subjects }, { data: countries }] = await Promise.all([
    db.from('subjects').select('id, name').order('name'),
    db.from('countries').select('id, name').order('name'),
  ]);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let draft: ParsedTrip;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: TRIP_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `The site's existing subjects are: ${(subjects ?? []).map((s) => s.name).join(', ') || '(none yet)'}.

Here is the trip document:

---
${source.slice(0, 120_000)}
---

Extract the trip.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'Claude declined to process this document.' };
    }
    if (response.stop_reason === 'max_tokens') {
      return {
        ok: false,
        error: 'The document is too long to process in one go — split it and import each trip separately.',
      };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return { ok: false, error: 'Claude returned no content — try again.' };
    }
    draft = JSON.parse(text.text) as ParsedTrip;
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Claude is rate limited right now — wait a moment and retry.' };
    }
    return { ok: false, error: `Could not read that document: ${e.message}` };
  }

  const notes: string[] = [];
  if (!draft.itinerary.length) notes.push('No day-by-day itinerary was found in the document.');
  if (!draft.overview.length) notes.push('No overview text was found — write one in the editor.');
  if (!draft.includes.length) notes.push('No "what’s included" list was found.');
  if (!draft.duration_days) notes.push('Duration was not stated — set it in the editor.');

  const subjectRow = findByName(subjects ?? [], draft.subject);
  const countryRow = findByName(countries ?? [], draft.country);

  return {
    ok: true,
    draft,
    subjectMatch: { id: subjectRow?.id ?? null, name: subjectRow?.name ?? draft.subject },
    countryMatch: { id: countryRow?.id ?? null, name: countryRow?.name ?? draft.country },
    notes,
  };
}
