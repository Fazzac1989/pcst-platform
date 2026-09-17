import { describe, expect, it } from 'vitest';
import { signPreviewToken, verifyPreviewToken } from '@/lib/brochure/preview-token';

/**
 * The preview token is what stands between a staff preview link and anyone who
 * fancies walking /proposals/1,2,3 to read a school's pricing.
 */
const SECRET = 'service-role-key-stand-in';

describe('preview tokens', () => {
  it('accepts a token it just signed', async () => {
    const t = await signPreviewToken(13, SECRET);
    expect(await verifyPreviewToken(13, t, SECRET)).toBe(true);
  });

  it('refuses a token signed for a different proposal', async () => {
    const t = await signPreviewToken(13, SECRET);
    expect(await verifyPreviewToken(14, t, SECRET)).toBe(false);
  });

  it('refuses a token signed with a different secret', async () => {
    const t = await signPreviewToken(13, SECRET);
    expect(await verifyPreviewToken(13, t, 'someone-elses-key')).toBe(false);
  });

  it('refuses an expired token', async () => {
    const t = await signPreviewToken(13, SECRET, 30);
    const anHourLater = Date.now() + 60 * 60_000;
    expect(await verifyPreviewToken(13, t, SECRET, anHourLater)).toBe(false);
  });

  it('still accepts it a minute before expiry', async () => {
    const t = await signPreviewToken(13, SECRET, 30);
    expect(await verifyPreviewToken(13, t, SECRET, Date.now() + 29 * 60_000)).toBe(true);
  });

  it('refuses a tampered expiry, which is the obvious attack', async () => {
    const t = await signPreviewToken(13, SECRET, 30);
    const sig = t.slice(t.indexOf('.') + 1);
    const forged = `${Date.now() + 10 * 365 * 24 * 60 * 60_000}.${sig}`;
    expect(await verifyPreviewToken(13, forged, SECRET)).toBe(false);
  });

  it('refuses rubbish', async () => {
    for (const t of ['', 'abc', '.', '123.', 'notanumber.sig', null, undefined]) {
      expect(await verifyPreviewToken(13, t as any, SECRET), String(t)).toBe(false);
    }
  });

  it('refuses when no secret is configured, rather than letting everyone through', async () => {
    const t = await signPreviewToken(13, SECRET);
    expect(await verifyPreviewToken(13, t, undefined)).toBe(false);
    expect(await verifyPreviewToken(13, t, '')).toBe(false);
  });

  it('does not put the signing key in the token', async () => {
    const t = await signPreviewToken(13, SECRET);
    expect(t).not.toContain(SECRET);
  });
});
