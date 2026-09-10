import { describe, expect, it } from 'vitest';
import { continentOf, groupSpreads, introSummary, orderByContinent } from '@/lib/brochure/spreads';

describe('introSummary', () => {
  it('leaves a short introduction alone', () => {
    const s = 'Seven days tracing Japanese design from sumo stables to digital art.';
    expect(introSummary([s])).toBe(s);
  });

  it('cuts a long one at a sentence, never mid-thought', () => {
    const long =
      'Prepare for an eight-day journey through Vietnam. ' +
      'From the streets of Hanoi to the limestone islands of Ha Long Bay, every day offers something new. ' +
      'Discover the heritage of the Temple of Literature and explore the Old Quarter by cyclo. ' +
      'Travel into the Ba Vi countryside to meet local residents and pick tea leaves. ' +
      'Spend a night cruising through Ha Long Bay, kayaking around hidden lagoons.';
    const out = introSummary([long], 200);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith('.')).toBe(true);
    expect(long.startsWith(out)).toBe(true);
  });

  it('keeps a single over-long sentence whole rather than truncating it', () => {
    const one = 'A single sentence that runs well past the budget it was given and simply does not stop.';
    expect(introSummary([one], 20)).toBe(one);
  });

  it('takes the first paragraph only', () => {
    expect(introSummary(['First.', 'Second.'])).toBe('First.');
  });

  it('copes with nothing', () => {
    expect(introSummary([])).toBe('');
    expect(introSummary([''])).toBe('');
  });
});

describe('groupSpreads', () => {
  const spread = (id: number, country: string | null, subject: string | null) =>
    ({ tripId: id, trip: { country, subject } as any, content: {}, images: [] }) as any;

  it('groups by country', () => {
    const g = groupSpreads([spread(1, 'Japan', 'Art'), spread(2, 'Iceland', 'Geography')]);
    expect(g.map((x) => x.label)).toEqual(['Japan', 'Iceland']);
  });

  it('does not group when there is only one group', () => {
    const g = groupSpreads([spread(1, 'Japan', 'Art'), spread(2, 'Japan', 'History')]);
    expect(g).toHaveLength(1);
    expect(g[0].label).toBe('');
  });

  it('collects the ungrouped under one heading, and puts it last', () => {
    const g = groupSpreads([spread(1, null, null), spread(2, 'Japan', 'Art'), spread(3, 'Iceland', 'Geography')]);
    expect(g.map((x) => x.label)).toEqual(['Japan', 'Iceland', 'More trips']);
  });

  it('can group by subject instead', () => {
    const g = groupSpreads([spread(1, 'Japan', 'Art'), spread(2, 'Iceland', 'Geography')], 'subject');
    expect(g.map((x) => x.label)).toEqual(['Art', 'Geography']);
  });
});

describe('orderByContinent', () => {
  const s = (id: number, countrySlug: string | null, city: string | null, title = `T${id}`) =>
    ({ tripId: id, trip: { countrySlug, city, title } as any, content: {}, images: [] }) as any;

  const cities = (out: any[]) => out.map((x) => x.trip!.city);

  it('runs continent by continent, in the menu order', () => {
    const out = orderByContinent([
      s(1, 'usa', 'New York'),
      s(2, 'kenya', 'Nairobi'),
      s(3, 'spain', 'Barcelona'),
      s(4, 'japan', 'Tokyo'),
      s(5, 'oman', 'Salalah'),
      s(6, 'australia', 'Brisbane'),
    ]);
    expect(out.map((x) => continentOf(x.trip))).toEqual([
      'Europe',
      'Asia',
      'Middle East',
      'Africa',
      'Oceania',
      'North America',
    ]);
  });

  it('puts the cities of a continent in alphabetical order', () => {
    const out = orderByContinent([
      s(1, 'united-kingdom', 'London'),
      s(2, 'austria', 'Vienna'),
      s(3, 'spain', 'Barcelona'),
      s(4, 'greece', 'Athens'),
    ]);
    expect(cities(out)).toEqual(['Athens', 'Barcelona', 'London', 'Vienna']);
  });

  it('keeps trips that share a city in a stable, alphabetical order', () => {
    const out = orderByContinent([
      s(1, 'spain', 'Barcelona', 'Gaudí and the coast'),
      s(2, 'spain', 'Barcelona', 'Barcelona uncovered'),
    ]);
    expect(out.map((x) => x.trip!.title)).toEqual(['Barcelona uncovered', 'Gaudí and the coast']);
  });

  it('files a multi-country tour under its first real country', () => {
    expect(continentOf({ countrySlug: 'london-france-and-belgium' } as any)).toBe('Europe');
  });

  it('sends a trip with no country it knows to the end, without dropping it', () => {
    const out = orderByContinent([s(1, 'atlantis', 'Somewhere'), s(2, 'spain', 'Barcelona')]);
    expect(out.map((x) => x.tripId)).toEqual([2, 1]);
  });

  it('does not mutate the array it was given', () => {
    const input = [s(1, 'japan', 'Tokyo'), s(2, 'spain', 'Barcelona')];
    orderByContinent(input);
    expect(input.map((x) => x.tripId)).toEqual([1, 2]);
  });
});

describe('groupSpreads by continent', () => {
  const s = (id: number, countrySlug: string, city: string) =>
    ({ tripId: id, trip: { countrySlug, city, title: `T${id}` } as any, content: {}, images: [] }) as any;

  it('labels each group with its continent', () => {
    const ordered = orderByContinent([s(1, 'japan', 'Tokyo'), s(2, 'spain', 'Barcelona'), s(3, 'italy', 'Rome')]);
    const groups = groupSpreads(ordered, 'continent');
    expect(groups.map((g) => g.label)).toEqual(['Europe', 'Asia']);
    expect(groups[0].spreads.map((x) => x.trip!.city)).toEqual(['Barcelona', 'Rome']);
  });
});
