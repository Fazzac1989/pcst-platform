import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Four checks on every public form that lands in the enquiries workflow and
 * sends an email: the six brand sites' enquiry form, the plan wizard, the
 * staycation availability check and the AI inspiration lead.
 *
 * The morning this was written, ten submissions like this arrived before
 * breakfast:
 *
 *   name          Bycoc Jmfkid
 *   travel_dates  wTpZibbftCgozlnXEw
 *   travellers    EoOjUGIzJodxhhVQJRuJMlHH
 *   message       uvyrHdRAdXdNTyLn
 *
 * A form-filling bot that types random letters into every box. There was
 * nothing in its way: the form had no honeypot, no notion of time, and no
 * challenge. Each one cost two emails and a row in the inbox.
 *
 * The checks, in the order they run:
 *
 * 1. Honeypot — a field no person can see. Filled means a bot.
 * 2. Junk — two or more fields that are a single unbroken run of letters with
 *    capitals in the middle. Nobody writes their travel dates that way.
 * 3. Stamp — the page hands the form a signed time when it opens; a submission
 *    inside a few seconds, or with a forged or missing stamp, is refused. A bot
 *    that posts straight to the action never loaded the page.
 * 4. Turnstile — Cloudflare's challenge, verified server-side. It only runs
 *    once TURNSTILE_SECRET_KEY is set, so the site keeps working before the
 *    keys exist; the first three checks carry it until then.
 *
 * Honeypot and junk answer the bot with a cheerful "thank you" and nothing
 * else — telling it why it failed only teaches it. The other two are things a
 * real person can hit (a very quick reply, a stale tab), so they get an honest
 * message and a way forward.
 *
 * This file is plain TypeScript with no framework imports so the whole thing
 * is unit-testable and can be copied verbatim into the School Trips site.
 */

import { HONEYPOT_FIELD, STAMP_FIELD, TURNSTILE_FIELD } from '@/lib/spam-guard-fields';

export { HONEYPOT_FIELD, STAMP_FIELD, TURNSTILE_FIELD };

/** A person takes longer than this to read a form and fill it in. */
export const MIN_SECONDS_OPEN = 4;
/** A tab left open overnight is fine; a stamp from last month is not. */
export const MAX_HOURS_OPEN = 24;

export type GuardReason = 'honeypot' | 'junk' | 'too-fast' | 'stamp' | 'turnstile';

export type Verdict =
  | { ok: true }
  | {
      ok: false;
      reason: GuardReason;
      /** What to show. Silent rejections show the normal success message. */
      message: string;
      /** True when the caller should pretend the submission succeeded. */
      silent: boolean;
    };

/** What a form sends alongside its real fields. */
export type GuardPayload = {
  honeypot?: string | null;
  stamp?: string | null;
  turnstile?: string | null;
};

/* ---------- 2. Junk ---------- */

/** One unbroken run of letters, twelve or more, with a capital inside it. */
const JUNK_RUN = /^[A-Za-z]{12,}$/;
const CAPITAL_INSIDE = /[a-z][A-Z]/;

/**
 * True when two or more of the values look machine-typed.
 *
 * One such field is not enough: a surname, an email local part or a
 * reference number can be a long run of letters. Two of them in one
 * submission, each with capitals in the middle, is a bot.
 */
export function looksLikeJunk(values: Array<string | null | undefined>): boolean {
  let runs = 0;
  for (const raw of values) {
    const v = (raw ?? '').trim();
    if (JUNK_RUN.test(v) && CAPITAL_INSIDE.test(v)) runs += 1;
  }
  return runs >= 2;
}

/* ---------- 3. Stamp ---------- */

function sign(issuedAt: number, secret: string): string {
  return createHmac('sha256', secret).update(`form-stamp-v1:${issuedAt}`).digest('hex');
}

/** `<issued-at-ms>.<signature>`, issued when the form is shown. */
export function signStamp(issuedAt: number, secret: string): string {
  return `${issuedAt}.${sign(issuedAt, secret)}`;
}

