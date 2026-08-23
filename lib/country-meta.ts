/**
 * Continent grouping and flag codes for the destinations menu, keyed by the
 * country's slug. Flags are ISO 3166-1 alpha-2 codes rendered via flagcdn;
 * multi-country routes carry one flag per leg.
 */

export type CountryMeta = {
  continent: string;
  flags: string[];
  /**
   * A destination that is really several countries. The catalogue files a
   * multi-country tour under one record — the battlefields tour is filed under
   * "London, France & Belgium" — but nobody browses for that. Listing the real
   * countries here keeps the combined entry out of the menu and puts its trips
   * on each of those countries' pages instead.
   */
  partOf?: string[];
};

/** Display order for the menu — the Middle East sits apart from Asia because groups depart from Dubai. */
export const CONTINENT_ORDER = [
  'Europe',
  'Asia',
  'Middle East',
  'Africa',
  'Oceania',
  'North America',
] as const;

export const COUNTRY_META: Record<string, CountryMeta> = {
  austria: { continent: 'Europe', flags: ['at'] },
  belgium: { continent: 'Europe', flags: ['be'] },
  'czech-republic': { continent: 'Europe', flags: ['cz'] },
  france: { continent: 'Europe', flags: ['fr'] },
  germany: { continent: 'Europe', flags: ['de'] },
  greece: { continent: 'Europe', flags: ['gr'] },
  iceland: { continent: 'Europe', flags: ['is'] },
  ireland: { continent: 'Europe', flags: ['ie'] },
  italy: { continent: 'Europe', flags: ['it'] },
  'london-france-and-belgium': {
    continent: 'Europe',
    flags: ['gb', 'fr', 'be'],
    partOf: ['united-kingdom', 'france', 'belgium'],
  },
  netherlands: { continent: 'Europe', flags: ['nl'] },
  spain: { continent: 'Europe', flags: ['es'] },
  switzerland: { continent: 'Europe', flags: ['ch'] },
  turkey: { continent: 'Europe', flags: ['tr'] },
  'united-kingdom': { continent: 'Europe', flags: ['gb'] },

  cambodia: { continent: 'Asia', flags: ['kh'] },
  china: { continent: 'Asia', flags: ['cn'] },
  'hong-kong': { continent: 'Asia', flags: ['hk'] },
  india: { continent: 'Asia', flags: ['in'] },
  indonesia: { continent: 'Asia', flags: ['id'] },
  japan: { continent: 'Asia', flags: ['jp'] },
  mongolia: { continent: 'Asia', flags: ['mn'] },
  nepal: { continent: 'Asia', flags: ['np'] },
  singapore: { continent: 'Asia', flags: ['sg'] },
  'south-korea': { continent: 'Asia', flags: ['kr'] },
  'sri-lanka': { continent: 'Asia', flags: ['lk'] },
  vietnam: { continent: 'Asia', flags: ['vn'] },

  jordan: { continent: 'Middle East', flags: ['jo'] },
  oman: { continent: 'Middle East', flags: ['om'] },
  'saudi-arabia': { continent: 'Middle East', flags: ['sa'] },
  'united-arab-emirates': { continent: 'Middle East', flags: ['ae'] },

  kenya: { continent: 'Africa', flags: ['ke'] },
  'south-africa': { continent: 'Africa', flags: ['za'] },
  uganda: { continent: 'Africa', flags: ['ug'] },
  zambia: { continent: 'Africa', flags: ['zm'] },

  australia: { continent: 'Oceania', flags: ['au'] },
  'new-zealand': { continent: 'Oceania', flags: ['nz'] },

  usa: { continent: 'North America', flags: ['us'] },
};

/**
 * The country pages a trip belongs on. Usually just its own country; for a
 * multi-country tour, every country it actually visits.
 */
export function countrySlugsFor(slug: string): string[] {
  const parts = COUNTRY_META[slug]?.partOf;
  return parts && parts.length > 0 ? parts : [slug];
}

/** Where a trip's country label should link to. */
export const primaryCountrySlug = (slug: string) => countrySlugsFor(slug)[0];

/** True for a record that only exists to hold a multi-country tour. */
export const isCombinedCountry = (slug: string) => Boolean(COUNTRY_META[slug]?.partOf?.length);
