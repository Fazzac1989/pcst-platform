'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/** Navy launch screen with the brand lockup — shown once per session, then fades out. */
export default function Splash() {
  const [state, setState] = useState<'hidden' | 'shown' | 'fading'>('hidden');

  useEffect(() => {
    if (sessionStorage.getItem('pcst-splashed')) return;
    sessionStorage.setItem('pcst-splashed', '1');
    setState('shown');
    const fade = setTimeout(() => setState('fading'), 1600);
    const gone = setTimeout(() => setState('hidden'), 2200);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (state === 'hidden') return null;
  return (
    <div className={`papp-splash${state === 'fading' ? ' fading' : ''}`}>
      <div className="papp-splash-lockup">
        <span className="papp-splash-eyebrow">Premium Choice</span>
        <span className="papp-splash-title">School Trips</span>
        <span className="papp-splash-divider">
          <i />
          <Image
            src="/images/pct-logo.png"
            alt="PCT"
            width={120}
            height={48}
            className="papp-splash-pct"
            priority
          />
          <i />
        </span>
        <span className="papp-splash-powered">Powered by Premium Choice Travel</span>
      </div>
    </div>
  );
}