/**
 * How many seconds ago a stamp was issued, or null when it is missing,
 * malformed or forged.
 */
export function stampAge(stamp: string | null | undefined, secret: string, now = Date.now()): number | null {
  if (!stamp) return null;
  const dot = stamp.indexOf('.');
  if (dot <= 0) return null;
  const issuedAt = Number(stamp.slice(0, dot));
  const given = stamp.slice(dot + 1);
  if (!Number.isFinite(issuedAt) || !/^[0-9a-f]{64}$/.test(given)) return null;
  const expected = sign(issuedAt, secret);
  // Constant-time, so the comparison itself does not leak the signature.
  if (!timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return (now - issuedAt) / 1000;
}

/**
 * The stamp secret. A dedicated one when set; otherwise the service-role key,
 * which is already secret and already present wherever the site runs.
 */
export function stampSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.FORM_STAMP_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/* ---------- 4. Turnstile ---------- */

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = { ok: boolean; codes: string[] };

/**
 * Ask Cloudflare whether a token is genuine. A network failure counts as a
 * failure — better to ask a real person to try again than to wave a bot
 * through while Cloudflare is unreachable.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  secret: string,
  remoteIp: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (!token) return { ok: false, codes: ['missing-input-response'] };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const res = await fetchImpl(TURNSTILE_VERIFY, { method: 'POST', body });
    const json: any = await res.json();
    return { ok: json?.success === true, codes: json?.['error-codes'] ?? [] };
  } catch (err: any) {
    return { ok: false, codes: [`network: ${err?.message ?? 'unknown'}`] };
  }
}

/* ---------- All four ---------- */

export type GuardInput = GuardPayload & {
  /** The free-text values a person typed, for the junk check. */
  fields: Array<string | null | undefined>;
  remoteIp?: string | null;
};

export type GuardOptions = {
  env?: NodeJS.ProcessEnv;
  now?: number;
  fetchImpl?: typeof fetch;
};

const RELOAD = 'Please reload the page and send that again.';

export async function guardSubmission(input: GuardInput, options: GuardOptions = {}): Promise<Verdict> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now();

  if ((input.honeypot ?? '').trim() !== '') {
    return { ok: false, reason: 'honeypot', message: '', silent: true };
  }

  if (looksLikeJunk(input.fields)) {
    return { ok: false, reason: 'junk', message: '', silent: true };
  }

  const secret = stampSecret(env);
  if (secret) {
    const age = stampAge(input.stamp, secret, now);
    if (age === null) return { ok: false, reason: 'stamp', message: RELOAD, silent: false };
    if (age < MIN_SECONDS_OPEN) {
      return {
        ok: false,
        reason: 'too-fast',
        message: 'That was quick — please check the details and send again.',
        silent: false,
      };
    }
    if (age > MAX_HOURS_OPEN * 3600) return { ok: false, reason: 'stamp', message: RELOAD, silent: false };
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const result = await verifyTurnstile(input.turnstile, turnstileSecret, input.remoteIp ?? null, options.fetchImpl);
    if (!result.ok) {
      return {
        ok: false,
        reason: 'turnstile',
        message: 'Please complete the "I am human" check and send again.',
        silent: false,
      };
    }
  }

  return { ok: true };
}

/** The guard fields as a form posts them. */
export function guardPayloadFromForm(formData: FormData): GuardPayload {
  const s = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v : null;
  };
  return { honeypot: s(HONEYPOT_FIELD), stamp: s(STAMP_FIELD), turnstile: s(TURNSTILE_FIELD) };
}

/** The caller's address from the proxy headers, for Turnstile's record. */
export function remoteIpFrom(headerValue: string | null | undefined): string | null {
  const first = (headerValue ?? '').split(',')[0].trim();
  return first || null;
}

/** One line in the server log per rejection, so a quiet inbox can be checked against a busy log. */
export function describeRejection(v: Extract<Verdict, { ok: false }>, where: string, email: string | null): string {
  return `[spam-guard] ${where}: rejected (${v.reason})${email ? ` ${email}` : ''}`;
}
