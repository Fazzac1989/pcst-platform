'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/** Navy launch screen with the logo — shown once per session, then fades out. */
export default function Splash() {
  const [state, setState] = useState<'hidden' | 'shown' | 'fading'>('hidden');

  useEffect(() => {
    if (sessionStorage.getItem('pcst-splashed')) return;
    sessionStorage.setItem('pcst-splashed', '1');
    setState('shown');
    const fade = setTimeout(() => setState('fading'), 1400);
    const gone = setTimeout(() => setState('hidden'), 2000);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (state === 'hidden') return null;
  return (
    <div className={`papp-splash${state === 'fading' ? ' fading' : ''}`}>
      <Image src="/images/logo-white.png" alt="Premium Choice School Trips" width={320} height={107} priority />
    </div>
  );
}
