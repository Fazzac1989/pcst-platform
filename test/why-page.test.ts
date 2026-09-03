import { describe, expect, it } from 'vitest';
import { gatherTrips, hasWhyPage } from '@/lib/brochure/spreads';
import type { BrochurePage } from '@/lib/brochure/schema';

const page = (id: number, pageType: any, tripId: number, content: any): BrochurePage =>
  ({ id, pageType, tripId, content, hidden: false, sortOrder: id, layoutVariant: 'a', copyStatus: 'ai' }) as any;

describe('hasWhyPage', () => {
  it('needs something to say', () => {
    expect(hasWhyPage({})).toBe(false);
    expect(hasWhyPage({ priceRange: 'AED 7,000' })).toBe(false);
    expect(hasWhyPage({ whyCountry: 'Because.' })).toBe(true);
    expect(hasWhyPage({ educationalValues: [{ title: 'a', detail: 'b' }] })).toBe(true);
  });
});

describe('the Why row merges into its trip', () => {
  it('carries its fields into the spread beside the introduction copy', () => {
    const pages = [
      page(1, 'tripHero', 7, { headline: 'Iceland', proposition: 'Fire and ice.' }),
      page(2, 'tripOverview', 7, { intro: 'Six days.' }),
      page(3, 'tripWhy', 7, { whyCountry: 'Plates meet here.', pctView: 'Our favourite.', ageGroup: 'Years 9–11', educationalValues: [{ title: 'Fieldwork', detail: 'x' }] }),
    ];
    const [spread] = gatherTrips(pages, {});
    expect(spread.content.proposition).toBe('Fire and ice.');
    expect(spread.content.whyCountry).toBe('Plates meet here.');
    expect(spread.content.ageGroup).toBe('Years 9–11');
    expect(hasWhyPage(spread.content)).toBe(true);
  });

  it('an edit on the Why row is not hidden by an earlier row', () => {
    // The composer writes intro copy to the intro rows only, so the Why row is
    // the first (and only) row to carry these fields.
    const pages = [
      page(1, 'tripHero', 7, { headline: 'Iceland' }),
      page(3, 'tripWhy', 7, { whyCountry: 'Edited by hand.' }),
    ];
    expect(gatherTrips(pages, {})[0].content.whyCountry).toBe('Edited by hand.');
  });
});
