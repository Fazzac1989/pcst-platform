'use client';

import { useEffect, useRef } from 'react';

/**
 * Records that this trip page was viewed, and how long the visitor stayed.
 * Cookie-less and anonymous — no identifiers are stored. Time spent hidden
 * (another tab) is not counted.
 */
export default function ViewTracker({ tripId }: { tripId: number }) {
  const viewId = useRef<number | null>(null);
  const activeMs = useRef(0);
  const lastResume = useRef<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    let cancelled = false;
    lastResume.current = Date.now();

    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, referrer: document.referrer || null }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.id) viewId.current = d.id;
      })
      .catch(() => {
        /* analytics must never break the page */
      });

    const pause = () => {
      if (lastResume.current !== null) {
        activeMs.current += Date.now() - lastResume.current;
        lastResume.current = null;
      }
    };
    const resume = () => {
      if (lastResume.current === null) lastResume.current = Date.now();
    };

    const finish = () => {
      if (sent.current || viewId.current === null) return;
      pause();
      const seconds = Math.round(activeMs.current / 1000);
      if (seconds < 2) return; // ignore instant bounces
      sent.current = true;
      const payload = JSON.stringify({ id: viewId.current, dwellSeconds: seconds });
      // sendBeacon survives the page unloading; fetch may not.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/views', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => (document.hidden ? (pause(), finish()) : resume());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', finish);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', finish);
      finish();
    };
  }, [tripId]);

  return null;
}
