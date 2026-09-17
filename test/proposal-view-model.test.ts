import { describe, expect, it } from 'vitest';
import {
  applyOverrides,
  buildViewModel,
  isPlausibleToken,
  isShareable,
  type ProposalRows,
} from '@/lib/brochure/proposal-view-model';
import { freePlacesTotal } from '@/lib/brochure/proposal-schema';

/**
 * The resolver decides what a school actually reads: which price, which dates,
 * whether their link still works. These are the rules that would be expensive
 * to get wrong, so they are tested against the pure half rather than through a
 * rendered page.
 */

const rows = (over: Partial<ProposalRows> = {}): ProposalRows => ({
  brochure: { id: 1, slug: 'x', status: 'sent', content: {}, overrides: {} },
  days: [],
  items: [],
  flights: [],
  terms: null,
  images: [],
  publicUrl: (p) => `https://cdn.test/${p}`,
  ...over,
});

describe('applyOverrides', () => {
  it('lets a real value win', () => {
    expect(applyOverrides({ price: 100 }, { price: 250 })).toEqual({ price: 250 });
  });

  it('ignores a blank string, so a half-filled override cannot erase a price note', () => {
    expect(applyOverrides({ note: 'per student' }, { note: '' })).toEqual({ note: 'per student' });
  });

  it('ignores null and undefined', () => {
    expect(applyOverrides({ a: 1, b: 2 }, { a: null, b: undefined })).toEqual({ a: 1, b: 2 });
  });

  it('ignores an empty array rather than emptying a list', () => {
    expect(applyOverrides({ items: ['one', 'two'] }, { items: [] })).toEqual({
      items: ['one', 'two'],
    });
  });

  it('replaces a list wholesale when the override has entries', () => {
    expect(applyOverrides({ items: ['one', 'two'] }, { items: ['three'] })).toEqual({
      items: ['three'],
    });
  });

  it('merges nested objects field by field', () => {
    const base = { contact: { name: 'PCT', email: 'a@b.c', phones: ['1'] } };
    const out = applyOverrides(base, { contact: { email: 'school@x.ae' } });
    expect(out.contact).toEqual({ name: 'PCT', email: 'school@x.ae', phones: ['1'] });
  });

  it('returns the base untouched when there are no overrides', () => {
    const base = { a: 1 };
    expect(applyOverrides(base, null)).toEqual(base);
    expect(applyOverrides(base, undefined)).toEqual(base);
    expect(applyOverrides(base, 'not an object')).toEqual(base);
  });

  it('does not mutate the base object', () => {
    const base = { a: 1, nested: { b: 2 } };
    applyOverrides(base, { a: 9, nested: { b: 9 } });
    expect(base).toEqual({ a: 1, nested: { b: 2 } });
  });
});

describe('isShareable', () => {
  const now = Date.parse('2026-09-02T12:00:00Z');

  it('refuses a draft — nobody has been sent it', () => {
    expect(isShareable({ status: 'draft' }, now)).toBe(false);
  });

  it('refuses a link whose expiry has passed', () => {
    expect(isShareable({ status: 'sent', share_expires_at: '2026-09-01T00:00:00Z' }, now)).toBe(false);
  });

  it('allows a link that has not expired yet', () => {
    expect(isShareable({ status: 'sent', share_expires_at: '2026-09-03T00:00:00Z' }, now)).toBe(true);
  });

  it('allows a link with no expiry', () => {
    expect(isShareable({ status: 'sent', share_expires_at: null }, now)).toBe(true);
  });

  it('refuses a missing proposal, so a wrong token answers like an expired one', () => {
    expect(isShareable(null, now)).toBe(false);
    expect(isShareable(undefined, now)).toBe(false);
  });

  it('still resolves once a school has viewed or accepted it', () => {
    expect(isShareable({ status: 'viewed' }, now)).toBe(true);
    expect(isShareable({ status: 'accepted' }, now)).toBe(true);
  });
});

describe('isPlausibleToken', () => {
  it('rejects empty, short and missing tokens without a database round trip', () => {
    expect(isPlausibleToken('')).toBe(false);
    expect(isPlausibleToken(null)).toBe(false);
    expect(isPlausibleToken('abc')).toBe(false);
    expect(isPlausibleToken('a'.repeat(31))).toBe(false);
  });

  it('accepts a token of the length we issue', () => {
    // issueStProposalLink uses 24 random bytes as hex.
    expect(isPlausibleToken('a'.repeat(48))).toBe(true);
  });
});

