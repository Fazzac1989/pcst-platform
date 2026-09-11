import type { Brochure, PageContent } from '@/lib/brochure/schema';
import type { TripSpread } from '@/lib/brochure/spreads';
import { continentOf } from '@/lib/brochure/spreads';
import { introSummary } from '@/lib/brochure/spreads';

/**
 * What the collection needs to know about one trip.
 *
 * The deck and the collection are two presentations of the same brochure, so
 * this is an adapter over the spreads the deck already builds rather than a
 * second way of loading trips. Anything a school might filter on is a real
 * field here; anything the record does not say stays null, because a year
 * group nobody wrote down is unknown, not "suitable for everyone".
 */
export type CollectionTrip = {
  tripId: number;
  slug: string | null;
  title: string;
  subject: string | null;
  country: string | null;
  city: string | null;
  continent: string;
  /** "Salalah, Oman" — what the card shows under the title. */
  place: string;
  days: number;
  nights: number;
  /** As a person wrote it, e.g. "Years 8–11 (ages 12–16)". Null when unrecorded. */
  ageGroup: string | null;
  /** "Years 8–11", for the card's tight metadata row. */
  ageShort: string | null;
  /** The lowest and highest school year, for filtering. Null when unrecorded. */
  years: { from: number; to: number } | null;
  image: string | null;
  summary: string;
  highlights: { name: string; note: string }[];
  educationalValues: { title: string; detail: string }[];
  whyCountry: string | null;
  pctView: string | null;
  inclusions: string[];
  exclusions: string[];
  conditions: string[];
  days_: { dayNumber: number; label: string; title: string; location: string | null; summary: string | null }[];
  gettingThere: string | null;
  departs: string | null;
};

/** "Years 8–11 (ages 12–16)" -> { from: 8, to: 11 }. Null if it says no such thing. */
export function yearsFrom(ageGroup: string | null | undefined): { from: number; to: number } | null {
  if (!ageGroup) return null;
  // Only the "Years n-m" part; the ages in brackets are a gloss on it.
  const m = ageGroup.match(/years?\s*(\d{1,2})\s*[–—-]\s*(\d{1,2})/i);
  if (m) {
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (from >= 1 && to <= 13 && from <= to) return { from, to };
    return null;
  }
  const one = ageGroup.match(/years?\s*(\d{1,2})\b/i);
  if (one) {
    const y = Number(one[1]);
    if (y >= 1 && y <= 13) return { from: y, to: y };
  }
  return null;
}

/** The year range on its own, for a card that has no room for the ages too. */
export function shortAge(ageGroup: string | null | undefined): string | null {
  const y = yearsFrom(ageGroup);
  if (!y) return null;
  return y.from === y.to ? `Year ${y.from}` : `Years ${y.from}–${y.to}`;
}

const clean = (s: string | null | undefined) => {
  const t = (s ?? '').trim();
  return t ? t : null;
};

export function toCollectionTrip(s: TripSpread): CollectionTrip {
  const t = s.trip;
  const c: PageContent = s.content ?? {};
  const ageGroup = clean(c.ageGroup);
  const city = clean(t?.city ?? null);
  const country = clean(t?.country ?? null);

  // The composed copy first, the trip's own words when there is none.
  const summary =
    clean(c.proposition) ??
    clean(c.intro) ??
    introSummary(t?.overview ?? [], 220) ??
    '';

  const named = new Set((c.highlights ?? []).map((h) => h.name.trim().toLowerCase()));
  const highlights = [
    ...(c.highlights ?? []).map((h) => ({ name: h.name, note: h.note ?? '' })),
    ...(t?.highlights ?? [])
      .filter((h) => h.name && !named.has(h.name.trim().toLowerCase()))
      .map((h) => ({ name: h.name, note: h.note ?? '' })),
  ];

  return {
    tripId: s.tripId,
    slug: t?.slug ?? null,
    title: t?.title ?? clean(c.headline) ?? 'Trip',
    subject: clean(t?.subject ?? null),
    country,
    city,
    continent: continentOf(t),
    place: [city, country].filter(Boolean).join(', '),
    days: t?.durationDays ?? 0,
    nights: t?.durationNights ?? Math.max(0, (t?.durationDays ?? 1) - 1),
    ageGroup,
    ageShort: shortAge(ageGroup),
    years: yearsFrom(ageGroup),
    image: t?.heroImage ?? s.images[0] ?? null,
    summary,
    highlights,
    educationalValues: c.educationalValues ?? [],
    whyCountry: clean(c.whyCountry),
    pctView: clean(c.pctView),
    // The composed list when there is one, the trip's own when there is not —
    // the same fallback the deck uses, so both presentations list the same things.
    inclusions: (c.inclusions?.length ? c.inclusions : (t?.includes ?? []))
      .map((i) => i.trim().replace(/\.$/, ''))
      .filter(Boolean),
    exclusions: (c.exclusions ?? []).filter(Boolean),
    conditions: (c.conditions ?? []).filter(Boolean),
    days_: t?.days ?? [],
    gettingThere: clean(t?.gettingThere ?? null),
    departs: clean(t?.departs ?? null),
  };
}

