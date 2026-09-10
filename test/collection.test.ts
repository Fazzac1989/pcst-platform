import { describe, expect, it } from 'vitest';
import {
  groupInclusions,
  shortAge,
  suitsBand,
  travelConflict,
  yearsFrom,
} from '@/lib/brochure/collection';

describe('yearsFrom', () => {
  it('reads the year range and ignores the ages that gloss it', () => {
    expect(yearsFrom('Years 8–11 (ages 12–16)')).toEqual({ from: 8, to: 11 });
  });

  it('copes with hyphens as well as en dashes', () => {
    expect(yearsFrom('Years 7-11 (ages 11-16)')).toEqual({ from: 7, to: 11 });
  });

  it('reads a single year', () => {
    expect(yearsFrom('Year 9')).toEqual({ from: 9, to: 9 });
  });

  it('refuses a range that is not a school year', () => {
    expect(yearsFrom('Years 8–30')).toBeNull();
    expect(yearsFrom('ages 12–16')).toBeNull();
  });

  it('treats nothing written down as unknown, not as everyone', () => {
    expect(yearsFrom(null)).toBeNull();
    expect(yearsFrom('')).toBeNull();
    expect(yearsFrom('Suitable for all')).toBeNull();
  });
});

describe('shortAge', () => {
  it('gives the card the range without the ages', () => {
    expect(shortAge('Years 10–13 (ages 14–18)')).toBe('Years 10–13');
    expect(shortAge('Year 9')).toBe('Year 9');
    expect(shortAge(null)).toBeNull();
  });
});

describe('suitsBand', () => {
  const trip = (from: number, to: number) => ({ years: { from, to } }) as any;

  it('matches when the ranges overlap at all', () => {
    expect(suitsBand(trip(8, 11), { from: 10, to: 11 })).toBe(true);
    expect(suitsBand(trip(10, 13), { from: 7, to: 9 })).toBe(false);
    expect(suitsBand(trip(9, 12), { from: 12, to: 13 })).toBe(true);
  });

  it('never matches a trip with no recorded year group', () => {
    expect(suitsBand({ years: null } as any, { from: 7, to: 9 })).toBe(false);
  });
});

describe('travelConflict', () => {
  it('catches a country note describing a different city', () => {
    // The real case: the Dhofar trip flies to Salalah, the country note is Muscat.
    expect(
      travelConflict({
        city: 'Salalah',
        country: 'Oman',
        gettingThere:
          'Muscat is roughly a one-hour flight from Dubai with several direct daily services, ' +
          'and overland transfers by coach are also practical for many itineraries.',
      }),
    ).toBe(true);
  });

  it('is quiet when the note names the trip’s own city', () => {
    expect(
      travelConflict({
        city: 'Barcelona',
        country: 'Spain',
        gettingThere: 'Barcelona is about a seven-hour direct flight from Dubai.',
      }),
    ).toBe(false);
  });

  it('reads only the first named place, so a multi-city trip still matches', () => {
    expect(
      travelConflict({
        city: 'Tokyo /Kyoto',
        country: 'Japan',
        gettingThere: 'Tokyo is a nine-hour direct flight from Dubai.',
      }),
    ).toBe(false);
  });

  it('says nothing when there is no note or no city', () => {
    expect(travelConflict({ city: 'Salalah', country: 'Oman', gettingThere: null })).toBe(false);
    expect(travelConflict({ city: null, country: 'Oman', gettingThere: 'Muscat is an hour away.' })).toBe(false);
  });
});

describe('groupInclusions', () => {
  it('sorts a real list into the groups a school reads', () => {
    const groups = groupInclusions([
      'Return flights from Dubai',
      'Three nights in a four-star hotel',
      'One night desert camp',
      'All airport transfers',
      'Breakfast daily and three dinners',
      'Entrance to Al Baleed Archaeological Park',
      'Full-time Premium Choice tour manager',
    ]);
    const labels = groups.map((g) => g.label);
    expect(labels).toEqual([
      'Travel and transfers',
      'Accommodation',
      'Meals',
      'Activities and entries',
      'Also included',
    ]);
    expect(groups[0].items).toEqual(['Return flights from Dubai', 'All airport transfers']);
    expect(groups[4].items).toEqual(['Full-time Premium Choice tour manager']);
  });

  it('loses nothing it was given', () => {
    const items = ['a thing', 'another thing', 'Two nights in Rome'];
    const total = groupInclusions(items).flatMap((g) => g.items);
    expect(total.sort()).toEqual([...items].sort());
  });

  it('does not match a word inside another word', () => {
    // "tonight" is not a night, and "detour" is not a tour.
    const groups = groupInclusions(['A talk tonight about the detour']);
    expect(groups.map((g) => g.label)).toEqual(['Also included']);
  });

  it('returns nothing for nothing', () => {
    expect(groupInclusions([])).toEqual([]);
  });
});
