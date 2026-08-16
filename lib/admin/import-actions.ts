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

/** Read the source text out of an upload or a paste, with friendly errors. */
async function readSource(formData: FormData): Promise<{ text: string } | { error: string }> {
  let source = String(formData.get('text') ?? '').trim();
  const file = formData.get('file');
  if (!source && file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { error: 'That file is over 8MB — try removing embedded images first.' };
    }
    try {
      source = (await extractText(file)).trim();
    } catch (e: any) {
      return { error: e.message };
    }
  }
  if (!source) return { error: 'Upload a document or paste the text.' };
  if (source.length < 80) {
    return { error: 'That document looks empty — is the text in an image or a scan?' };
  }
  return { text: source };
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

  const read = await readSource(formData);
  if ('error' in read) return { ok: false, error: read.error };
  const source = read.text;

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

/* ------------------------------------------------------------------ */
/* Quotations                                                          */
/* ------------------------------------------------------------------ */

export type ParsedQuote = {
  title: string;
  school_name: string;
  teacher_name: string;
  teacher_email: string;
  travel_dates: string;
  pupils: number;
  staff: number;
  currency: string;
  notes: string;
  itinerary: { label: string; title: string; description: string }[];
  lines: { description: string; qty: number; unit_cost: number }[];
  terms: string[];
};

export type QuoteImportResult =
  | { ok: true; draft: ParsedQuote; notes: string[] }
  | { ok: false; error: string };

const QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Trip title for the quote, e.g. "Geography Trip to Iceland"' },
    school_name: { type: 'string', description: 'Client school; empty string if not stated' },
    teacher_name: { type: 'string', description: 'Lead teacher / contact; empty string if not stated' },
    teacher_email: { type: 'string', description: 'Contact email; empty string if not stated' },
    travel_dates: { type: 'string', description: 'e.g. "14–18 October 2026"; empty string if not stated' },
    pupils: { type: 'integer', description: 'Number of students; 0 if not stated' },
    staff: { type: 'integer', description: 'Number of accompanying staff; 0 if not stated' },
    currency: {
      type: 'string',
      description: 'Three-letter code of the costs in the document, e.g. AED, GBP, EUR, USD.',
    },
    notes: { type: 'string', description: 'Any caveats worth surfacing to the teacher. Empty if none.' },
    itinerary: {
      type: 'array',
      description: 'Day-by-day plan if the document has one, else an empty array.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['label', 'title', 'description'],
        additionalProperties: false,
      },
    },
    lines: {
      type: 'array',
      description: 'One entry per chargeable item, in the order the document lists them.',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the charge is for' },
          qty: { type: 'integer', description: 'Quantity; 1 when the figure is a single total' },
          unit_cost: {
            type: 'number',
            description: 'Supplier cost per unit, before any markup. Numbers only, no symbols.',
          },
        },
        required: ['description', 'qty', 'unit_cost'],
        additionalProperties: false,
      },
    },
    terms: { type: 'array', items: { type: 'string' }, description: 'Payment/cancellation terms, one per line.' },
  },
  required: [
    'title',
    'school_name',
    'teacher_name',
    'teacher_email',
    'travel_dates',
    'pupils',
    'staff',
    'currency',
    'notes',
    'itinerary',
    'lines',
    'terms',
  ],
  additionalProperties: false,
} as const;

const QUOTE_SYSTEM = `You turn a supplier costing sheet or draft quotation into structured data for a school-travel company's quote builder.

Extract only what the document states. Never invent prices, dates or inclusions.

The costings matter most, so read them carefully:
- Record the SUPPLIER or NET cost per unit — the company's own cost, before any markup or commission. If the document shows both a cost and a selling price, take the cost. If it shows only one figure, take that and rely on the reviewer to confirm.
- Strip currency symbols and thousands separators: "AED 1,250.00" becomes 1250.
- When a figure is a per-person price, set qty to the number of people it applies to and unit_cost to the per-person figure. When it is a single lump sum, set qty to 1 and unit_cost to the total.
- Do not include totals, subtotals, VAT summary lines or grand totals as line items — those are calculated from the lines. Include a tax or fee only when it is a genuine separate chargeable item.

Use British English. Keep line descriptions short and specific ("Return flights Dubai–Keflavik", not "Flights as per itinerary above").`;

/** Read a supplier costing sheet or draft quotation into a reviewable quote. */
export async function parseQuoteDocument(formData: FormData): Promise<QuoteImportResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The Claude API key is not configured on this environment.' };
  }

  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: 'Signed out — please log in again.' };

  const read = await readSource(formData);
  if ('error' in read) return { ok: false, error: read.error };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let draft: ParsedQuote;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: QUOTE_SCHEMA } },
      system: QUOTE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Here is the costing document:\n\n---\n${read.text.slice(0, 120_000)}\n---\n\nExtract the quotation.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'Claude declined to process this document.' };
    }
    if (response.stop_reason === 'max_tokens') {
      return { ok: false, error: 'The document is too long — split it and import each quote separately.' };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'Claude returned no content — try again.' };
    draft = JSON.parse(text.text) as ParsedQuote;
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
  if (!draft.lines.length) notes.push('No costings were found — add the lines by hand in the builder.');
  if (!draft.itinerary.length) notes.push('No day-by-day itinerary was found.');
  if (!draft.pupils) notes.push('Pupil numbers were not stated — set them so the per-student price calculates.');
  if (!draft.travel_dates) notes.push('Travel dates were not stated.');
  if (draft.lines.some((l) => !l.unit_cost)) notes.push('Some lines came through with a zero cost — check them.');
  notes.push('Costs are read as supplier cost before markup — confirm against the source before publishing.');

  return { ok: true, draft, notes };
}
