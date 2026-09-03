import { describe, expect, it } from 'vitest';
import { EMPTY_CONTENT, pagesAt, referencedImageIds } from '@/lib/brochure/proposal-schema';

describe('referencedImageIds', () => {
  it('collects every image a proposal uses, once each', () => {
    const content = {
      ...EMPTY_CONTENT,
      heroImageId: 7,
      signatureExperiences: [
        { title: 'a', caption: '', imageId: 3, dayNumber: null },
        { title: 'b', caption: '', imageId: null, dayNumber: null },
      ],
      customPages: [
        { id: 'p1', eyebrow: '', title: 'x', body: [], imageId: 9, placement: 'end' as const },
      ],
    };
    const ids = referencedImageIds(content, [[1, 2], [2, 3], []], '7');
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3, 7, 9]);
  });

  it('is empty for a new proposal', () => {
    expect(referencedImageIds(EMPTY_CONTENT, [], null)).toEqual([]);
  });

  it('ignores a cover image that is a URL rather than an id', () => {
    expect(referencedImageIds(EMPTY_CONTENT, [], 'https://x/y.jpg')).toEqual([]);
  });
});

describe('pagesAt', () => {
  const page = (id: string, placement: any) => ({
    id,
    eyebrow: '',
    title: id,
    body: [],
    imageId: null,
    placement,
  });

  it('returns the pages for a placement, in order', () => {
    const c = { ...EMPTY_CONTENT, customPages: [page('a', 'end'), page('b', 'after-overview'), page('c', 'end')] };
    expect(pagesAt(c, 'end').map((p) => p.id)).toEqual(['a', 'c']);
    expect(pagesAt(c, 'after-overview').map((p) => p.id)).toEqual(['b']);
    expect(pagesAt(c, 'before-price')).toEqual([]);
  });

  it('puts a page with an unknown placement at the end rather than losing it', () => {
    const c = { ...EMPTY_CONTENT, customPages: [page('a', 'somewhere-old')] };
    expect(pagesAt(c, 'end').map((p) => p.id)).toEqual(['a']);
  });
});