describe('buildViewModel', () => {
  it('attaches timetable rows to the right day', () => {
    const vm = buildViewModel(
      rows({
        days: [
          { id: 10, day_number: 1, sort_order: 1, image_ids: [] },
          { id: 20, day_number: 2, sort_order: 2, image_ids: [] },
        ],
        items: [
          { id: 1, day_id: 20, time_label: '09:00', text: 'Second day', sort_order: 1 },
          { id: 2, day_id: 10, time_label: '10:00', text: 'First day', sort_order: 1 },
        ],
      }),
    );
    expect(vm.days[0].items.map((i) => i.text)).toEqual(['First day']);
    expect(vm.days[1].items.map((i) => i.text)).toEqual(['Second day']);
  });

  it('defaults an unrecognised flight direction to outbound', () => {
    const vm = buildViewModel(
      rows({ flights: [{ id: 1, direction: 'sideways' }, { id: 2, direction: 'return' }] }),
    );
    expect(vm.flights.map((f) => f.direction)).toEqual(['outbound', 'return']);
  });

  it('resolves the hero from the chosen image id', () => {
    const vm = buildViewModel(
      rows({
        brochure: { id: 1, slug: 'x', status: 'sent', content: { heroImageId: 7 }, overrides: {} },
        images: [{ id: 7, storage_path: 'finland/hero.jpg', alt: 'Hero' }],
      }),
    );
    expect(vm.heroImage).toBe('https://cdn.test/finland/hero.jpg');
  });

  it('falls back to a cover image URL when no hero image is chosen', () => {
    const vm = buildViewModel(
      rows({
        brochure: {
          id: 1,
          slug: 'x',
          status: 'sent',
          content: {},
          overrides: {},
          cover_image: 'https://example.test/cover.jpg',
        },
      }),
    );
    expect(vm.heroImage).toBe('https://example.test/cover.jpg');
  });

  it('has no hero rather than a broken one when nothing is set', () => {
    expect(buildViewModel(rows()).heroImage).toBeNull();
  });

  it('survives a day whose image_ids is not an array', () => {
    const vm = buildViewModel(rows({ days: [{ id: 1, day_number: 1, image_ids: null }] }));
    expect(vm.days[0].imageIds).toEqual([]);
  });

  it('defaults the currency to AED but keeps one that is set', () => {
    expect(buildViewModel(rows()).commercials.currency).toBe('AED');
    const vm = buildViewModel(
      rows({ brochure: { id: 1, slug: 'x', status: 'sent', content: {}, overrides: {}, currency: 'EUR' } }),
    );
    expect(vm.commercials.currency).toBe('EUR');
  });

  it('applies a commercial override to the price the school sees', () => {
    const vm = buildViewModel(
      rows({
        brochure: {
          id: 1,
          slug: 'x',
          status: 'sent',
          content: {},
          price_per_student: 11190,
          overrides: { commercials: { pricePerStudent: 9950 } },
        },
      }),
    );
    expect(vm.commercials.pricePerStudent).toBe(9950);
  });

  it('leaves a price alone when the override is blank', () => {
    const vm = buildViewModel(
      rows({
        brochure: {
          id: 1,
          slug: 'x',
          status: 'sent',
          content: {},
          price_per_student: 11190,
          overrides: { commercials: { pricePerStudent: null } },
        },
      }),
    );
    expect(vm.commercials.pricePerStudent).toBe(11190);
  });

  it('reads terms sections, and copes with a set that has none', () => {
    const withTerms = buildViewModel(
      rows({ terms: { id: 2, name: 'Conditions', version: 1, sections: [{ heading: 'A', bodyHtml: '<p>a</p>' }] } }),
    );
    expect(withTerms.terms?.sections).toHaveLength(1);

    const malformed = buildViewModel(rows({ terms: { id: 2, name: 'C', version: 1, sections: null } }));
    expect(malformed.terms?.sections).toEqual([]);
  });

  it('has no terms when none is attached', () => {
    expect(buildViewModel(rows()).terms).toBeNull();
  });

  it('prefers prepared_for over the older client_name', () => {
    const vm = buildViewModel(
      rows({
        brochure: {
          id: 1,
          slug: 'x',
          status: 'sent',
          content: {},
          overrides: {},
          prepared_for: 'Dubai College',
          client_name: 'Old Name',
        },
      }),
    );
    expect(vm.commercials.preparedFor).toBe('Dubai College');
  });
});

describe('freePlacesTotal', () => {
  const base = {
    preparedFor: '',
    travelStart: null,
    travelEnd: null,
    studentCount: null,
    pricePerStudent: null,
    currency: 'AED',
    priceBasisNote: '',
  };

  it('adds teacher and staff places', () => {
    expect(freePlacesTotal({ ...base, freePlacesTeachers: 2, freePlacesPctStaff: 1 })).toBe(3);
  });

  it('treats missing figures as none rather than failing', () => {
    expect(freePlacesTotal({ ...base, freePlacesTeachers: null, freePlacesPctStaff: null })).toBe(0);
    expect(freePlacesTotal({ ...base, freePlacesTeachers: 2, freePlacesPctStaff: null })).toBe(2);
  });
});
