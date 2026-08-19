/**
 * Shapes for the structured itinerary layer. No `server-only` here: the public
 * timeline and the admin editor are client components and share these types.
 */

/** Drives which Lucide icon a highlight gets. Keep in step with iconFor(). */
export const HIGHLIGHT_TYPES = [
  'landmark',
  'museum',
  'technology',
  'engineering',
  'nature',
  'walking',
  'food',
  'transport',
  'train',
  'flight',
  'culture',
  'history',
  'education',
  'university',
  'workshop',
  'sport',
  'adventure',
  'accommodation',
] as const;

export type HighlightType = (typeof HIGHLIGHT_TYPES)[number];

export type Highlight = {
  name: string;
  summary: string;
  type: HighlightType;
  location: string;
  /** True when the source hedged it: subject to availability, weather permitting… */
  conditional: boolean;
  /** The hedge itself, in the source's own terms. Never dropped. */
  conditionalText: string;
};

export type TransportLeg = {
  mode: string;
  from: string;
  to: string;
  /** True when the journey is itself an experience, e.g. the Shinkansen. */
  highlight: boolean;
};

/** Only shown in the admin, to point reviewers at what to check. */
export type ReviewFlag = {
  kind: 'ambiguous-name' | 'conditional' | 'unclear-location' | 'inferred-theme' | 'other';
  note: string;
};

export type StructuredDay = {
  displayTitle: string;
  summary: string;
  primaryLocation: string;
  highlights: Highlight[];
  learningFocus: string[];
  experienceTypes: string[];
  locations: string[];
  meals: string[];
  transport: TransportLeg[];
  notices: string[];
  reviewFlags: ReviewFlag[];
};

export type ItineraryDayView = {
  id: number;
  sortOrder: number;
  label: string | null;
  /** The original, authoritative day title. */
  title: string;
  /** The original, authoritative description. Always rendered, never replaced. */
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Null until the day has been through extraction — callers fall back. */
  structured: StructuredDay | null;
};

export type JourneyLeg = { location: string; fromDay: number; toDay: number };

/** How many days a leg spans, for the "Days 1–5" label. */
export const legLabel = (leg: JourneyLeg) =>
  leg.fromDay === leg.toDay ? `Day ${leg.fromDay}` : `Days ${leg.fromDay}–${leg.toDay}`;

const EMPTY: StructuredDay = {
  displayTitle: '',
  summary: '',
  primaryLocation: '',
  highlights: [],
  learningFocus: [],
  experienceTypes: [],
  locations: [],
  meals: [],
  transport: [],
  notices: [],
  reviewFlags: [],
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

/** Map a database row's jsonb columns into a StructuredDay, or null. */
export function mapStructured(row: any): StructuredDay | null {
  if (!row?.structured_at) return null;
  return {
    ...EMPTY,
    displayTitle: row.display_title ?? '',
    summary: row.summary ?? '',
    primaryLocation: row.primary_location ?? '',
    highlights: Array.isArray(row.highlights)
      ? row.highlights.map((h: any): Highlight => ({
          name: String(h?.name ?? ''),
          summary: String(h?.summary ?? ''),
          type: (HIGHLIGHT_TYPES as readonly string[]).includes(h?.type) ? h.type : 'landmark',
          location: String(h?.location ?? ''),
          conditional: Boolean(h?.conditional),
          conditionalText: String(h?.conditional_text ?? h?.conditionalText ?? ''),
        })).filter((h: Highlight) => h.name)
      : [],
    learningFocus: strings(row.learning_focus),
    experienceTypes: strings(row.experience_types),
    locations: strings(row.locations),
    meals: strings(row.meals),
    transport: Array.isArray(row.transport)
      ? row.transport.map((t: any): TransportLeg => ({
          mode: String(t?.mode ?? ''),
          from: String(t?.from ?? ''),
          to: String(t?.to ?? ''),
          highlight: Boolean(t?.highlight),
        })).filter((t: TransportLeg) => t.mode)
      : [],
    notices: strings(row.notices),
    reviewFlags: Array.isArray(row.review_flags)
      ? row.review_flags.map((f: any): ReviewFlag => ({
          kind: f?.kind ?? 'other',
          note: String(f?.note ?? ''),
        })).filter((f: ReviewFlag) => f.note)
      : [],
  };
}

/**
 * Build the journey rail from the days themselves, collapsing consecutive days
 * in the same place into one leg.
 */
export function buildJourney(days: ItineraryDayView[]): JourneyLeg[] {
  const legs: JourneyLeg[] = [];
  days.forEach((d, i) => {
    const place = d.structured?.primaryLocation?.trim();
    if (!place) return;
    const dayNumber = i + 1;
    const last = legs[legs.length - 1];
    if (last && last.location.toLowerCase() === place.toLowerCase()) last.toDay = dayNumber;
    else legs.push({ location: place, fromDay: dayNumber, toDay: dayNumber });
  });
  return legs;
}
