import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { mapStructured, type ItineraryDayView } from '@/lib/itinerary/schema';

/**
 * Cookie-less anon client: public pages must stay statically renderable
 * (generateStaticParams + on-demand revalidation), so no cookies() here.
 * RLS restricts anon reads to published content.
 */
function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export type ItineraryDay = {
  label: string | null;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
};

/** At-a-glance country facts shown beside the trip overview. */
export type CountryFacts = {
  capital: string | null;
  currency: string | null;
  languages: string | null;
  timezone: string | null;
  population: string | null;
  avgTempC: number | null;
  bestTime: string | null;
};

/** Null when the country has no facts filled in, so callers can skip the panel. */
export function mapCountryFacts(row: any): CountryFacts | null {
  if (!row) return null;
  const facts: CountryFacts = {
    capital: row.capital ?? null,
    currency: row.currency ?? null,
    languages: row.languages ?? null,
    timezone: row.timezone ?? null,
    population: row.population ?? null,
    avgTempC: row.avg_temp_c === null || row.avg_temp_c === undefined ? null : Number(row.avg_temp_c),
    bestTime: row.best_time ?? null,
  };
  return Object.values(facts).some((v) => v !== null && v !== '') ? facts : null;
}

/** A gallery photo with the alt text that describes it. */
export type GalleryImage = {
  url: string;
  alt: string;
};

/** Accepts both the object form and bare URL strings from older rows. */
export function normalizeGallery(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ url: entry, alt: '' }];
    if (entry && typeof entry === 'object' && typeof (entry as any).url === 'string') {
      return [{ url: (entry as any).url, alt: String((entry as any).alt ?? '') }];
    }
    return [];
  });
}

export type Trip = {
  id: number;
  slug: string;
  title: string;
  subject: string;
  subjectSlug: string;
  country: string;
  countrySlug: string;
  countryFacts: CountryFacts | null;
  city: string | null;
  durationDays: number;
  durationNights: number;
  departs: string;
  heroImage: string | null;
  heroAlt: string;
  gallery: GalleryImage[];
  overview: string[];
  includes: string[];
  itinerary: ItineraryDay[];
  featured: boolean;
};

export type TripSummary = Omit<Trip, 'overview' | 'includes' | 'itinerary'>;

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ------------------------------------------------------------------ */
/* Dev fallback: reads the seed JSON when Supabase env vars are absent */
/* so the site can be previewed before a project is provisioned.      */
/* Production always uses the database.                               */
/* ------------------------------------------------------------------ */

const FEATURED = new Set(['jordan', 'iceland', 'london', 'berlin', 'paris', 'athens']);

const FALLBACK_TERMS = [
  'Upon confirmation of the booking, a 25% deposit is non-refundable.',
  'Passport copies of all passengers are required within 10 days of confirming the booking.',
  'Cancellation 90–61 days before departure: 50% of the total cost is charged.',
  'Cancellation 60–31 days before departure: 75% of the total cost is charged.',
  'Cancellation 30–1 day before departure: no refund is given.',
  'Visa refusal or no appointment available: 25% non-refundable from the date of confirmation; 90–61 days 50%, 60–31 days 75%, 30–1 day 100% non-refundable.',
  'If passenger numbers are reduced, rates are subject to revision.',
];

async function fallbackTrips(): Promise<Trip[]> {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const seedPath = join(process.cwd(), 'reference', 'trips-seed.json');
  if (!existsSync(seedPath)) {
    throw new Error(
      'Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not set, ' +
        'and the local dev fallback (reference/trips-seed.json) is not available in this environment. ' +
        'Set the env vars in your hosting provider and redeploy.'
    );
  }
  const raw = readFileSync(seedPath, 'utf8');
  const seed = JSON.parse(raw).trips as {
    slug: string; title: string; subject: string; country: string; city: string;
    duration: string; departs: string; hero_image: string; status: string;
    overview: string[]; includes: string[];
    itinerary: { label: string; title: string; description: string }[];
  }[];
  return seed
    .filter((t) => t.status === 'published')
    .map((t, i) => {
      const m = t.duration.match(/(\d+)\s*days?\s*\/\s*(\d+)\s*nights?/i)!;
      return {
        id: i + 1,
        slug: t.slug,
        title: t.title,
        subject: t.subject,
        subjectSlug: slugify(t.subject),
        country: t.country,
        countrySlug: slugify(t.country),
        countryFacts: null,
        city: t.city,
        durationDays: Number(m[1]),
        durationNights: Number(m[2]),
        departs: t.departs,
        heroImage: t.hero_image,
        heroAlt: '',
        gallery: [],
        overview: t.overview,
        includes: t.includes,
        itinerary: t.itinerary.map((d) => ({ ...d, imageUrl: null, imageAlt: '' })),
        featured: FEATURED.has(t.slug),
      };
    });
}

