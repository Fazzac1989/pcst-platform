import { redirect } from 'next/navigation';
import { getChecklist, getChecklistTicks, getTripRoster } from '@/lib/app/data';
import { checklistProgress } from '@/lib/app/learning';
import { getAppSession } from '@/lib/app/session';
import ChecklistTicks from './ChecklistTicks';

export const dynamic = 'force-dynamic';

export default async function ChecklistPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const items = await getChecklist(trip.id);
  const ticks = await getChecklistTicks(items.map((i) => i.id));

  if (member.role === 'teacher') {
    const students = (await getTripRoster(trip.id)).filter((m) => m.role === 'student');
    const rows = students.map((s) => ({ ...s, ...checklistProgress(items, ticks, s.id) })).sort((a, b) => a.done - b.done || a.name.localeCompare(b.name));
    const ready = rows.filter((r) => r.total > 0 && r.done === r.total).length;
    return (
      <div>
        <h1 className="papp-page-title">Pre-arrival checklist</h1>
        <p className="papp-note">
          How each family is getting on. They tick items off in the app — parents get theirs by email from the teacher portal.
        </p>
        {items.length === 0 ? (
          <section className="papp-card">
            <p className="papp-empty">No checklist for this trip yet — your PCT team adds it.</p>
          </section>
        ) : (
          <section className="papp-card">
            <h2>
              {ready} of {rows.length} families ready
            </h2>
            <ul className="papp-famlist">
              {rows.map((r) => (
                <li key={r.id}>
                  <details>
                    <summary>
                      <span>{r.name}</span>
                      <span className={r.done === r.total ? 'papp-fam-done' : 'papp-fam-count'}>
                        {r.done === r.total ? 'Ready ✓' : `${r.done}/${r.total}`}
                      </span>
                    </summary>
                    {r.open.length > 0 && (
                      <p className="papp-tick-detail">Still to do: {r.open.map((o) => o.title).join(' · ')}</p>
                    )}
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const studentId = member.role === 'student' ? member.id : member.parentOf;
  const done = ticks.filter((t) => t.studentId === studentId).map((t) => t.itemId);

  return (
    <div>
      <h1 className="papp-page-title">Pre-arrival checklist</h1>
      <p className="papp-note">
        {member.role === 'parent'
          ? 'Everything to sort before the trip. Tick each one off as you go — your child sees the same list.'
          : 'Everything to sort before the trip. Tick each one off as you go — your parents see the same list.'}
      </p>
      {items.length === 0 ? (
        <section className="papp-card">
          <p className="papp-empty">Your checklist will appear here before departure.</p>
        </section>
      ) : (
        <ChecklistTicks items={items} done={done} />
      )}
    </div>
  );
}
