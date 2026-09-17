/**
 * The names of the anti-spam fields, shared between the browser and the
 * server. Nothing else lives here: the browser component imports this file,
 * and the guard itself (lib/spam-guard.ts) needs node's crypto, which a
 * browser bundle cannot carry.
 */

export const HONEYPOT_FIELD = 'company_website';
export const STAMP_FIELD = 'form_opened';
export const TURNSTILE_FIELD = 'cf-turnstile-response';
