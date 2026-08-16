'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  MISSING_LABELS,
  missingFor,
  passportExpiringSoon,
  type MissingKey,
  type PortalStudent,
  type PortalTrip,
} from '@/lib/portal/student-fields';
import {
  addStudentsBulk,
  deleteStudent,
  documentUrl,
  removeDocument,
  saveStudent,
} from '@/lib/portal/planning-actions';

const dateStr = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function StudentWorkspace({
  trip,
  students,
}: {
  trip: PortalTrip;
  students: PortalStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<number | 'new' | null>(null);
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploading = useRef<string | null>(null);

  const complete = students.filter((s) => missingFor(s).length === 0).length;
  const pct = students.length ? Math.round((complete / students.length) * 100) : 0;

  // Which item is outstanding for how many students.
  const gaps = (Object.keys(MISSING_LABELS) as MissingKey[])
    .map((k) => ({ key: k, label: MISSING_LABELS[k], count: students.filter((s) => missingFor(s).includes(k)).length }))
    .filter((g) => g.count > 0);

  const expiring = students.filter((s) => passportExpiringSoon(s, trip.departureDate));

  const rooms = students.reduce<Record<string, PortalStudent[]>>((acc, s) => {
    const key = s.roomGroup?.trim() || 'Unassigned';
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  async function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
    return res.ok;
  }

  async function onUpload(studentId: number, kind: 'passport' | 'consent', file: File) {
    uploading.current = `${studentId}-${kind}`;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('tripId', String(trip.id));
    fd.set('studentId', String(studentId));
    fd.set('kind', kind);
    fd.set('file', file);
    const res = await fetch('/api/portal/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({ ok: false, error: 'Upload failed.' }));
    uploading.current = null;
    setBusy(false);
    if (!data.ok) setError(data.error ?? 'Upload failed.');
    else router.refresh();
  }

  async function onView(studentId: number, kind: 'passport' | 'consent') {
    setError(null);
    const res = await documentUrl(trip.id, studentId, kind);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.open(res.url, '_blank', 'noopener');
  }

  return (
    <div className="pt-ws">
      <header className="pt-ws-head">
        <div>
          <h1>{trip.title}</h1>
          <p className="pt-lede">
            {[trip.schoolName, trip.travelDates, trip.departureDate ? `departs ${dateStr(trip.departureDate)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span className={`pt-status pt-status--${trip.status}`}>{trip.status}</span>
      </header>

      <section className="pt-progress">
        <div className="pt-progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <p>
          <strong>
            {complete} of {students.length}
          </strong>{' '}
          students have everything we need
          {trip.paperworkDue && (
            <>
              {' '}
              · paperwork due <strong>{dateStr(trip.paperworkDue)}</strong>
            </>
          )}
        </p>
        {gaps.length > 0 && (
          <ul className="pt-gaps">
            {gaps.map((g) => (
              <li key={g.key}>
                <span>{g.count}</span> missing {g.label.toLowerCase()}
              </li>
            ))}
          </ul>
        )}
        {expiring.length > 0 && (
          <p className="pt-warn">
            {expiring.length} passport{expiring.length > 1 ? 's expire' : ' expires'} within six
            months of departure — most countries will refuse entry. Check{' '}
            {expiring.map((s) => s.fullName).join(', ')}.
          </p>
        )}
      </section>

      {error && <p className="pt-error">{error}</p>}

      <div className="pt-ws-actions">
        <button className="btn btn-brass" onClick={() => setOpen('new')} disabled={busy}>
          + Add a student
        </button>
        <button className="pt-link-btn" onClick={() => setShowBulk((v) => !v)} disabled={busy}>
          {showBulk ? 'Cancel' : 'Paste a list of names'}
        </button>
      </div>

      {showBulk && (
        <div className="pt-card pt-bulk">
          <p className="pt-hint">One name per line. Numbering is ignored. Details can be filled in after.</p>
          <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Aisha Khan\nOmar Said\nGrace Miller'} />
          <button
            className="btn btn-brass"
            disabled={busy || !bulk.trim()}
            onClick={async () => {
              if (await act(() => addStudentsBulk(trip.id, bulk))) {
                setBulk('');
                setShowBulk(false);
              }
            }}
          >
            {busy ? 'Adding…' : 'Add these students'}
          </button>
        </div>
      )}

      {open !== null && (
        <StudentForm
          tripId={trip.id}
          student={open === 'new' ? null : students.find((s) => s.id === open) ?? null}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            router.refresh();
          }}
        />
      )}

      {students.length === 0 ? (
        <div className="pt-card">
          <h2>No students yet</h2>
          <p className="pt-lede">
            Add them one at a time, or paste your list of names and fill in the details as they come
            back from parents.
          </p>
        </div>
      ) : (
        <>
          <section className="pt-section">
            <h2>
              Students <span>{students.length}</span>
            </h2>
            <div className="pt-students">
              {students.map((s) => {
                const missing = missingFor(s);
                return (
                  <article key={s.id} className={`pt-student${missing.length === 0 ? ' done' : ''}`}>
                    <div className="pt-student-main">
                      <button className="pt-student-name" onClick={() => setOpen(s.id)}>
                        {s.fullName}
                      </button>
                      <div className="pt-student-meta">
                        {[s.yearGroup, s.dateOfBirth ? dateStr(s.dateOfBirth) : null, s.roomGroup ? `Room ${s.roomGroup}` : null]
                          .filter(Boolean)
                          .join(' · ') || 'No details yet'}
                      </div>
                      {(s.dietary || s.medical) && (
                        <div className="pt-flags">
                          {s.dietary && <span className="pt-flag">Dietary</span>}
                          {s.medical && <span className="pt-flag pt-flag--med">Medical</span>}
                        </div>
                      )}
                      {missing.length > 0 && (
                        <div className="pt-missing">
                          Missing: {missing.map((k) => MISSING_LABELS[k]).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="pt-docs">
                      {(['passport', 'consent'] as const).map((kind) => {
                        const has = kind === 'passport' ? s.passportFile : s.consentFile;
                        const key = `${s.id}-${kind}`;
                        return (
                          <div key={kind} className="pt-doc">
                            <span className="pt-doc-label">
                              {kind === 'passport' ? 'Passport' : 'Consent'}
                            </span>
                            {has ? (
                              <>
                                <button className="pt-link-btn" onClick={() => onView(s.id, kind)}>
                                  View
                                </button>
                                <button
                                  className="pt-link-btn"
                                  disabled={busy}
                                  onClick={() => act(() => removeDocument(trip.id, s.id, kind))}
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <label className="pt-upload">
                                {uploading.current === key ? 'Uploading…' : 'Upload'}
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  hidden
                                  disabled={busy}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) onUpload(s.id, kind, f);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                      <button
                        className="pt-link-btn pt-remove"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Remove ${s.fullName} and their documents?`)) {
                            act(() => deleteStudent(trip.id, s.id));
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="pt-section">
            <h2>Rooming</h2>
            <div className="pt-rooms">
              {Object.entries(rooms)
                .sort(([a], [b]) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)))
                .map(([room, members]) => (
                  <div key={room} className={`pt-room${room === 'Unassigned' ? ' unassigned' : ''}`}>
                    <h3>
                      {room} <span>{members.length}</span>
                    </h3>
                    <ul>
                      {members.map((m) => (
                        <li key={m.id}>{m.fullName}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
            <p className="pt-hint">Set a room name on each student to group them here.</p>
          </section>
        </>
      )}
    </div>
  );
}

function StudentForm({
  tripId,
  student,
  onClose,
  onSaved,
}: {
  tripId: number;
  student: PortalStudent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="pt-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="pt-modal-inner"
        action={async (fd) => {
          setBusy(true);
          setError(null);
          const res = await saveStudent(tripId, fd);
          setBusy(false);
          if (!res.ok) setError(res.error);
          else onSaved();
        }}
      >
        <button type="button" className="apt-dialog-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>{student ? student.fullName : 'Add a student'}</h2>
        {student && <input type="hidden" name="id" value={student.id} />}

        <div className="pt-field-grid">
          <label className="wide">
            <span>Full name (as on passport)</span>
            <input name="full_name" defaultValue={student?.fullName ?? ''} required />
          </label>
          <label>
            <span>Date of birth</span>
            <input name="date_of_birth" type="date" defaultValue={student?.dateOfBirth ?? ''} />
          </label>
          <label>
            <span>Year group</span>
            <input name="year_group" defaultValue={student?.yearGroup ?? ''} placeholder="Year 10" />
          </label>
          <label>
            <span>Nationality</span>
            <input name="nationality" defaultValue={student?.nationality ?? ''} />
          </label>
          <label>
            <span>Passport number</span>
            <input name="passport_number" defaultValue={student?.passportNumber ?? ''} />
          </label>
          <label>
            <span>Passport expiry</span>
            <input name="passport_expiry" type="date" defaultValue={student?.passportExpiry ?? ''} />
          </label>
          <label>
            <span>Room group</span>
            <input name="room_group" defaultValue={student?.roomGroup ?? ''} placeholder="Room 3" />
          </label>
          <label>
            <span>Emergency contact</span>
            <input name="emergency_contact_name" defaultValue={student?.emergencyContactName ?? ''} placeholder="Parent name" />
          </label>
          <label>
            <span>Emergency phone</span>
            <input name="emergency_contact_phone" defaultValue={student?.emergencyContactPhone ?? ''} />
          </label>
          <label className="wide">
            <span>Dietary requirements</span>
            <input name="dietary" defaultValue={student?.dietary ?? ''} placeholder="Vegetarian, nut allergy…" />
          </label>
          <label className="wide">
            <span>Medical notes</span>
            <textarea name="medical" rows={2} defaultValue={student?.medical ?? ''} placeholder="Asthma — carries an inhaler" />
          </label>
          <label className="wide">
            <span>Other notes</span>
            <textarea name="notes" rows={2} defaultValue={student?.notes ?? ''} />
          </label>
        </div>

        {error && <p className="pt-error">{error}</p>}
        <div className="pt-modal-actions">
          <button className="btn btn-brass" disabled={busy}>
            {busy ? 'Saving…' : 'Save student'}
          </button>
          <button type="button" className="pt-link-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
