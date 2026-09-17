import { describe, expect, it } from 'vitest';
import { CONTENTS_CAPACITY, paginateContents } from '@/lib/brochure/spreads';
import type { TripGroup, TripSpread } from '@/lib/brochure/spreads';

const spread = (id: number): TripSpread => ({ tripId: id, trip: undefined, content: {}, images: [] });
const group = (label: string, n: number, from = 1): TripGroup => ({
  label,
  spreads: Array.from({ length: n }, (_, i) => spread(from + i)),
});

/** Every trip that went in comes out, once, in the same order. */
const ids = (pages: TripGroup[][]) => pages.flatMap((p) => p.flatMap((g) => g.spreads.map((s) => s.tripId)));

describe('paginateContents', () => {
  it('leaves a short contents on one page', () => {
    const pages = paginateContents([group('Vietnam', 2), group('Japan', 3, 10)]);
    expect(pages).toHaveLength(1);
    expect(pages[0].map((g) => g.label)).toEqual(['Vietnam', 'Japan']);
  });

  it('splits the collection that printed as three sheets', () => {
    // 37 trips across 24 countries, as the live brochure has them.
    const groups = Array.from({ length: 24 }, (_, i) => group(`Country ${i + 1}`, i < 13 ? 2 : 1, i * 10));
    const pages = paginateContents(groups);
    expect(pages.length).toBeGreaterThan(1);
    expect(ids(pages)).toHaveLength(13 * 2 + 11);
  });

  it('never loses or repeats a trip', () => {
    const groups = [group('A', 9), group('B', 1, 100), group('C', 14, 200), group('D', 3, 400)];
    const before = groups.flatMap((g) => g.spreads.map((s) => s.tripId));
    expect(ids(paginateContents(groups))).toEqual(before);
  });

  it('repeats the heading when a group runs over a page', () => {
    // One group longer than a page has to be split, and a reader arriving on
    // the second page still needs to know which country they are in.
    const pages = paginateContents([group('Japan', 40)]);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((p) => p.every((g) => g.label === 'Japan'))).toBe(true);
  });

  it('keeps every page within the capacity it was given', () => {
    const groups = Array.from({ length: 20 }, (_, i) => group(`G${i}`, (i % 4) + 1, i * 10));
    const pages = paginateContents(groups);
    for (const page of pages) {
      const cost = page.reduce((sum, g) => sum + (g.label ? 49 : 0) + g.spreads.length * 91, 0);
      expect(cost).toBeLessThanOrEqual(CONTENTS_CAPACITY);
    }
  });

  it('handles an ungrouped list, and an empty one', () => {
    const pages = paginateContents([{ label: '', spreads: Array.from({ length: 30 }, (_, i) => spread(i)) }]);
    expect(ids(pages)).toHaveLength(30);
    expect(pages.every((p) => p.every((g) => g.label === ''))).toBe(true);
    expect(paginateContents([])).toEqual([[]]);
  });

  it('makes progress even when a single entry exceeds the capacity', () => {
    // A guard against an infinite loop rather than a real layout.
    const pages = paginateContents([group('A', 3)], 10);
    expect(ids(pages)).toEqual([1, 2, 3]);
    expect(pages).toHaveLength(3);
  });
});
