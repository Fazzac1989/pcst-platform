import { describe, expect, it } from 'vitest';
import { groupSpreads, introSummary } from '@/lib/brochure/spreads';

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
