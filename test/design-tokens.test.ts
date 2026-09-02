import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The brand palette now lives in one place.
 *
 * It used to be copied into the proposal's stylesheet and the brochure's, with
 * a test comparing the two so they could not drift. Both documents are decks
 * now and share components/slides/deck.css, so there is one definition and
 * nothing to drift — but it is still worth pinning the values, and worth
 * failing if a second copy appears.
 */

function tokens(file: string): Record<string, string> {
  const css = readFileSync(file, 'utf8');
  const root = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!root) return {};
  const out: Record<string, string> = {};
  for (const m of root[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  }
  return out;
}

const deck = tokens('components/slides/deck.css');

describe('deck design tokens', () => {
  it('defines the palette', () => {
    expect(Object.keys(deck).length).toBeGreaterThan(10);
  });

  it('still uses the brand navy and teal', () => {
    // Pinned so a careless find-and-replace is caught.
    expect(deck['--navy']).toBe('#16242E');
    expect(deck['--teal']).toBe('#19BAAB');
  });

  it('sets both faces from next/font variables, so nothing is fetched at runtime', () => {
    expect(deck['--display']).toContain('--font-fraunces');
    expect(deck['--body']).toContain('--font-archivo');
  });

  it('is the only stylesheet that defines them', () => {
    // A second :root block is how the two copies drifted last time.
    for (const f of ['components/brochure/slides.css', 'components/proposal/slides.css']) {
      expect(Object.keys(tokens(f)), `${f} should not redefine the palette`).toEqual([]);
    }
  });
});
