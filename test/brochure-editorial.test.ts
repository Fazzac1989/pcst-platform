import { describe, expect, it } from 'vitest';
import { editorialFor, type EditorialSlide } from '@/lib/brochure/editorial';

const slides = [
  { kind: 'introduction' },
  { kind: 'safety', part: 1, parts: 3 },
  { kind: 'safety', part: 2, parts: 3 },
  { kind: 'safety', part: 3, parts: 3 },
  { kind: 'technology' },
] as unknown as EditorialSlide[];

const kinds = (list: EditorialSlide[]) => list.map((s) => s.kind);

describe('editorialFor', () => {
  it('keeps everything when nothing was turned off', () => {
    expect(kinds(editorialFor(slides, {}))).toEqual(['introduction', 'safety', 'safety', 'safety', 'technology']);
  });

  it('drops the safety pages when the brochure said no', () => {
    // This was the bug: the toggle was stored and never read.
    expect(kinds(editorialFor(slides, { showSafety: false }))).toEqual(['introduction', 'technology']);
  });

  it('drops the technology and introduction pages independently', () => {
    expect(kinds(editorialFor(slides, { showApp: false }))).toEqual(['introduction', 'safety', 'safety', 'safety']);
    expect(kinds(editorialFor(slides, { showIntro: false, showApp: false }))).toEqual(['safety', 'safety', 'safety']);
  });

  it('treats an explicit true the same as absent', () => {
    expect(editorialFor(slides, { showSafety: true, showApp: true, showIntro: true })).toHaveLength(5);
  });
});
