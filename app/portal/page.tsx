import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { portalSignOut } from '@/lib/portal/actions';
import { tripsForTeacher } from '@/lib/portal/planning';
import { getPortalTeacher } from '@/lib/portal/session';
import { quoteTotal, perStudent, formatMoney, type QuoteLine } from '@/lib/quotes';
import QuoteCard from './QuoteCard';

export const dynamic = 'force-dynamic';

export default async function PortalDashboard() {
  const teacher = await getPortalTeacher();
  if (!teacher) redirect('/portal/login');

  // The planning workspace arrives with its own migration; until it is run the
  // dashboard simply shows quotes.
  const trips = await tripsForTeacher(teacher.id).catch(() => []);

  const db = createAdminClient();
  const { data } = await db
    .from('quotes')
    .select(
      'id, ref, title, status, public_token, travel_dates, validity, pupils, staff, currency, accepted_at, published_at, quote_lines(qty, unit_cost, markup_pct)'
    )
    .ilike('teacher_email', teacher.email)
    .in('status', ['published', 'accepted'])
    .order('published_at', { ascending: false });

  const quotes = (data ?? []).map((q: any) => {
    const lines: QuoteLine[] = (q.quote_lines ?? []).map((l: any) => ({
      description: '',
      qty: l.qty,
      unitCost: Number(l.unit_cost ?? 0),
      markupPct: Number(l.markup_pct ?? 0),
    }));
    const total = quoteTotal(lines);
    return {
      id: q.id,
      ref: q.ref,
      title: q.title,
      status: q.status as 'published' | 'accepted',
      token: q.public_token as string,
      travelDates: q.travel_dates as string | null,
      validity: q.validity as string | null,
      pupils: q.pupils as number | null,
      staff: q.staff as number | null,
      acceptedAt: q.accepted_at as string | null,
      total: formatMoney(q.currency ?? 'AED', total),
      perStudent: (() => {
        const p = perStudent(lines, q.pupils);
        return p === null ? null : formatMoney(q.currency ?? 'AED', p);
      })(),
    };
  });

  const open = quotes.filter((q) => q.status === 'published');
  const accepted = quotes.filter((q) => q.status === 'accepted');

  return (
    <div className="pt-dash">
      <div className="pt-dash-head">
        <div>
          <h1>Welcome, {teacher.name.split(' ')[0]}</h1>
          <p className="pt-lede">{teacher.schoolName}</p>
        </div>
        <form action={portalSignOut}>
          <button className="pt-signout">Sign out</button>
        </form>
      </div>

      {quotes.length === 0 && trips.length === 0 ? (
        <div className="pt-card">
          <h2>No quotes yet</h2>
          <p className="pt-lede">
            When our team sends you a quote it will appear here, where you can read it, download it
            and accept it. Nothing to do for now.
          </p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="pt-section">
              <h2>
                Awaiting your decision <span>{open.length}</span>
              </h2>
              <div className="pt-grid">
                {open.map((q) => (
                  <QuoteCard key={q.id} quote={q} />
                ))}
              </div>
            </section>
          )}

          {accepted.length > 0 && (
            <section className="pt-section">
              <h2>
                Accepted <span>{accepted.length}</span>
              </h2>
              <div className="pt-grid">
                {accepted.map((q) => (
                  <QuoteCard key={q.id} quote={q} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {trips.length > 0 && (
        <section className="pt-section">
          <h2>
            Your trips <span>{trips.length}</span>
          </h2>
          <div className="pt-grid">
            {trips.map((t) => (
              <Link key={t.id} href={`/portal/trips/${t.id}`} className="pt-trip">
                <span className={`pt-status pt-status--${t.status}`}>{t.status}</span>
                <h3>{t.title}</h3>
                <p>
                  {[t.travelDates, t.paperworkDue ? `paperwork due ${new Date(t.paperworkDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Dates to confirm'}
                </p>
                <span className="pt-trip-go">Open the planner →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