/** How long a trip is, in the buckets a teacher actually plans around. */
export const DURATION_BUCKETS = [
  { key: 'short', label: 'Up to 5 days', test: (d: number) => d > 0 && d <= 5 },
  { key: 'week', label: '6 to 8 days', test: (d: number) => d >= 6 && d <= 8 },
  { key: 'long', label: '9 days or more', test: (d: number) => d >= 9 },
] as const;

/** The year-group bands a school picks from, rather than thirteen single years. */
export const YEAR_BANDS = [
  { key: '7-9', label: 'Years 7–9', from: 7, to: 9 },
  { key: '10-11', label: 'Years 10–11', from: 10, to: 11 },
  { key: '12-13', label: 'Years 12–13', from: 12, to: 13 },
] as const;

/** A trip suits a band if the two ranges overlap at all. */
export const suitsBand = (t: CollectionTrip, band: { from: number; to: number }) =>
  Boolean(t.years && t.years.from <= band.to && t.years.to >= band.from);

/**
 * Whether the record's client name is a person rather than an organisation.
 *
 * The field is meant for the school, but it is where a coordinator's name and
 * titles get typed — one brochure carries "Mr. Arjun Balu Offsite Educational
 * Visits Coordinator Round Square Co-Coordinator The Duke of Edinburgh's
 * International Award Leader". Put that in a header that says "Prepared for"
 * and the school disappears behind a job description.
 */
const HONORIFIC = /^\s*(?:mr|mrs|ms|miss|dr|prof|professor|sir|madam)\b\.?\s/i;

export function clientIsPerson(name: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  if (!n) return false;
  // An honorific, or far longer than any school writes its own name.
  return HONORIFIC.test(n) || n.length > 60;
}

/** The school the collection was built for. */
export const schoolName = (b: Brochure) => {
  const c = clean(b.clientName);
  if (c && !clientIsPerson(c)) return c;
  return clean(b.title) ?? 'your school';
};

/**
 * The person it was prepared for, when the record names one. Shown where a
 * contact belongs — beside the enquiry — rather than as the school's identity.
 */
export const preparedFor = (b: Brochure): string | null => {
  const c = clean(b.clientName);
  if (!c || !clientIsPerson(c)) return null;
  return c.replace(/\s+/g, ' ').trim();
};

/**
 * Whether a country's "getting there" note actually describes this trip.
 *
 * The note is written per country, but a trip goes to a city. Oman's note
 * describes the hour from Dubai to Muscat; the Dhofar trip flies to Salalah,
 * which is neither the same airport nor the same flight. Showing the note as
 * this trip's travel arrangements would present a wrong route as a verified
 * one, so where the note names a different place the trip says nothing rather
 * than guessing, and the note is kept but labelled as being about the country.
 */
export function travelConflict(trip: Pick<CollectionTrip, 'city' | 'country' | 'gettingThere'>): boolean {
  const note = trip.gettingThere;
  const city = trip.city;
  if (!note || !city) return false;
  // The first stretch of the note is where it names the place you fly into.
  const head = note.slice(0, 90).toLowerCase();
  const first = city.split(/[/·(,]/)[0].trim().toLowerCase();
  if (!first) return false;
  if (head.includes(first)) return false;
  // It names somewhere, and it is not here.
  return /\b(?:fly|flight|flights|airport|direct|hours?|hour)\b/.test(head);
}

/** The groups a school reads inclusions in, rather than one long list. */
const INCLUSION_GROUPS: { label: string; test: RegExp }[] = [
  { label: 'Travel and transfers', test: /\b(flight|flights|airfare|transfer|transfers|coach|bus|train|airport|visa|departure)\b/i },
  { label: 'Accommodation', test: /\b(hotel|hostel|accommodation|night|nights|camp|lodge|guesthouse|room|rooms)\b/i },
  { label: 'Meals', test: /\b(breakfast|lunch|dinner|meal|meals|half board|full board|snack)\b/i },
  { label: 'Activities and entries', test: /\b(entrance|entry|admission|ticket|tickets|workshop|guide|guided|excursion|activity|activities|lesson|session|guided tour|walking tour)\b/i },
];

/**
 * Sort inclusions into readable groups without changing a word of them.
 * Anything that matches nothing keeps its place under a plain heading, because
 * dropping a line from a list of what a school is paying for is not an option.
 */
export function groupInclusions(items: string[]): { label: string; items: string[] }[] {
  const out = new Map<string, string[]>();
  const OTHER = 'Also included';
  for (const item of items) {
    const g = INCLUSION_GROUPS.find((x) => x.test.test(item));
    const label = g ? g.label : OTHER;
    if (!out.has(label)) out.set(label, []);
    out.get(label)!.push(item);
  }
  const order = [...INCLUSION_GROUPS.map((g) => g.label), OTHER];
  return order.filter((l) => out.has(l)).map((label) => ({ label, items: out.get(label)! }));
}
