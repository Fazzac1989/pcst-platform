/* eslint-disable @next/next/no-img-element */
import { redirect } from 'next/navigation';
import { getTripRoster } from '@/lib/app/data';
import { ageOn, initials, telHref } from '@/lib/app/people';
import { getStudentEssentials } from '@/lib/app/register';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

const longDate = (iso: string) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * The trip leader's register: every student, and a tap opens their
 * essentials — photo, date of birth, nationality, the emergency contact (tap
 * to call), dietary and medical needs, room and app code.
 */
export default async function RegisterPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  if (session.member.role !== 'teacher') redirect('/app/trip');
  const { trip } = session;

  const [students, roster] = await Promise.all([getStudentEssentials(trip.id), getTripRoster(trip.id)]);
  const parents = roster.filter((m) => m.role === 'parent');
  const nameOf = (id: number | null) => roster.find((m) => m.id === id)?.name ?? '—';
  const onDay = trip.startDate ?? new Date().toISOString().slice(0, 10);
  const needs = students.filter((s) => s.dietary || s.medical);

  return (
    <div>
      <h1 className="papp-page-title">Student Register</h1>
      <p className="papp-note">Tap a student for their essentials. Tap the emergency number to call it.</p>

      {needs.length > 0 && (
        <section className="papp-card papp-needs">
          <h2>⚕️ Medical &amp; dietary ({needs.length})</h2>
          {needs.map((s) => (
            <p key={s.memberId}>
              <strong>{s.name}</strong>
              {s.medical && <span className="papp-flag med">{s.medical}</span>}
              {s.dietary && <span className="papp-flag">{s.dietary}</span>}
            </p>
          ))}
        </section>
      )}

      <section className="papp-card">
        <h2>🎒 Students ({students.length})</h2>
        <div className="papp-students">
          {students.map((s) => {
            const age = s.dateOfBirth ? ageOn(s.dateOfBirth, onDay) : null;
            return (
              <details key={s.memberId} className="papp-student">
                <summary>
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="papp-avatar" loading="lazy" />
                  ) : (
                    <span className="papp-avatar papp-avatar-blank">{initials(s.name)}</span>
                  )}
                  <span className="papp-student-name">
                    {s.name}
                    <small>{[s.room, s.yearGroup].filter(Boolean).join(' · ') || (s.hasDetails ? '' : 'No details yet')}</small>
                  </span>
                  {s.medical && <span className="papp-dot med" title="Medical">M</span>}
                  {s.dietary && <span className="papp-dot" title="Dietary">D</span>}
                </summary>

                <div className="papp-student-body">
                  {s.photoUrl && <img src={s.photoUrl} alt={s.name} className="papp-student-photo" />}
                  {!s.hasDetails && (
                    <p className="papp-empty">
                      Nothing filled in for {s.name.split(' ')[0]} on the teacher portal yet — add their details there and they appear here.
                    </p>
                  )}
                  <dl className="papp-facts">
                    {s.dateOfBirth && (
                      <>
                        <dt>Date of birth</dt>
                        <dd>
                          {longDate(s.dateOfBirth)}
                          {age !== null && ` (${age})`}
                        </dd>
                      </>
                    )}
                    {s.nationality && (
                      <>
                        <dt>Nationality</dt>
                        <dd>{s.nationality}</dd>
                      </>
                    )}
                    {s.room && (
                      <>
                        <dt>Room</dt>
                        <dd>{s.room}</dd>
                      </>
                    )}
                    <dt>Medical</dt>
                    <dd className={s.medical ? 'papp-med' : undefined}>{s.medical || 'None given'}</dd>
                    <dt>Dietary</dt>
                    <dd>{s.dietary || 'None given'}</dd>
                    <dt>App code</dt>
                    <dd className="papp-mono">{s.loginCode}</dd>
                  </dl>
                  {s.emergencyPhone ? (
                    <a href={telHref(s.emergencyPhone)} className="btn btn-brass papp-call">
                      📞 Call {s.emergencyName || 'emergency contact'} · {s.emergencyPhone}
                    </a>
                  ) : (
                    s.hasDetails && <p className="papp-tick-due">No emergency contact number yet.</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        {students.length === 0 && <p className="papp-empty">No students on the register yet.</p>}
      </section>

      {parents.length > 0 && (
        <section className="papp-card">
          <h2>👪 Parents ({parents.length})</h2>
          <table className="papp-table">
            <tbody>
              {parents.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <span className="papp-doc-owner"> · {nameOf(p.parentOf)}</span>
                  </td>
                  <td className="papp-mono">{p.loginCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
