import { describe, expect, it } from 'vitest';
import { isStale } from '@/lib/brochure/proposal-pdf';

/**
 * The staleness rule is the only thing standing between an edited proposal and
 * a school downloading yesterday's prices, so it is worth pinning down.
 */
describe('isStale', () => {
  it('is stale when no PDF has ever been built', () => {
    expect(isStale({})).toBe(true);
    expect(isStale({ updated_at: '2026-09-01T00:00:00Z' })).toBe(true);
  });

  it('is stale when a file is recorded but no build time is', () => {
    expect(isStale({ pdf_storage_path: 'proposals/1/x.pdf' })).toBe(true);
  });

  it('is stale when the proposal was edited after the PDF was built', () => {
    expect(
      isStale({
        pdf_storage_path: 'proposals/1/x.pdf',
        pdf_generated_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T11:00:00Z',
      }),
    ).toBe(true);
  });

  it('is fresh when the PDF was built after the last edit', () => {
    expect(
      isStale({
        pdf_storage_path: 'proposals/1/x.pdf',
        pdf_generated_at: '2026-09-01T11:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      }),
    ).toBe(false);
  });

  it('is fresh when the two timestamps match exactly', () => {
    const t = '2026-09-01T10:00:00Z';
    expect(isStale({ pdf_storage_path: 'p.pdf', pdf_generated_at: t, updated_at: t })).toBe(false);
  });

  it('is fresh when there is a PDF and nothing says the proposal changed', () => {
    expect(isStale({ pdf_storage_path: 'p.pdf', pdf_generated_at: '2026-09-01T10:00:00Z' })).toBe(
      false,
    );
  });

  it('compares instants, not strings, across timezone offsets', () => {
    // Same moment, written two ways. A string comparison would call this stale.
    expect(
      isStale({
        pdf_storage_path: 'p.pdf',
        pdf_generated_at: '2026-09-01T14:00:00+04:00',
        updated_at: '2026-09-01T10:00:00Z',
      }),
    ).toBe(false);
  });
});