/* ------------------------------------------------------------------ */
/* Database queries                                                    */
/* ------------------------------------------------------------------ */

const TRIP_SELECT =
  'id, slug, title, city, duration_days, duration_nights, departs, hero_image, hero_alt, gallery, overview, includes, featured, subjects(name, slug), countries(name, slug, capital, currency, languages, timezone, population, avg_temp_c, best_time), itinerary_days(label, title, description, sort_order, image_url, image_alt)';
// Safety net until the newer migrations have been run on the live database.
const TRIP_SELECT_LEGACY = TRIP_SELECT.replace('hero_image, hero_alt, gallery,', 'hero_image,')
  .replace(', image_url, image_alt)', ')')
  .replace(
    'countries(name, slug, capital, currency, languages, timezone, population, avg_temp_c, best_time)',
    'countries(name, slug)'
  );
/** Columns added by migrations the live database may not have run yet. */
const PENDING_COLUMNS = [
  'gallery',
  'hero_alt',
  'image_url',
  'image_alt',
  'capital',
  'currency',
  'languages',
  'timezone',
  'population',
  'avg_temp_c',
  'best_time',
];
const isMissingNewColumn = (message: string | undefined) =>
  Boolean(message && PENDING_COLUMNS.some((c) => message.includes(c)));

// Supabase returns to-one relations as objects; typing loosely here keeps
// the mapper independent of generated types.
function mapTrip(row: any): Trip {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subject: row.subjects?.name ?? '',
    subjectSlug: row.subjects?.slug ?? '',
    country: row.countries?.name ?? '',
    countrySlug: row.countries?.slug ?? '',
    countryFacts: mapCountryFacts(row.countries),
    city: row.city,
    durationDays: row.duration_days,
    durationNights: row.duration_nights,
    departs: row.departs,
    heroImage: row.hero_image,
    heroAlt: row.hero_alt ?? '',
    gallery: normalizeGallery(row.gallery),
    overview: row.overview ?? [],
    includes: row.includes ?? [],
    itinerary: (row.itinerary_days ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((d: any) => ({
        label: d.label,
        title: d.title,
        description: d.description,
        imageUrl: d.image_url ?? null,
        imageAlt: d.image_alt ?? '',
      })),
    featured: row.featured,
  };
}

export async function getPublishedTrips(): Promise<Trip[]> {
  if (!hasSupabase) return fallbackTrips();
  const db = createClient();
  let { data, error } = await db
    .from('trips')
    .select(TRIP_SELECT)
    .eq('status', 'published')
    .order('title');
  if (isMissingNewColumn(error?.message)) {
    const retry = await db
      .from('trips')
      .select(TRIP_SELECT_LEGACY)
      .eq('status', 'published')
      .order('title');
    data = retry.data as any;
    error = retry.error;
  }
  if (error) throw new Error(`getPublishedTrips: ${error.message}`);
  return (data ?? []).map(mapTrip);
}

export async function getFeaturedTrips(): Promise<Trip[]> {
  const trips = await getPublishedTrips();
  return trips.filter((t) => t.featured);
}

export async function getTripBySlug(slug: string): Promise<Trip | null> {
  if (!hasSupabase) {
    const trips = await fallbackTrips();
    return trips.find((t) => t.slug === slug) ?? null;
  }
  const db = createClient();
  let { data, error } = await db
    .from('trips')
    .select(TRIP_SELECT)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (isMissingNewColumn(error?.message)) {
    const retry = await db
      .from('trips')
      .select(TRIP_SELECT_LEGACY)
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle();
    data = retry.data as any;
    error = retry.error;
  }
  if (error) throw new Error(`getTripBySlug(${slug}): ${error.message}`);
  return data ? mapTrip(data) : null;
}

