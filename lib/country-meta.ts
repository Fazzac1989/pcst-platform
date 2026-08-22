/**
 * Continent grouping and flag codes for the destinations menu, keyed by the
 * country's slug. Flags are ISO 3166-1 alpha-2 codes rendered via flagcdn;
 * multi-country routes carry one flag per leg.
 */

export type CountryMeta = { continent: string; flags: string[] };

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
  'london-france-and-belgium': { continent: 'Europe', flags: ['gb', 'fr', 'be'] },
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
