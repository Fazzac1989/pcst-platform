import { redirect } from 'next/navigation';
import { getTripRoster } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  if (session.member.role !== 'teacher') redirect('/app/trip');
  const { trip } = session;

  const roster = await getTripRoster(trip.id);
  const students = roster.filter((m) => m.role === 'student');
  const parents = roster.filter((m) => m.role === 'parent');
  const nameOf = (id: number | null) => roster.find((m) => m.id === id)?.name ?? '—';

  return (
    <div>
      {trip.contacts.length > 0 && (
        <section className="papp-card">
          <h2>📞 Key contacts</h2>
          <div className="papp-doclist">
            {trip.contacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone.replace(/\s/g, '')}`} className="papp-doc">
                <span className="papp-doc-title">{c.label}</span>
                <span className="papp-contact-phone">{c.phone}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {trip.confirmations.length > 0 && (
        <section className="papp-card">
          <h2>🔖 Confirmation numbers</h2>
          <table className="papp-table">
            <tbody>
              {trip.confirmations.map((c, i) => (
                <tr key={i}>
                  <td>{c.label}</td>
                  <td className="papp-mono">{c.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="papp-card">
        <h2>🎒 Students ({students.length})</h2>
        <table className="papp-table">
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td className="papp-mono">{s.loginCode}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
