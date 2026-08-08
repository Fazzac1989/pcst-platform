import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PushToAppForm from './PushToAppForm';

export const dynamic = 'force-dynamic';

export default async function AdminAppTripsPage() {
  const db = createClient();
  const [{ data: trips }, { data: quotes }] = await Promise.all([
    db
      .from('app_trips')
      .select('id, title, destination, start_date, end_date, status, app_members(count)')
      .order('created_at', { ascending: false }),
    db
      .from('quotes')
      .select('id, ref, title, travel_dates, status')
      .in('status', ['published', 'accepted'])
      .order('updated_at', { ascending: false }),
  ]);

  const pushed = new Set((trips ?? []).map((t: any) => t.id));
  const { data: pushedQuotes } = await db.from('app_trips').select('quote_id');
  const pushedQuoteIds = new Set((pushedQuotes ?? []).map((r) => r.quote_id).filter(Boolean));
  const availableQuotes = (quotes ?? []).filter((q) => !pushedQuoteIds.has(q.id));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl">App Trips</h1>
        <p className="text-sm text-ink-soft mt-1">
          {(trips ?? []).length} trips in the travel app · app login at <code>/app</code>
        </p>
      </div>

      <PushToAppForm quotes={availableQuotes.map((q) => ({ id: q.id, label: `${q.ref} — ${q.title}`, travelDates: q.travel_dates }))} />

      <div className="border border-line rounded overflow-x-auto mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">Members</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(trips ?? []).map((t: any) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-ink/[.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/app/${t.id}`} className="font-medium hover:text-teal-deep">
                    {t.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{t.destination}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                  {t.start_date
                    ? `${new Date(t.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${t.end_date ? new Date(t.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{t.app_members?.[0]?.count ?? 0}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      t.status === 'active' ? 'bg-teal/15 text-teal-deep' : 'bg-ink/10 text-ink-soft'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {(trips ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                  No app trips yet — push a confirmed quote above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
