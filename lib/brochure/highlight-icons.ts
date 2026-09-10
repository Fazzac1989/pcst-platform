/**
 * A small icon for a trip highlight.
 *
 * Chosen from the words the highlight already uses, so a museum gets a
 * museum and a glacier gets a mountain, without anyone having to pick one by
 * hand for four hundred highlights. Anything unrecognised gets the plain
 * marker rather than a wrong guess.
 *
 * Each is a 24x24 stroked path, drawn in the brand teal at the size of the
 * line it sits beside.
 */

export type HighlightIcon = { key: string; path: string };

/** The marker for a highlight we cannot place: a simple checked circle. */
const DEFAULT: HighlightIcon = {
  key: 'default',
  path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8.5 12.5l2.5 2.5 4.5-5',
};

/**
 * Word to icon. The first match in this order wins, so the more specific
 * subjects come before the general ones.
 */
const ICONS: { words: string[]; icon: HighlightIcon }[] = [
  {
    words: ['museum', 'gallery', 'exhibition', 'palace', 'citadel', 'castle', 'parliament', 'senate', 'capitol', 'monument', 'memorial'],
    icon: { key: 'museum', path: 'M3 21h18M4 21V10m4 11V10m4 11V10m4 11V10m4 11V10M2 10h20L12 3z' },
  },
  {
    words: ['temple', 'shrine', 'pagoda', 'church', 'cathedral', 'mosque', 'basilica', 'monastery', 'abbey'],
    icon: { key: 'temple', path: 'M12 2v4M9 6h6M5 21V11l7-5 7 5v10M5 21h14M10 21v-5h4v5' },
  },
  {
    words: ['mountain', 'glacier', 'volcano', 'hike', 'trek', 'summit', 'peak', 'alps', 'valley', 'canyon', 'cliff'],
    icon: { key: 'mountain', path: 'M3 20h18L14 7l-4 7-2-3z' },
  },
  {
    words: ['ski', 'snow', 'snowshoe', 'sledge', 'husky', 'ice', 'winter', 'toboggan', 'skiing'],
    icon: { key: 'snow', path: 'M12 2v20M4 7l16 10M20 7L4 17M12 6l2.5-2.5M12 6L9.5 3.5M12 18l2.5 2.5M12 18l-2.5 2.5' },
  },
  {
    words: ['safari', 'wildlife', 'reindeer', 'elephant', 'monkey', 'animal', 'bird', 'marine', 'turtle', 'conservation', 'sanctuary', 'national park'],
    icon: { key: 'wildlife', path: 'M6.5 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4m11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4M9.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4m5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4M12 22c3 0 5-1.8 5-4 0-2-1.6-3-2.6-4.4-.8-1-1.2-2.6-2.4-2.6s-1.6 1.6-2.4 2.6C8.6 15 7 16 7 18c0 2.2 2 4 5 4' },
  },
  {
    words: ['boat', 'cruise', 'sail', 'ferry', 'river', 'lagoon', 'kayak', 'canoe', 'raft', 'lake', 'coast', 'beach', 'snorkel', 'dive', 'reef'],
    icon: { key: 'water', path: 'M2 17c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2M4 13l8-3 8 3M6 13V8l6-4 6 4v5' },
  },
  {
    words: ['train', 'rail', 'shinkansen', 'metro', 'coach', 'bus', 'transfer', 'flight', 'airport', 'fly', 'journey', 'cable car'],
    icon: { key: 'travel', path: 'M6 3h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M4 10h16M8 20l-2 2m10-2 2 2M8.5 13.5h.01m6-.01h.01' },
  },
  {
    words: ['food', 'cooking', 'cuisine', 'dinner', 'lunch', 'tasting', 'paella', 'market', 'chocolate', 'restaurant', 'meal', 'farm', 'harvest'],
    icon: { key: 'food', path: 'M5 3v8a3 3 0 0 0 6 0V3M8 11v10M16 3c-1.5 1.5-2 3-2 5s.5 3 2 3v10' },
  },
  {
    words: ['science', 'lab', 'robot', 'technology', 'innovation', 'space', 'engineering', 'factory', 'stem', 'research', 'observatory'],
    icon: { key: 'science', path: 'M9 2v7L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9V2M8 2h8M7.5 14h9' },
  },
  {
    words: ['business', 'company', 'trading', 'economics', 'stock', 'headquarters', 'enterprise', 'commerce', 'bank'],
    icon: { key: 'business', path: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01M9 13h.01M15 13h.01' },
  },
  {
    words: ['language', 'lesson', 'school', 'study', 'workshop', 'class', 'university', 'seminar', 'exchange', 'literature', 'library'],
    icon: { key: 'study', path: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 19H6a2 2 0 0 0-2 2M8 7h7M8 11h7' },
  },
  {
    words: ['theatre', 'musical', 'concert', 'performance', 'drama', 'film', 'stage', 'dance', 'music', 'orchestra'],
    icon: { key: 'stage', path: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0' },
  },
  {
    words: ['football', 'rugby', 'match', 'stadium', 'sport', 'training', 'tournament', 'golf', 'cricket'],
    icon: { key: 'sport', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 0v18M3 12h18M6 6l12 12M18 6 6 18' },
  },
  {
    words: ['community', 'volunteer', 'service', 'charity', 'orphan', 'village', 'build', 'teaching', 'children'],
    icon: { key: 'community', path: 'M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  },
  {
    words: ['city', 'skyline', 'tower', 'walking tour', 'quarter', 'old town', 'district', 'street'],
    icon: { key: 'city', path: 'M3 21h18M6 21V8l5-4v17M11 21V11h7v10M14 14h.01M14 17h.01M8 12h.01M8 16h.01' },
  },
];

/** The icon for one highlight, chosen from its own words. */
export function highlightIcon(name: string, note = ''): HighlightIcon {
  const text = `${name} ${note}`.toLowerCase();
  for (const { words, icon } of ICONS) {
    if (words.some((w) => text.includes(w))) return icon;
  }
  return DEFAULT;
}
