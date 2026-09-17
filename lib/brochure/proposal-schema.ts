/**
 * Proposal model — the shape a school-specific brochure takes.
 *
 * A proposal is a brochure with `kind = 'proposal'`: it reuses the brochure
 * record (title, client, status, visibility, publishing) and adds an itinerary,
 * flights, commercial terms and a share link. Marketing brochures are the same
 * table with `kind = 'brochure'` and no days.
 *
 * This file is mirrored in the Premium Choice Travel app, which hosts the
 * admin. Both copies must agree on the shape.
 */

export const PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'expired'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_EVENTS = ['created', 'sent', 'viewed', 'pdf_downloaded', 'accepted'] as const;
export type ProposalEvent = (typeof PROPOSAL_EVENTS)[number];

export const FLIGHT_DIRECTIONS = ['outbound', 'return'] as const;
export type FlightDirection = (typeof FLIGHT_DIRECTIONS)[number];

/** One line of a day's timetable. `text` allows <b> and nothing else. */
export type DayItem = {
  id?: number;
  /** Free text: "09:00–12:00" and "Late morning" are equally valid. */
  timeLabel: string;
  text: string;
  sortOrder: number;
};

export type ProposalDay = {
  id?: number;
  dayNumber: number;
  /** Null while a template has no dates yet. */
  date: string | null;
  title: string;
  /** The prose paragraph shown above the timetable. */
  summary: string;
  overnight: string;
  /** Ids into brochure_images. The reference shows three per day. */
  imageIds: number[];
  sortOrder: number;
  items: DayItem[];
};

export type ProposalFlight = {
  id?: number;
  direction: FlightDirection;
  flightNumber: string;
  carrier: string;
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  departsAt: string | null;
  arrivesAt: string | null;
  note: string;
  sortOrder: number;
};

export type TermsSection = { heading: string; bodyHtml: string };

export type TermsSet = {
  id?: number;
  name: string;
  version: number;
  sections: TermsSection[];
  isDefault: boolean;
  effectiveFrom: string | null;
};

export type BrochureImage = {
  id?: number;
  storagePath: string;
  alt: string;
  credit: string;
  width: number | null;
  height: number | null;
  tags: string[];
};

/** Editorial blocks that live on the brochure row rather than in their own table. */
export type ProposalContent = {
  /** Id into brochure_images for the full-bleed hero. */
  heroImageId: number | null;
  /** The school's own logo, one of the proposal's images tagged "logo". */
  schoolLogoImageId: number | null;
  eyebrow: string;
  /** The headline; `titleEmphasis` is rendered in italic within it. */
  title: string;
  titleEmphasis: string;
  subtitle: string;
  intro: string[];
  /** The overview headline; `overviewEmphasis` is rendered in italic within it. */
  overviewHeading: string;
  overviewEmphasis: string;
  pctParents: string;
  pctChildren: string;
  pctTeachers: string;
  learningOutcomes: { title: string; description: string }[];
  signatureExperiences: { title: string; caption: string; imageId: number | null; dayNumber: number | null }[];
  inclusions: string[];
  exclusions: string[];
  /** Pages written for this proposal alone, placed by `placement`. */
  customPages: CustomPage[];
  /** The i. ii. iii. block that closes the proposal. */
  nextSteps: { title: string; text: string }[];
  contact: { name: string; phones: string[]; email: string; website: string; address: string };
};

/** Where a page of the author's own sits in the document. */
export const PAGE_PLACEMENTS = [
  'after-overview',
  'after-itinerary',
  'after-experiences',
  'after-outcomes',
  'before-price',
  'end',
] as const;
export type PagePlacement = (typeof PAGE_PLACEMENTS)[number];

export const PAGE_PLACEMENT_LABELS: Record<PagePlacement, string> = {
  'after-overview': 'After the overview',
  'after-itinerary': 'After the day-by-day itinerary',
  'after-experiences': 'After the signature experiences',
  'after-outcomes': 'After the learning outcomes',
  'before-price': 'Just before the price',
  end: 'At the end, after the booking conditions',
};

/**
 * A page of the author's own: a heading, paragraphs and, if wanted, one
 * photograph. The fixed sections have shapes; this is the blank space.
 */
export type CustomPage = {
  id: string;
  eyebrow: string;
  title: string;
  body: string[];
  imageId: number | null;
  placement: PagePlacement;
};

/** Commercial fields, all optional while a proposal is still a template. */
export type ProposalCommercials = {
  preparedFor: string;
  travelStart: string | null;
  travelEnd: string | null;
  studentCount: number | null;
  freePlacesTeachers: number | null;
  freePlacesPctStaff: number | null;
  pricePerStudent: number | null;
  currency: string;
  priceBasisNote: string;
};

/**
 * Everything the renderer needs, already resolved.
 *
 * Overrides are applied before this is built, so a renderer never has to know
 * whether a value came from the source brochure or from the school-specific
 * copy — which is what keeps the three output modes rendering identically.
 */
export type ProposalViewModel = {
  id: number;
  slug: string;
  status: ProposalStatus;
  heroImage: string | null;
  heroEffect: boolean;
  content: ProposalContent;
  commercials: ProposalCommercials;
  days: ProposalDay[];
  flights: ProposalFlight[];
  terms: TermsSet | null;
  /** Resolved public URLs, keyed by brochure_images.id. */
  images: Record<number, { url: string; alt: string; width: number | null; height: number | null }>;
};

