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
  'South America',
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
 * Every ISO 3166-1 country code, grouped the way the menu groups them. A
 * country added in the admin but missing from COUNTRY_META above still gets
 * its flag and its continent from here — its name is matched against the
 * English names the platform's own Intl data gives for these codes — so a new
 * destination never needs a code change to appear properly in the menu.
 * Georgia, Armenia and Azerbaijan sit with Europe, as travel listings place
 * them; Egypt sits with the Middle East, as it does for groups leaving Dubai.
 */
const CODES_BY_CONTINENT: Record<(typeof CONTINENT_ORDER)[number], string> = {
  Europe:
    'ad al am at az ba be bg by ch cy cz de dk ee es fi fo fr gb ge gg gi gr hr hu ie im is it je li lt lu lv mc md me mk mt nl no pl pt ro rs ru se si sk sm tr ua va xk',
  Asia: 'af bd bn bt cn hk id in jp kg kh kp kr kz la lk mm mn mo mv my np ph pk sg th tj tl tm tw uz vn',
  'Middle East': 'ae bh eg il iq ir jo kw lb om ps qa sa sy ye',
  Africa:
    'ao bf bi bj bw cd cf cg ci cm cv dj dz eh er et ga gh gm gn gq gw ke km lr ls ly ma mg ml mr mu mw mz na ne ng re rw sc sd sh sl sn so ss st sz td tg tn tz ug yt za zm zw',
  Oceania: 'au ck fj fm gu ki mh nc nr nz pf pg pw sb to tv vu ws',
  'North America':
    'ag aw bb bm bs bz ca cr cu cw dm do gd gl gt hn ht jm kn ky lc mx ni pa pr sv tc tt us vc vg vi',
  'South America': 'ar bo br cl co ec fk gf gy pe py sr uy ve',
};

/** Names a teacher or the admin might type that the standard English names don't cover. */
const ALIASES: Record<string, string> = {
  uk: 'gb',
  britain: 'gb',
  'great-britain': 'gb',
  england: 'gb-eng',
  scotland: 'gb-sct',
  wales: 'gb-wls',
  'northern-ireland': 'gb',
  us: 'us',
  america: 'us',
  'united-states-of-america': 'us',
  uae: 'ae',
  emirates: 'ae',
  holland: 'nl',
  'czech-republic': 'cz',
  bosnia: 'ba',
  macedonia: 'mk',
  burma: 'mm',
  myanmar: 'mm',
  macau: 'mo',
  macao: 'mo',
  'hong-kong': 'hk',
  'ivory-coast': 'ci',
  swaziland: 'sz',
  palestine: 'ps',
  'east-timor': 'tl',
  'vatican-city': 'va',
  'democratic-republic-of-the-congo': 'cd',
  'republic-of-the-congo': 'cg',
  'saint-lucia': 'lc',
  'saint-kitts-and-nevis': 'kn',
  'saint-vincent-and-the-grenadines': 'vc',
  'turkiye': 'tr',
};

const normalise = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

let lookup: Map<string, { code: string; continent: string }> | null = null;

function isoLookup() {
  if (lookup) return lookup;
  lookup = new Map();
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    names = null; // no Intl region data: only codes and aliases resolve
  }
  for (const [continent, codes] of Object.entries(CODES_BY_CONTINENT)) {
    for (const code of codes.split(' ')) {
      lookup.set(code, { code, continent });
      const name = names?.of(code.toUpperCase());
      if (name && name.toUpperCase() !== code.toUpperCase()) {
        lookup.set(normalise(name), { code, continent });
        // "Hong Kong SAR China", "Myanmar (Burma)": the part before the qualifier too.
        const plain = normalise(name.replace(/\s*\(.*\)$/, '').replace(/\s+SAR\b.*$/, ''));
        if (plain && !lookup.has(plain)) lookup.set(plain, { code, continent });
      }
    }
  }
  for (const [alias, code] of Object.entries(ALIASES)) {
    const base = lookup.get(code.split('-')[0]);
    if (base) lookup.set(alias, { code, continent: base.continent });
  }
  return lookup;
}

/**
 * The flag(s) and continent for a destination: the hand-kept entry when there
 * is one, otherwise resolved from the country's slug or name. Null only for a
 * name that is not a country at all (a region, a city, a route).
 */
export function metaFor(slug: string, name?: string): CountryMeta | null {
  const known = COUNTRY_META[slug];
  if (known) return known;
  const table = isoLookup();
  const hit = table.get(normalise(slug)) ?? (name ? table.get(normalise(name)) : undefined);
  return hit ? { continent: hit.continent, flags: [hit.code] } : null;
}

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
