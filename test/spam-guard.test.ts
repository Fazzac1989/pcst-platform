import { describe, expect, it } from 'vitest';
import {
  guardSubmission,
  looksLikeJunk,
  remoteIpFrom,
  signStamp,
  stampAge,
  verifyTurnstile,
} from '@/lib/spam-guard';

const SECRET = 'test-secret';
const NOW = 1_800_000_000_000;

/** A stamp issued `seconds` ago. */
const stamp = (seconds: number) => signStamp(NOW - seconds * 1000, SECRET);

/** The environment with only the stamp secret: Turnstile off. */
const env = { SUPABASE_SERVICE_ROLE_KEY: SECRET } as unknown as NodeJS.ProcessEnv;

describe('looksLikeJunk', () => {
  it('recognises the submissions that arrived on 3 September', () => {
    // Verbatim from the enquiries table.
    expect(looksLikeJunk(['Bycoc Jmfkid', 'wTpZibbftCgozlnXEw', 'EoOjUGIzJodxhhVQJRuJMlHH', 'uvyrHdRAdXdNTyLn'])).toBe(true);
    expect(looksLikeJunk(['Bccng Tqpfgtpxi', 'rWpWdddGKhdddHtpBGMQr', 'nOaoeTvrztrLyfOmJURE', 'WvUgXwwZYQoDnIEFusvElYt'])).toBe(true);
  });

  it('lets real enquiries through', () => {
    expect(looksLikeJunk(['Paul Farrell', '15 oct 2026', '2 adults, children 10 and 9', 'AI INSPIRATION LEAD — chose Aqaba'])).toBe(false);
    expect(looksLikeJunk(['Tatiana Dunkley', '-7', null, 'Hi, I picked up a 2011 domain with a surprising history'])).toBe(false);
    expect(looksLikeJunk(['Hannah Melotto', undefined, '', 'Hey! Do you have any use for a freelance writer?'])).toBe(false);
  });

  it('does not convict on one long word', () => {
    // A long surname, or a reference pasted into the message.
    expect(looksLikeJunk(['Wolfeschlegelsteinhausen', '20–27 December', '2 adults', ''])).toBe(false);
    expect(looksLikeJunk(['Ana', '', '', 'ReferenceABCDEFGHIJ'])).toBe(false);
  });

  it('needs a capital inside the word, not just length', () => {
    // Shouting, or a lowercase slug, is human enough.
    expect(looksLikeJunk(['PLEASECALLMEBACKTODAY', 'asapasapasapasap', '', ''])).toBe(false);
  });
});

describe('stamps', () => {
  it('round-trip: age is how long ago it was issued', () => {
    expect(stampAge(stamp(30), SECRET, NOW)).toBe(30);
  });

  it('rejects a forged or damaged stamp', () => {
    const good = stamp(30);
    expect(stampAge(good.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), SECRET, NOW)).toBeNull();
    expect(stampAge(good, 'another-secret', NOW)).toBeNull();
    expect(stampAge(`${NOW}.nothex`, SECRET, NOW)).toBeNull();
    expect(stampAge('', SECRET, NOW)).toBeNull();
    expect(stampAge(null, SECRET, NOW)).toBeNull();
    expect(stampAge('justanumber', SECRET, NOW)).toBeNull();
  });
});

describe('guardSubmission', () => {
  const person = { fields: ['Jane Smith', '20–27 December', '2 adults', 'Somewhere warm please'] };

  it('passes a real submission with a stamp a minute old', async () => {
    expect(await guardSubmission({ ...person, stamp: stamp(60) }, { env, now: NOW })).toEqual({ ok: true });
  });

  it('silently drops a filled honeypot', async () => {
    const v = await guardSubmission({ ...person, stamp: stamp(60), honeypot: 'http://x.example' }, { env, now: NOW });
    expect(v).toMatchObject({ ok: false, reason: 'honeypot', silent: true });
  });

  it('silently drops junk, before it even looks at the stamp', async () => {
    const v = await guardSubmission(
      { fields: ['Bycoc Jmfkid', 'wTpZibbftCgozlnXEw', 'EoOjUGIzJodxhhVQJRuJMlHH', 'x'], stamp: null },
      { env, now: NOW },
    );
    expect(v).toMatchObject({ ok: false, reason: 'junk', silent: true });
  });

  it('refuses a missing stamp, with a way forward', async () => {
    const v = await guardSubmission({ ...person, stamp: null }, { env, now: NOW });
    expect(v).toMatchObject({ ok: false, reason: 'stamp', silent: false });
    expect((v as any).message).toMatch(/reload/i);
  });

  it('refuses a form sent two seconds after it opened', async () => {
    const v = await guardSubmission({ ...person, stamp: stamp(2) }, { env, now: NOW });
    expect(v).toMatchObject({ ok: false, reason: 'too-fast', silent: false });
  });

  it('refuses a stamp from two days ago', async () => {
    const v = await guardSubmission({ ...person, stamp: stamp(48 * 3600) }, { env, now: NOW });
    expect(v).toMatchObject({ ok: false, reason: 'stamp' });
  });

  it('skips the stamp check entirely when no secret is configured', async () => {
    expect(await guardSubmission({ ...person, stamp: null }, { env: {} as unknown as NodeJS.ProcessEnv, now: NOW })).toEqual({ ok: true });
  });

  it('asks Cloudflare only when a secret is set, and refuses on its word', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (_url: any, init: any) => {
      calls.push(String(init.body));
      return { json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) };
    }) as unknown as typeof fetch;
    const withKey = { ...env, TURNSTILE_SECRET_KEY: 'tsk' } as NodeJS.ProcessEnv;

    const v = await guardSubmission({ ...person, stamp: stamp(60), turnstile: 'tok', remoteIp: '1.2.3.4' }, { env: withKey, now: NOW, fetchImpl });
    expect(v).toMatchObject({ ok: false, reason: 'turnstile', silent: false });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('secret=tsk');
    expect(calls[0]).toContain('response=tok');
    expect(calls[0]).toContain('remoteip=1.2.3.4');
  });

  it('passes when Cloudflare says yes', async () => {
    const fetchImpl = (async () => ({ json: async () => ({ success: true }) })) as unknown as typeof fetch;
    const withKey = { ...env, TURNSTILE_SECRET_KEY: 'tsk' } as NodeJS.ProcessEnv;
    expect(await guardSubmission({ ...person, stamp: stamp(60), turnstile: 'tok' }, { env: withKey, now: NOW, fetchImpl })).toEqual({ ok: true });
  });
});

describe('verifyTurnstile', () => {
  it('treats a missing token and a network failure as failures', async () => {
    expect((await verifyTurnstile(null, 's', null)).ok).toBe(false);
    const down = (async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;
    const r = await verifyTurnstile('tok', 's', null, down);
    expect(r.ok).toBe(false);
    expect(r.codes[0]).toMatch(/network/);
  });
});

describe('remoteIpFrom', () => {
  it('takes the first address of a forwarded chain', () => {
    expect(remoteIpFrom('203.0.113.9, 10.0.0.1')).toBe('203.0.113.9');
    expect(remoteIpFrom(null)).toBeNull();
    expect(remoteIpFrom('')).toBeNull();
  });
});
