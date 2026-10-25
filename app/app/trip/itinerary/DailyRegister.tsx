/* eslint-disable @next/next/no-img-element */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { markAllPresent, setRegisterMark } from '@/lib/app/actions';
import { initials, registerCount } from '@/lib/app/people';

type Status = 'present' | 'absent';
export type RegisterStudent = { id: number; name: string; photoUrl: string | null };

const NEXT: Record<'none' | Status, Status | null> = { none: 'present', present: 'absent', absent: null };

/**
 * The day's register for the trip leaders: tap a student to mark them
 * present, tap again for absent, a third time to clear. Every teacher on the
 * trip sees the same register.
 */
export default function DailyRegister({
  date,
  students,
  marks,
}: {
  date: string;
  students: RegisterStudent[];
  marks: { date: string; studentId: number; status: Status }[];
}) {
  const router = useRouter();
  const fromServer = () => new Map(marks.filter((m) => m.date === date).map((m) => [m.studentId, m.status]));
  const [state, setState] = useState(fromServer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new day, or another teacher's marks arriving on refresh.
  useEffect(() => setState(fromServer()), [date, marks]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = registerCount(
    students.map((s) => s.id),
    Array.from(state.entries()).map(([studentId, status]) => ({ studentId, status }))
  );

  async function tap(id: number) {
    const next = NEXT[state.get(id) ?? 'none'];
    const before = new Map(state);
    const after = new Map(state);
    if (next) after.set(id, next);
    else after.delete(id);
    setState(after);
    setError(null);
    const r = await setRegisterMark(date, id, next);
    if (!r.ok) {
      setState(before);
      setError(r.error ?? 'Not saved — try again.');
    } else router.refresh();
  }

  async function allPresent() {
    setBusy(true);
    setError(null);
    const r = await markAllPresent(date);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? 'Not saved — try again.');
    const after = new Map(state);
    for (const s of students) if (!after.has(s.id)) after.set(s.id, 'present');
    setState(after);
    router.refresh();
  }

  if (!students.length) return null;

  return (
    <details className="papp-card papp-register" open={count.unmarked > 0}>
      <summary>
        <span>
          <strong>
            ✅ {date === new Date().toISOString().slice(0, 10)
              ? 'Today’s register'
              : `Register · ${new Date(date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
          </strong>
          <small>
            {count.present} present
            {count.absent > 0 && ` · ${count.absent} absent`}
            {count.unmarked > 0 && ` · ${count.unmarked} to mark`}
          </small>
        </span>
        <span className={`papp-register-badge${count.unmarked === 0 && count.absent === 0 ? ' done' : count.absent ? ' warn' : ''}`}>
          {count.present}/{students.length}
        </span>
      </summary>
      <p className="papp-note">Tap once for present, twice for absent, again to clear.</p>
      <ul className="papp-reglist">
        {students.map((s) => {
          const st = state.get(s.id);
          return (
            <li key={s.id}>
              <button type="button" className={st ?? ''} onClick={() => tap(s.id)} aria-label={`${s.name}: ${st ?? 'not marked'}`}>
                {s.photoUrl ? <img src={s.photoUrl} alt="" className="papp-avatar sm" loading="lazy" /> : <span className="papp-avatar sm papp-avatar-blank">{initials(s.name)}</span>}
                <span className="papp-reg-name">{s.name}</span>
                <span className="papp-reg-mark">{st === 'present' ? '✓' : st === 'absent' ? 'Absent' : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {count.unmarked > 0 && (
        <button type="button" className="btn btn-brass papp-chal-go" disabled={busy} onClick={allPresent}>
          {busy ? 'Saving…' : `Mark the other ${count.unmarked} present`}
        </button>
      )}
      {error && <p className="papp-error">{error}</p>}
    </details>
  );
}
