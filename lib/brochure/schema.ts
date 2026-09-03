/**
 * Brochure page model.
 *
 * Pages are modular blocks rather than a fixed running order, so the structure
 * of a brochure is data: an admin can reorder, hide or add pages without a code
 * change, and new page types can be introduced later without a migration.
 *
 * Nothing here duplicates trip data. A page carries only editorial copy — the
 * headline written for the brochure, the condensed highlights — plus a
 * reference to the trip it presents. Titles, photography and itineraries are
 * read from the trips tables when the brochure renders.
 *
 * This file is mirrored from the Premium Choice Travel admin, which writes it.
 * Both copies must agree on the shape.
 */

export const PAGE_TYPES = [
  'cover',
  'brandIntroduction',
  'contents',
  'textEditorial',
  'subjectDivider',
  'destinationDivider',
  'tripHero',
  'tripOverview',
  'tripHighlights',
  'tripItinerary',
  'tripGallery',
  'tripWhy',
  'safety',
  'howItWorks',
  'appFeature',
  'callToAction',
  'contact',
  'backCover',
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

/** Editorial compositions, so a long brochure has rhythm rather than 40 identical spreads. */
export const LAYOUT_VARIANTS = ['a', 'b', 'c', 'd'] as const;
export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];

export type BrochureKind = 'master' | 'subject' | 'destination' | 'custom';
export type BrochureStatus = 'draft' | 'published' | 'archived';
export type BrochureVisibility = 'public' | 'unlisted';
export type PublishingMode = 'live' | 'snapshot';

/** How much copy each trip gets. The AI composer writes to the level chosen. */
export type DetailLevel = 'inspiration' | 'standard' | 'detailed';

/** A highlight as it appears in the brochure: a name and one short line. */
export type BrochureHighlight = {
  name: string;
  note: string;
  /** Carried through from the source when the operator hedged it. Never dropped. */
  conditional?: string;
};

/** One step of the journey rail, taken from the structured itinerary. */
export type JourneyStop = {
  location: string;
  dayLabel: string;
  note: string;
};

/**
 * The editorial copy for a page. Every field is optional because different page
 * types use different subsets, and because a missing fact is omitted rather
 * than invented.
 */
export type PageContent = {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  /** One line that sells the trip. Under about 120 characters. */
  proposition?: string;
  intro?: string;
  body?: string[];
  highlights?: BrochureHighlight[];
  learningFocus?: string[];
  keyLocations?: string[];
  journey?: JourneyStop[];
  inclusions?: string[];
  /** Conditional wording lifted from the trip, e.g. "subject to availability". */
  conditions?: string[];
  meta?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Chosen from the trip's approved imagery only. */
  imageUrls?: string[];
  /* The "Why <country>" page that closes a trip's run of pages. */
  /** Why this country is the right place to teach the subject. */
  whyCountry?: string;
  /** Premium Choice's own recommendation, in its own voice. */
  pctView?: string;
  /** Who it suits, e.g. "Years 9–11 (ages 13–16)". A recommendation, not a fact. */
  ageGroup?: string;
  /** A note on price, typed by a person, never by the composer: the trip's base price is not for print. */
  priceRange?: string;
  /** Prices by date, free text on both sides, typed by a person and kept through a rewrite. */
  priceBands?: { dates: string; price: string }[];
  /** Exactly five, each grounded in something the trip does. */
  educationalValues?: { title: string; detail: string }[];
};

export type BrochurePage = {
  id: number;
  pageType: PageType;
  sortOrder: number;
  tripId: number | null;
  subjectId: number | null;
  countryId: number | null;
  layoutVariant: LayoutVariant;
  content: PageContent;
  backgroundImage: string | null;
  settings: Record<string, unknown>;
  hidden: boolean;
  copyStatus: 'ai' | 'reviewed' | 'approved';
};

export type BrochureDesign = {
  coverTheme?: 'light' | 'dark';
  showPricing?: boolean;
  /** The "About Premium Choice" introduction. On unless turned off. */
  showIntro?: boolean;
  showSafety?: boolean;
  showApp?: boolean;
  showItinerary?: boolean;
  showTerms?: boolean;
  showClientLogo?: boolean;
  /** Prepared-by contact, taken from a team record rather than hardcoded. */
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type Brochure = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  kind: BrochureKind;
  status: BrochureStatus;
  visibility: BrochureVisibility;
  publishingMode: PublishingMode;
  detailLevel: DetailLevel;
  clientName: string | null;
  clientLogo: string | null;
  coverImage: string | null;
  introText: string | null;
  closingText: string | null;
  tripIds: number[];
  subjectIds: number[];
  countryIds: number[];
  design: BrochureDesign;
  hasPassword: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ─────────────────────────────── mapping ─────────────────────────────── */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function mapBrochure(row: any): Brochure {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? null,
    kind: row.kind ?? 'custom',
    status: row.status ?? 'draft',
    visibility: row.visibility ?? 'unlisted',
    publishingMode: row.publishing_mode ?? 'live',
    detailLevel: row.detail_level ?? 'standard',
    clientName: row.client_name ?? null,
    clientLogo: row.client_logo ?? null,
    coverImage: row.cover_image ?? null,
    introText: row.intro_text ?? null,
    closingText: row.closing_text ?? null,
    tripIds: asArray<number>(row.trip_ids),
    subjectIds: asArray<number>(row.subject_ids),
    countryIds: asArray<number>(row.country_ids),
    design: (row.design ?? {}) as BrochureDesign,
    hasPassword: Boolean(row.password_hash),
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBrochurePage(row: any): BrochurePage {
  return {
    id: row.id,
    pageType: row.page_type,
    sortOrder: row.sort_order ?? 0,
    tripId: row.trip_id ?? null,
    subjectId: row.subject_id ?? null,
    countryId: row.country_id ?? null,
    layoutVariant: row.layout_variant ?? 'a',
    content: (row.content ?? {}) as PageContent,
    backgroundImage: row.background_image ?? null,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    hidden: Boolean(row.hidden),
    copyStatus: row.copy_status ?? 'ai',
  };
}

/**
 * Pages that occupy a full spread on their own rather than pairing with a
 * neighbour. The cover and back cover are the obvious ones; a full-bleed trip
 * hero also reads better alone.
 */
export const isSingleLeaf = (p: BrochurePage) =>
  p.pageType === 'cover' || p.pageType === 'backCover';

/** Human labels for the admin and the table of contents. */
export const PAGE_LABELS: Record<PageType, string> = {
  cover: 'Cover',
  brandIntroduction: 'Introduction',
  contents: 'Contents',
  textEditorial: 'Editorial',
  subjectDivider: 'Subject divider',
  destinationDivider: 'Destination divider',
  tripHero: 'Trip hero',
  tripOverview: 'Trip overview',
  tripHighlights: 'Trip highlights',
  tripItinerary: 'Journey',
  tripGallery: 'Gallery',
  tripWhy: 'Why this country',
  safety: 'Health & safety',
  howItWorks: 'How it works',
  appFeature: 'Our technology',
  callToAction: 'Get started',
  contact: 'Contact',
  backCover: 'Back cover',
};
