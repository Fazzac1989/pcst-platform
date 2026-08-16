'use client';

import { useState } from 'react';
import { portalSetPassword } from '@/lib/portal/actions';

export default function SetPasswordForm({ email }: { email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="pt-card pt-card--narrow">
      <h1>Choose a password</h1>
      <p className="pt-lede">
        Setting a password for <strong>{email}</strong>. You&apos;ll use it to sign in from now on.
      </p>
      <form
        className="pt-form"
        action={async (formData) => {
          setBusy(true);
          setError(null);
          const res = await portalSetPassword(formData);
          setBusy(false);
          if (res && !res.ok) setError(res.error);
        }}
      >
        <label>
          <span>New password</span>
          <input name="password" type="password" required minLength={10} autoComplete="new-password" />
        </label>
        <label>
          <span>Confirm password</span>
          <input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
        </label>
        <p className="pt-hint">At least 10 characters.</p>
        {error && <p className="pt-error">{error}</p>}
        <button className="btn btn-brass" disabled={busy}>
          {busy ? 'Saving…' : 'Save and continue'} {!busy && <span className="arrow">→</span>}
        </button>
      </form>
    </div>
  );
}
