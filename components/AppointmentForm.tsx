'use client';

import { useState } from 'react';
import GuardFields, { type GuardValues } from '@/components/GuardFields';

const TYPES = [
  { value: 'we_visit', label: 'We visit your school' },
  { value: 'you_visit', label: 'You visit our Dubai office' },
  { value: 'online', label: 'Online meeting' },
];

export default function AppointmentForm({ tripSlug }: { tripSlug?: string }) {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [appointmentType, setAppointmentType] = useState('');
  const [consent, setConsent] = useState(false);
  const [guard, setGuard] = useState<GuardValues>({ honeypot: '', stamp: '', turnstile: '', ready: false });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    setError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, school, email, appointmentType, consent, tripSlug,
          honeypot: guard.honeypot, stamp: guard.stamp, turnstile: guard.turnstile,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Something went wrong — please try again.');
      setState('done');
    } catch (err: any) {
      setError(err.message);
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="apt-done">
        <div className="apt-done-mark">✓</div>
        <h4>Thank you, {name.split(' ')[0]}!</h4>
        <p>
          Your request is in. We&apos;ve emailed you a confirmation, and our Dubai team will come
          back to you within <strong>24 hours</strong>.
        </p>
      </div>
    );
  }

  return (
    <form className="apt-form" onSubmit={onSubmit}>
      <label>
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </label>
      <label>
        <span>School</span>
        <input value={school} onChange={(e) => setSchool(e.target.value)} required autoComplete="organization" />
      </label>
      <label>
        <span>Email address</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label>
        <span>Appointment type</span>
        <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)} required>
          <option value="" disabled>
            Choose…
          </option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <GuardFields onChange={setGuard} />
      <label className="apt-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          I consent to Premium Choice School Trips storing these details to arrange my
          appointment and respond to my enquiry.
        </span>
      </label>
      {error && <p className="apt-error">{error}</p>}
      <button className="btn btn-brass" type="submit" disabled={state === 'busy' || !guard.ready}>
        {state === 'busy' ? 'Sending…' : 'Book an appointment'}{' '}
        {state !== 'busy' && <span className="arrow">→</span>}
      </button>
    </form>
  );
}
