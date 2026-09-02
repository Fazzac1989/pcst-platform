import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A brochure and a proposal go to the same school, often in the same week.
 * They are separate stylesheets — one is a collection, the other a single
 * document — but they must look like the same company wrote them, so the
 * design tokens have to agree exactly.
 */

function tokens(file: string): Record<string, string> {
  const css = readFileSync(file, 'utf8');
  const root = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!root) throw new Error(`no :root block in ${file}`);
  const out: Record<string, string> = {};
  for (const m of root[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  }
  return out;
}

const proposal = tokens('components/proposal/proposal.css');
const brochure = tokens('components/brochure/slides.css');

describe('report design tokens', () => {
  it('defines the palette in both stylesheets', () => {
    expect(Object.keys(proposal).length).toBeGreaterThan(10);
    expect(Object.keys(brochure).length).toBeGreaterThan(10);
  });

  it('names the same tokens in both', () => {
    expect(Object.keys(brochure).sort()).toEqual(Object.keys(proposal).sort());
  });

  it('gives every token the same value in both', () => {
    for (const [name, value] of Object.entries(proposal)) {
      expect(brochure[name], `${name} differs between the two stylesheets`).toBe(value);
    }
  });

  it('still uses the brand navy and teal', () => {
    // Pinned so a careless find-and-replace across both files is still caught.
    expect(proposal['--navy']).toBe('#16242E');
    expect(proposal['--teal']).toBe('#19BAAB');
  });

  it('sets both faces from next/font variables, so nothing is fetched at runtime', () => {
    expect(proposal['--display']).toContain('--font-fraunces');
    expect(proposal['--body']).toContain('--font-archivo');
  });
});