export async function getBookingTerms(): Promise<string[]> {
  if (!hasSupabase) return FALLBACK_TERMS;
  const db = createClient();
  const { data, error } = await db
    .from('booking_terms')
    .select('text, sort_order')
    .order('sort_order');
  if (error) throw new Error(`getBookingTerms: ${error.message}`);
  return (data ?? []).map((t) => t.text);
}

export type SubjectSummary = {
  name: string;
  slug: string;
  tripCount: number;
  countries: string[];
  heroImage: string | null;
};

/** Subjects that have at least one published trip, with card metadata. */
/**
 * The subject's own write-up, shown at the top of its public page. Null while
 * unwritten — and while the subject_description migration has not been run —
 * so the page simply skips the section.
 */
export async function getSubjectDescription(slug: string): Promise<string | null> {
  if (!hasSupabase) return null;
  const db = createClient();
  const { data, error } = await db
    .from('subjects')
    .select('description')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return (data.description as string | null)?.trim() || null;
}

export async function getSubjects(): Promise<SubjectSummary[]> {
  const trips = await getPublishedTrips();
  const map = new Map<string, SubjectSummary>();
  for (const trip of trips) {
    if (!trip.subjectSlug) continue;
    const entry = map.get(trip.subjectSlug) ?? {
      name: trip.subject,
      slug: trip.subjectSlug,
      tripCount: 0,
      countries: [],
      heroImage: null,
    };
    entry.tripCount += 1;
    if (trip.country && !entry.countries.includes(trip.country)) entry.countries.push(trip.country);
    if (!entry.heroImage && trip.heroImage) entry.heroImage = trip.heroImage;
    map.set(trip.subjectSlug, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every subject in the catalogue, including those without a published trip
 * yet. Trip-derived stats are overlaid where they exist, so a subject page or
 * menu can show counts when available without dropping the rest of the
 * curriculum.
 */
export async function getAllSubjects(): Promise<SubjectSummary[]> {
  const withTrips = await getSubjects();
  if (!hasSupabase) return withTrips;
  const db = createClient();
  const { data, error } = await db.from('subjects').select('name, slug').order('name');
  if (error || !data) return withTrips;
  const bySlug = new Map(withTrips.map((s) => [s.slug, s]));
  return data.map(
    (r: any) =>
      bySlug.get(r.slug) ?? { name: r.name, slug: r.slug, tripCount: 0, countries: [], heroImage: null }
  );
}

/**
 * Days with their structured presentation layer, for the new timeline.
 * Returns an empty array if the structured columns are not present yet, so the
 * trip page falls back to the previous rendering.
 */
export async function getItineraryDays(tripId: number): Promise<ItineraryDayView[]> {
  if (!hasSupabase) return [];
  const db = createClient();
  const { data, error } = await db
    .from('itinerary_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order');
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    sortOrder: r.sort_order,
    label: r.label,
    title: r.title,
    description: r.description,
    imageUrl: r.image_url ?? null,
    imageAlt: r.image_alt ?? '',
    structured: mapStructured(r),
  }));
}

export async function getTripHighlights(tripId: number): Promise<string[]> {
  if (!hasSupabase) return [];
  const db = createClient();
  const { data, error } = await db.from('trips').select('trip_highlights').eq('id', tripId).maybeSingle();
  if (error || !data) return [];
  return Array.isArray(data.trip_highlights) ? (data.trip_highlights as string[]) : [];
}

export type CuratedImage = {
  id: number;
  role: string;
  url: string;
  alt: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  focalX: number;
  focalY: number;
  photographer: string | null;
  licence: string | null;
  sourceUrl: string | null;
  attributionRequired: boolean;
};

/**
 * Curated photography for a trip. Returns an empty array when the trip_images
 * migration has not been run, so pages fall back to the legacy fields.
 */
