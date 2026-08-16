'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  deleteTeacher,
  inviteTeacher,
  resendTeacherInvite,
  setTeacherStatus,
} from '@/lib/admin/teacher-actions';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors disabled:opacity-50';

export type TeacherRow = {
  id: number;
  name: string;
  email: string;
  schoolName: string;
  status: 'invited' | 'active' | 'disabled';
  invitedAt: string;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  quoteCount: number;
};

const date = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export default function TeachersManager({ rows }: { rows: TeacherRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy] = useState<number | 'invite' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy('invite');
    setError(null);
    setLink(null);
    const res = await inviteTeacher({ name, email, schoolName: school });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLink({ email: email.trim().toLowerCase(), url: res.link! });
    setName('');
    setEmail('');
    setSchool('');
    router.refresh();
  }

  async function onResend(id: number, teacherEmail: string) {
    setBusy(id);
    setError(null);
    setLink(null);
    const res = await resendTeacherInvite(id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLink({ email: teacherEmail, url: res.link! });
  }

  async function act(id: number, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Teacher portal</h1>
        <p className="text-sm text-ink-soft mt-1">
          Invite a teacher and send them their link. They see the quotes addressed to their email
          and can accept one — which notifies you and takes no payment.
        </p>
      </div>

      <form onSubmit={onInvite} className="border border-line rounded p-6 grid gap-4 mb-8">
        <span className={labelCls}>Invite a teacher</span>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Name</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Rania Ahmed" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Email</span>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="r.ahmed@school.ae" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">School</span>
            <input className={inputCls} value={school} onChange={(e) => setSchool(e.target.value)} required placeholder="Sunmarke School" />
          </label>
        </div>
        <button
          className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors justify-self-start disabled:opacity-60"
          disabled={busy !== null}
        >
          {busy === 'invite' ? 'Creating invite…' : 'Create invite link'}
        </button>
        <p className="text-xs text-ink-soft">
          The quote&apos;s <em>teacher email</em> must match this address for it to appear in their
          portal.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {link && (
        <div className="border border-teal rounded p-5 mb-8 bg-teal/[.06]">
          <p className="text-sm font-semibold mb-2">
            Invite link for {link.email} — send this to them
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <input readOnly className={`${inputCls} flex-1 min-w-[260px] font-mono text-xs`} value={link.url} onFocus={(e) => e.currentTarget.select()} />
            <button className={smallBtn} onClick={() => copy(link.url)}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a className={smallBtn} href={`mailto:${link.email}?subject=${encodeURIComponent('Your Premium Choice School Trips portal')}&body=${encodeURIComponent(`Hello,\n\nHere is your link to set a password and see your quotes:\n\n${link.url}\n\nThe link can only be used once.\n\nPremium Choice School Trips`)}`}>
              Open in email
            </a>
          </div>
          <p className="text-xs text-ink-soft mt-2">
            Single use, and it expires. If they miss it, use Send new link below.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft border border-line rounded p-6">
          No teachers invited yet.
        </p>
      ) : (
        <div className="border border-line rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
                <th className="px-4 py-3 font-semibold">Teacher</th>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Quotes</th>
                <th className="px-4 py-3 font-semibold">Last seen</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-ink-soft">{t.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{t.schoolName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        t.status === 'active'
                          ? 'bg-teal/15 text-teal-deep'
                          : t.status === 'invited'
                            ? 'bg-ink/10 text-ink-soft'
                            : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{t.quoteCount || '—'}</td>
                  <td className="px-4 py-3 text-ink-soft text-xs">{date(t.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end flex-wrap">
                      <button className={smallBtn} disabled={busy !== null} onClick={() => onResend(t.id, t.email)}>
                        {busy === t.id ? '…' : 'Send new link'}
                      </button>
                      <button
                        className={smallBtn}
                        disabled={busy !== null}
                        onClick={() => act(t.id, () => setTeacherStatus(t.id, t.status === 'disabled' ? 'active' : 'disabled'))}
                      >
                        {t.status === 'disabled' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        className={smallBtn}
                        disabled={busy !== null}
                        onClick={() => {
                          if (window.confirm(`Remove ${t.name} and their login?`)) act(t.id, () => deleteTeacher(t.id));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
