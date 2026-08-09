'use client';

import { useEffect, useState } from 'react';

function greetingNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Time-of-day greeting, computed on the device so it matches the traveller's clock. */
export default function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('Hello');
  useEffect(() => setGreeting(greetingNow()), []);
  return (
    <h1 className="papp-greeting">
      {greeting}, {name.split(' ')[0]}
    </h1>
  );
}
