import { describe, expect, it } from 'vitest';
import { overviewPhotos } from '@/lib/brochure/overview-photos';

const img = (n: number) => ({ url: `/p${n}.jpg`, alt: `Photo ${n}` });
const images = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, img(n)]));

describe('overview photos', () => {
  it('takes the first photo of each day, then experiences, then the rest — skipping hero and logo', () => {
    const vm = {
      heroImage: '/p1.jpg',
      images,
      days: [{ imageIds: [1, 2] }, { imageIds: [3, 4] }, { imageIds: [9] }],
      content: { schoolLogoImageId: 9, signatureExperiences: [{ imageId: 5 }, { imageId: 3 }, { imageId: null }] },
    };
    expect(overviewPhotos(vm).map((p) => p.url)).toEqual(['/p3.jpg', '/p5.jpg', '/p2.jpg', '/p4.jpg']);
    expect(overviewPhotos(vm, 2)).toHaveLength(2);
  });

  it('is empty when the proposal has no photos', () => {
    expect(overviewPhotos({ heroImage: null, images: {}, days: [], content: { schoolLogoImageId: null, signatureExperiences: [] } })).toEqual([]);
  });
});