export const EMPTY_CONTENT: ProposalContent = {
  heroImageId: null,
  schoolLogoImageId: null,
  eyebrow: '',
  title: '',
  titleEmphasis: '',
  subtitle: '',
  intro: [],
  overviewHeading: '',
  overviewEmphasis: '',
  pctParents: '',
  pctChildren: '',
  pctTeachers: '',
  learningOutcomes: [],
  signatureExperiences: [],
  inclusions: [],
  exclusions: [],
  customPages: [],
  nextSteps: [],
  contact: { name: '', phones: [], email: '', website: '', address: '' },
};

/** Free places are shown as one number with a breakdown beneath it. */
export function freePlacesTotal(c: ProposalCommercials) {
  return (c.freePlacesTeachers ?? 0) + (c.freePlacesPctStaff ?? 0);
}

/** The author's pages asked for at one place. An unknown placement goes to the end rather than nowhere. */
export function pagesAt(content: ProposalContent, placement: PagePlacement): CustomPage[] {
  const known = new Set<string>(PAGE_PLACEMENTS);
  return (content.customPages ?? []).filter(
    (p) => (known.has(p.placement) ? p.placement : 'end') === placement,
  );
}

/**
 * Every brochure_images id a proposal points at: the hero, the days, the
 * signature experiences and the custom pages. Used to keep showing pictures
 * that were attached before images recorded an owner.
 */
export function referencedImageIds(
  content: ProposalContent,
  dayImageIds: number[][],
  coverImage: string | null | undefined,
): number[] {
  const ids = new Set<number>();
  const add = (v: unknown) => {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) ids.add(n);
  };
  add(content.heroImageId);
  add(content.schoolLogoImageId);
  if (typeof coverImage === 'string' && /^[0-9]+$/.test(coverImage)) add(coverImage);
  for (const e of content.signatureExperiences ?? []) add(e.imageId);
  for (const p of content.customPages ?? []) add(p.imageId);
  for (const list of dayImageIds) for (const id of list ?? []) add(id);
  return Array.from(ids);
}

/* ───────────────────────────── airline logos ───────────────────────────── */

/**
 * IATA codes for the carriers a school group is likely to fly, by name, for
 * flights entered without a flight number. Lower case; matched on whole words.
 */
export const AIRLINE_CODES: Record<string, string> = {
  emirates: 'EK',
  flydubai: 'FZ',
  etihad: 'EY',
  'etihad airways': 'EY',
  'qatar airways': 'QR',
  qatar: 'QR',
  'air arabia': 'G9',
  'oman air': 'WY',
  'gulf air': 'GF',
  saudia: 'SV',
  egyptair: 'MS',
  'royal jordanian': 'RJ',
  'turkish airlines': 'TK',
  turkish: 'TK',
  lufthansa: 'LH',
  swiss: 'LX',
  'austrian airlines': 'OS',
  austrian: 'OS',
  klm: 'KL',
  'air france': 'AF',
  'british airways': 'BA',
  'virgin atlantic': 'VS',
  'aer lingus': 'EI',
  iberia: 'IB',
  'tap air portugal': 'TP',
  'ita airways': 'AZ',
  aegean: 'A3',
  finnair: 'AY',
  icelandair: 'FI',
  norwegian: 'DY',
  sas: 'SK',
  'scandinavian airlines': 'SK',
  'lot polish airlines': 'LO',
  'czech airlines': 'OK',
  'ethiopian airlines': 'ET',
  'kenya airways': 'KQ',
  'south african airways': 'SA',
  'air india': 'AI',
  indigo: '6E',
  'sri lankan airlines': 'UL',
  srilankan: 'UL',
  'thai airways': 'TG',
  'malaysia airlines': 'MH',
  'singapore airlines': 'SQ',
  'cathay pacific': 'CX',
  'japan airlines': 'JL',
  ana: 'NH',
  'korean air': 'KE',
  qantas: 'QF',
  'air new zealand': 'NZ',
  'american airlines': 'AA',
  delta: 'DL',
  united: 'UA',
  'air canada': 'AC',
};

/** "EK 203", "LH631", "FZ-123", "6E 1234": the two-character airline code at the front. */
const FLIGHT_NUMBER = /^([A-Z][A-Z0-9]|[0-9][A-Z])\s?-?\s?\d{1,4}[A-Z]?$/;

/**
 * The airline's IATA code for a flight: from the flight number when there is
 * one, otherwise from the carrier's name. Null when neither says.
 */
export function airlineCode(flight: { flightNumber?: string | null; carrier?: string | null }): string | null {
  const number = (flight.flightNumber ?? '').trim().toUpperCase();
  const m = number.match(FLIGHT_NUMBER);
  if (m) return m[1];

  const name = (flight.carrier ?? '').trim().toLowerCase();
  if (!name) return null;
  if (AIRLINE_CODES[name]) return AIRLINE_CODES[name];
  // Longest name first, so "etihad airways" wins over "etihad" and a short
  // name like "sas" cannot match inside "lufthansa".
  const names = Object.keys(AIRLINE_CODES).sort((a, b) => b.length - a.length);
  const escape = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hit = names.find((k) => new RegExp(`(^|[^a-z])${escape(k)}([^a-z]|$)`).test(name));
  return hit ? AIRLINE_CODES[hit] : null;
}

/**
 * The carrier's logo, from a public logo service keyed by IATA code. Drawn
 * on a white card in both the page and the deck. The service answers an
 * unknown code with a generic mark rather than an error, so a mistyped
 * flight number shows a plane, not a broken image.
 */
export function airlineLogoUrl(flight: { flightNumber?: string | null; carrier?: string | null }): string | null {
  const code = airlineCode(flight);
  return code ? `https://pics.avs.io/240/80/${code}.png` : null;
}
