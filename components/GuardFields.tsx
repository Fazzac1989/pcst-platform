'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { issueFormStamp } from '@/lib/form-stamp-actions';
import { HONEYPOT_FIELD, STAMP_FIELD, TURNSTILE_FIELD } from '@/lib/spam-guard-fields';

/**
 * The anti-spam fields every public form carries. See lib/spam-guard.ts for
 * what each one is for.
 *
 * Drop it inside a <form>. The three values post as ordinary fields, so a
 * form that uses a server action needs nothing else; a form that builds its
 * own payload reads them from `onChange`. `ready` goes true once the stamp
 * has arrived and, when Turnstile is configured, once its token has — until
 * then the submit button should be disabled, so a person is never refused
 * for a check that had not finished loading.
 */

export type GuardValues = {
  honeypot: string;
  stamp: string;
  turnstile: string;
  ready: boolean;
};

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export default function GuardFields({ onChange }: { onChange?: (v: GuardValues) => void }) {
  const [honeypot, setHoneypot] = useState('');
  const [stamp, setStamp] = useState('');
  const [stampDone, setStampDone] = useState(false);
  const [turnstile, setTurnstile] = useState('');
  const [scriptReady, setScriptReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  // The stamp: asked for once, as the form appears.
  useEffect(() => {
    let cancelled = false;
    issueFormStamp()
      .then((s) => {
        if (!cancelled) setStamp(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStampDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The widget: rendered once the script is here and the box exists.
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    const api = window.turnstile;
    if (!api || widget.current) return;
    widget.current = api.render(box.current, {
      sitekey: SITE_KEY,
      // Invisible to almost everyone; a checkbox only when Cloudflare is unsure.
      appearance: 'interaction-only',
      callback: (token: string) => setTurnstile(token),
      'expired-callback': () => setTurnstile(''),
      'error-callback': () => setTurnstile(''),
    });
    const id = widget.current;
    return () => {
      widget.current = null;
      try {
        api.remove(id);
      } catch {
        /* already gone */
      }
    };
  }, [scriptReady]);

  const ready = stampDone && (!SITE_KEY || turnstile !== '');

  useEffect(() => {
    onChange?.({ honeypot, stamp, turnstile, ready });
    // onChange is a fresh closure each render; the values are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [honeypot, stamp, turnstile, ready]);

  return (
    <>
      {/* Honeypot: off-screen, out of the tab order, ignored by screen readers. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Company website
          <input
            type="text"
            name={HONEYPOT_FIELD}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      <input type="hidden" name={STAMP_FIELD} value={stamp} />
      {SITE_KEY && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onLoad={() => setScriptReady(true)}
            onReady={() => setScriptReady(true)}
          />
          <div ref={box} className="mt-2" />
          <input type="hidden" name={TURNSTILE_FIELD} value={turnstile} />
        </>
      )}
    </>
  );
}
