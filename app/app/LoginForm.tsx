'use client';

import { useState, useTransition } from 'react';
import { appLogin } from '@/lib/app/actions';

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await appLogin(data);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="papp-login-form">
      <input
        name="code"
        placeholder="e.g. ICE24-S-7GK4QZ"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        required
      />
      {error && <p className="papp-error">{error}</p>}
      <button className="btn btn-brass" disabled={pending}>
        {pending ? 'Checking…' : 'Open my trip'} {!pending && <span className="arrow">→</span>}
      </button>
    </form>
  );
}
