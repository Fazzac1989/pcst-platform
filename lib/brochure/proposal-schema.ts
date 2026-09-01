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
  /** The i. ii. iii. block that closes the proposal. */
  nextSteps: { title: string; text: string }[];
  contact: { name: string; phones: string[]; email: string; website: string; address: string };
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
  nextSteps: [],
  contact: { name: '', phones: [], email: '', website: '', address: '' },
};

/** Free places are shown as one number with a breakdown beneath it. */
export function freePlacesTotal(c: ProposalCommercials) {
  return (c.freePlacesTeachers ?? 0) + (c.freePlacesPctStaff ?? 0);
}
