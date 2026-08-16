'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createPortalTrip,
  deletePortalTrip,
  purgeTripData,
  setTripStatus,
  setTripTeachers,
} from '@/lib/admin/planning-actions';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors disabled:opacity-50';

export type TeacherOption = { id: number; name: string; email: string; schoolName: string };
export type PlanningTrip = {
  id: number;
  title: string;
  schoolName: string;
  travelDates: string | null;
  departureDate: string | null;
  paperworkDue: string | null;
  status: 'planning' | 'ready' | 'travelling' | 'completed';
  dataPurgedAt: string | null;
  teacherIds: number[];
  studentCount: number;
  completeCount: number;
  outstanding: number;
  withDietary: number;
  withMedical: number;
  gaps: { label: string; count: number }[];
};
type AcceptedQuote = {
  id: number;
  ref: string;
  title: string;
  schoolName: string | null;
  travelDates: string | null;
  teacherEmail: string | null;
};

const d = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export default function PlanningManager({
  trips,
  teachers,
  acceptedQuotes,
}: {
  trips: PlanningTrip[];
  teachers: TeacherOption[];
  acceptedQuotes: AcceptedQuote[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({
    quoteId: '' as string,
    title: '',
    schoolName: '',
    travelDates: '',
    departureDate: '',
    paperworkDue: '',
    teacherIds: [] as number[],
  });

  async function act(id: number, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
  }

  function fillFromQuote(quoteId: string) {
    const q = acceptedQuotes.find((x) => String(x.id) === quoteId);
    if (!q) {
      setForm((f) => ({ ...f, quoteId }));
      return;
    }
    const match = teachers.find((t) => t.email.toLowerCase() === (q.teacherEmail ?? '').toLowerCase());
    setForm((f) => ({
      ...f,
      quoteId,
      title: q.title,
      schoolName: q.schoolName ?? '',
      travelDates: q.travelDates ?? '',
      teacherIds: match ? [match.id] : f.teacherIds,
    }));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy('new');
    setError(null);
    const res = await createPortalTrip({
      quoteId: form.quoteId ? Number(form.quoteId) : null,
      title: form.title,
      schoolName: form.schoolName,
      travelDates: form.travelDates,
      departureDate: form.departureDate || null,
      paperworkDue: form.paperworkDue || null,
      teacherIds: form.teacherIds,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm({ quoteId: '', title: '', schoolName: '', travelDates: '', departureDate: '', paperworkDue: '', teacherIds: [] });
    router.refresh();
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Trip planning</h1>
        <p className="text-sm text-ink-soft mt-1">
          Open a workspace so teachers can fill in their student list, passports, consent forms,
          rooming and dietary or medical details. You see the same data and what is still missing.
        </p>
      </div>

      <form onSubmit={onCreate} className="border border-line rounded p-6 grid gap-4 mb-8">
        <span className={labelCls}>Open a planning workspace</span>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">From an accepted quote (optional)</span>
            <select className={inputCls} value={form.quoteId} onChange={(e) => fillFromQuote(e.target.value)}>
              <option value="">— none —</option>
              {acceptedQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.ref} — {q.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Trip title</span>
            <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">School</span>
            <input className={inputCls} value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Travel dates (as written)</span>
            <input className={inputCls} value={form.travelDates} onChange={(e) => setForm({ ...form, travelDates: e.target.value })} placeholder="12–16 October 2026" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Departure date</span>
            <input type="date" className={inputCls} value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-ink-soft">Paperwork due</span>
            <input type="date" className={inputCls} value={form.paperworkDue} onChange={(e) => setForm({ ...form, paperworkDue: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-ink-soft">Teachers who can open it</span>
          <div className="flex gap-2 flex-wrap">
            {teachers.length === 0 && <span className="text-sm text-ink-soft">Invite a teacher first.</span>}
            {teachers.map((t) => {
              const on = form.teacherIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    on ? 'bg-ink text-white border-ink' : 'border-line text-ink-soft hover:border-teal'
                  }`}
                  onClick={() =>
                    setForm({
                      ...form,
                      teacherIds: on ? form.teacherIds.filter((x) => x !== t.id) : [...form.teacherIds, t.id],
                    })
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
        <button className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors justify-self-start disabled:opacity-60" disabled={busy !== null}>
          {busy === 'new' ? 'Creating…' : 'Open workspace'}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {trips.length === 0 ? (
        <p className="text-sm text-ink-soft border border-line rounded p-6">No workspaces yet.</p>
      ) : (
        <div className="grid gap-3">
          {trips.map((t) => {
            const pct = t.studentCount ? Math.round((t.completeCount / t.studentCount) * 100) : 0;
            return (
              <div key={t.id} className="border border-line rounded">
                <div className="p-5 grid gap-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-serif text-xl">{t.title}</div>
                      <div className="text-sm text-ink-soft">
                        {t.schoolName}
                        {t.travelDates ? ` · ${t.travelDates}` : ''}
                        {t.paperworkDue ? ` · paperwork due ${d(t.paperworkDue)}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        className="border border-line rounded px-2 py-1 text-xs bg-white"
                        value={t.status}
                        disabled={busy !== null || Boolean(t.dataPurgedAt)}
                        onChange={(e) => act(t.id, () => setTripStatus(t.id, e.target.value as any))}
                      >
                        {['planning', 'ready', 'travelling', 'completed'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button className={smallBtn} onClick={() => setOpen(open === t.id ? null : t.id)}>
                        {open === t.id ? 'Close' : 'Teachers'}
                      </button>
                    </div>
                  </div>

                  {t.dataPurgedAt ? (
                    <p className="text-sm text-ink-soft border border-line rounded p-3">
                      Student records were removed on {d(t.dataPurgedAt)}. Nothing personal is
                      stored for this trip.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        <div className="h-2 rounded-full bg-ink/10 flex-1 min-w-[160px] overflow-hidden">
                          <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-ink-soft">
                          <strong className="text-ink">
                            {t.completeCount}/{t.studentCount}
                          </strong>{' '}
                          complete
                        </span>
                        {t.withDietary > 0 && <span className="text-xs bg-ink/5 rounded px-2 py-0.5">{t.withDietary} dietary</span>}
                        {t.withMedical > 0 && <span className="text-xs bg-danger/10 text-danger rounded px-2 py-0.5">{t.withMedical} medical</span>}
                      </div>
                      {t.gaps.length > 0 && (
                        <div className="text-xs text-ink-soft flex gap-3 flex-wrap">
                          {t.gaps.map((g) => (
                            <span key={g.label}>
                              <strong className="text-ink">{g.count}</strong> missing {g.label.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className={smallBtn}
                          disabled={busy !== null || t.studentCount === 0}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete all ${t.studentCount} student records and documents for "${t.title}"?\n\nThis is how passport and medical data stops being held once the trip is over. It cannot be undone.`
                              )
                            ) {
                              act(t.id, () => purgeTripData(t.id));
                            }
                          }}
                        >
                          Delete student data
                        </button>
                        <button
                          className={`${smallBtn} text-danger`}
                          disabled={busy !== null}
                          onClick={() => {
                            if (window.confirm(`Delete the whole workspace for "${t.title}", including all student data?`)) {
                              act(t.id, () => deletePortalTrip(t.id));
                            }
                          }}
                        >
                          Delete workspace
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {open === t.id && (
                  <div className="border-t border-line p-5">
                    <span className={labelCls}>Who can open this trip</span>
                    <div className="flex gap-2 flex-wrap mt-2">
                      {teachers.map((tc) => {
                        const on = t.teacherIds.includes(tc.id);
                        return (
                          <button
                            key={tc.id}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                              on ? 'bg-ink text-white border-ink' : 'border-line text-ink-soft hover:border-teal'
                            }`}
                            disabled={busy !== null}
                            onClick={() =>
                              act(t.id, () =>
                                setTripTeachers(
                                  t.id,
                                  on ? t.teacherIds.filter((x) => x !== tc.id) : [...t.teacherIds, tc.id]
                                )
                              )
                            }
                          >
                            {tc.name} <span className="opacity-60">{tc.schoolName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
