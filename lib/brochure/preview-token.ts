/**
 * A short-lived pass for the staff preview of a proposal.
 *
 * `/proposals/<id>` is guarded because brochure ids are sequential and the
 * prices behind them are not public. But the admin that links to it lives on
 * another domain, so its session cookie never arrives here — the preview
 * bounced to the login screen and back to the menu.
 *
 * A signed token solves both: it proves the link came from the admin, and it
 * expires, so a copied preview URL is not a permanent back door.
 *
 * The signing key is derived from the service-role key rather than being a new
 * secret to configure, because both apps already hold that one and a second
 * environment variable that must match in two places is a thing to get wrong.
 * It is derived, not used directly, so the token can never leak the key.
 */

const LABEL = 'proposal-preview-v1';

/** Minutes a preview link stays good for. Long enough to read, short enough to matter. */
export const PREVIEW_TTL_MINUTES = 30;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Web Crypto rather than node:crypto: this runs in middleware, which is an
 * edge runtime where node:crypto is not available.
 */
async function signingKey(secret: string): Promise<CryptoKey> {
  const derived = await crypto.subtle.digest('SHA-256', encoder.encode(`${LABEL}:${secret}`));
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

async function mac(secret: string, payload: string): Promise<string> {
  const key = await signingKey(secret);
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

/** `<expiry>.<signature>` — the id is not in the token because it is in the URL. */
export async function signPreviewToken(
  id: number,
  secret: string,
  ttlMinutes: number = PREVIEW_TTL_MINUTES,
): Promise<string> {
  const exp = Date.now() + ttlMinutes * 60_000;
  return `${exp}.${await mac(secret, `${id}.${exp}`)}`;
}

export async function verifyPreviewToken(
  id: number,
  token: string | null | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;

  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < now) return false;

  const expected = await mac(secret, `${id}.${exp}`);
  const given = token.slice(dot + 1);
  if (expected.length !== given.length) return false;

  // Constant-time compare: a length-and-prefix check would leak the signature
  // one character at a time to anyone willing to try.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
