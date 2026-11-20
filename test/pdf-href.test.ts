import { describe, expect, it } from 'vitest';
import { proposalPdfHref } from '@/lib/brochure/pdf-href';

describe('proposal PDF link', () => {
  it('carries the share token, else the staff preview pass', () => {
    expect(proposalPdfHref(58, 'abc')).toBe('/api/proposals/58/pdf?token=abc');
    expect(proposalPdfHref(58, undefined, '1795.sig/+')).toBe('/api/proposals/58/pdf?preview=1795.sig%2F%2B');
    expect(proposalPdfHref(58, 'abc', 'pass')).toBe('/api/proposals/58/pdf?token=abc');
    expect(proposalPdfHref(58)).toBe('/api/proposals/58/pdf');
  });
});