export async function getCuratedImages(tripId: number): Promise<CuratedImage[]> {
  if (!hasSupabase) return [];
  const db = createClient();
  const { data, error } = await db
    .from('trip_images')
    .select('id, role, url, alt_text, caption, width, height, focal_x, focal_y, photographer, licence, source_url, attribution_required, sort_order')
    .eq('trip_id', tripId)
    .eq('approved', true)
    .order('sort_order');
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    role: r.role,
    url: r.url,
    alt: r.alt_text ?? '',
    caption: r.caption,
    width: r.width,
    height: r.height,
    focalX: Number(r.focal_x ?? 0.5),
    focalY: Number(r.focal_y ?? 0.5),
    photographer: r.photographer,
    licence: r.licence,
    sourceUrl: r.source_url,
    attributionRequired: Boolean(r.attribution_required),
  }));
}

export type CountryContent = {
  intro: string | null;
  educationNotes: string | null;
  curriculumLinks: { subject: string; note: string }[];
  climateSummary: string | null;
  seasons: { season: string; months: string; note: string }[];
  safetyNotes: string | null;
  gettingThere: string | null;
  usefulPhrases: { phrase: string; meaning: string }[];
};

/** Editorial content for a country master page, or null if not written yet. */
export async function getCountryContent(slug: string): Promise<CountryContent | null> {
  if (!hasSupabase) return null;
  const db = createClient();
  const { data, error } = await db
    .from('countries')
    .select('intro, education_notes, curriculum_links, climate_summary, seasons, safety_notes, getting_there, useful_phrases')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  const content: CountryContent = {
    intro: data.intro,
    educationNotes: data.education_notes,
    curriculumLinks: Array.isArray(data.curriculum_links) ? (data.curriculum_links as any) : [],
    climateSummary: data.climate_summary,
    seasons: Array.isArray(data.seasons) ? (data.seasons as any) : [],
    safetyNotes: data.safety_notes,
    gettingThere: data.getting_there,
    usefulPhrases: Array.isArray(data.useful_phrases) ? (data.useful_phrases as any) : [],
  };
  const written = content.intro || content.educationNotes || content.climateSummary;
  return written ? content : null;
}

/** At-a-glance facts for a country page, or null when nothing is filled in. */
export async function getCountryFacts(slug: string): Promise<CountryFacts | null> {
  if (!hasSupabase) return null;
  const db = createClient();
  const { data, error } = await db
    .from('countries')
    .select('capital, currency, languages, timezone, population, avg_temp_c, best_time')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapCountryFacts(data);
}

/** A country's own photography, replacing the borrowed trip hero. */
export async function getCountryImages(slug: string): Promise<CuratedImage[]> {
  if (!hasSupabase) return [];
  const db = createClient();
  const { data: country } = await db.from('countries').select('id').eq('slug', slug).maybeSingle();
  if (!country) return [];
  const { data, error } = await db
    .from('country_images')
    .select('id, role, url, alt_text, caption, width, height, focal_x, focal_y, photographer, licence, source_url, attribution_required, sort_order')
    .eq('country_id', country.id)
    .eq('approved', true)
    .order('sort_order');
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id, role: r.role, url: r.url, alt: r.alt_text ?? '', caption: r.caption,
    width: r.width, height: r.height,
    focalX: Number(r.focal_x ?? 0.5), focalY: Number(r.focal_y ?? 0.42),
    photographer: r.photographer, licence: r.licence, sourceUrl: r.source_url,
    attributionRequired: Boolean(r.attribution_required),
  }));
}

export type CountrySummary = {
  name: string;
  slug: string;
  tripCount: number;
  subjects: string[];
  heroImage: string | null;
};

/** Countries that have at least one published trip, with card metadata. */
export async function getCountries(): Promise<CountrySummary[]> {
  const trips = await getPublishedTrips();
  const map = new Map<string, CountrySummary>();
  for (const trip of trips) {
    if (!trip.countrySlug) continue;
    const entry = map.get(trip.countrySlug) ?? {
      name: trip.country,
      slug: trip.countrySlug,
      tripCount: 0,
      subjects: [],
      heroImage: null,
    };
    entry.tripCount += 1;
    if (trip.subject && !entry.subjects.includes(trip.subject)) entry.subjects.push(trip.subject);
    if (!entry.heroImage && trip.heroImage) entry.heroImage = trip.heroImage;
    map.set(trip.countrySlug, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPublishedTripCount(): Promise<number> {
  if (!hasSupabase) return (await fallbackTrips()).length;
  const db = createClient();
  const { count, error } = await db
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');
  if (error) throw new Error(`getPublishedTripCount: ${error.message}`);
  return count ?? 0;
}
