'use client';

import { useState } from 'react';
import { portalSignIn } from '@/lib/portal/actions';

export default function LoginForm({ notice }: { notice: string | null }) {
  const [error, setError] = useState<string | null>(notice);
  const [busy, setBusy] = useState(false);

  return (
    <div className="pt-card pt-card--narrow">
      <h1>Teacher portal</h1>
      <p className="pt-lede">
        Sign in to see your quotes and trip paperwork. Accounts are created by our team — if you
        need access, just ask us.
      </p>
      <form
        className="pt-form"
        action={async (formData) => {
          setBusy(true);
          setError(null);
          const res = await portalSignIn(formData);
          setBusy(false);
          if (res && !res.ok) setError(res.error);
        }}
      >
        <label>
          <span>Email address</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p className="pt-error">{error}</p>}
        <button className="btn btn-brass" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} {!busy && <span className="arrow">→</span>}
        </button>
      </form>
    </div>
  );
}
