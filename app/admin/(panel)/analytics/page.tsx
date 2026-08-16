import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 3650, label: 'All time' },
] as const;

function duration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const days = Number(searchParams.days) || 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const db = createClient();
  const [statsRes, tripsRes] = await Promise.all([
    db.rpc('trip_view_stats', { since }),
    db.from('trips').select('id, title, slug, status'),
  ]);

  // The table and function arrive with the same migration, so one check covers both.
  if (statsRes.error) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl mb-4">Analytics</h1>
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          View tracking is unavailable until the{' '}
          <code>20260814000000_trip_views.sql</code> migration has been run in the Supabase SQL
          editor.
        </p>
      </div>
    );
  }

  const trips = new Map((tripsRes.data ?? []).map((t: any) => [t.id, t]));
  const rows = (statsRes.data ?? []).map((r: any) => ({
    ...r,
    trip: trips.get(r.trip_id),
    avg: r.avg_dwell_seconds === null ? null : Number(r.avg_dwell_seconds),
    total: Number(r.total_dwell_seconds ?? 0),
    views: Number(r.views),
  }));

  const totalViews = rows.reduce((s: number, r: any) => s + r.views, 0);
  const engaged = rows.filter((r: any) => r.avg !== null);
  const overallAvg = engaged.length
    ? engaged.reduce((s: number, r: any) => s + r.avg * r.views, 0) /
      engaged.reduce((s: number, r: any) => s + r.views, 0)
    : null;

  return (
    <div className="max-w-5xl">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl">Analytics</h1>
          <p className="text-sm text-ink-soft mt-1">
            Which itineraries teachers look at, and how long they stay. Anonymous and cookie-less.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/analytics?days=${r.days}`}
              className={`text-xs font-semibold px-3 py-1.5 rounded border transition-colors ${
                days === r.days
                  ? 'bg-ink text-white border-ink'
                  : 'border-line text-ink-soft hover:border-teal hover:text-teal-deep'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="border border-line rounded p-5">
          <div className="text-xs uppercase tracking-widest text-teal-deep font-semibold">Views</div>
          <div className="font-serif text-3xl mt-1">{totalViews.toLocaleString()}</div>
        </div>
        <div className="border border-line rounded p-5">
          <div className="text-xs uppercase tracking-widest text-teal-deep font-semibold">
            Itineraries viewed
          </div>
          <div className="font-serif text-3xl mt-1">{rows.length}</div>
        </div>
        <div className="border border-line rounded p-5">
          <div className="text-xs uppercase tracking-widest text-teal-deep font-semibold">
            Average time
          </div>
          <div className="font-serif text-3xl mt-1">{duration(overallAvg)}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft border border-line rounded p-6">
          No views recorded in this period yet. Tracking starts as soon as the migration is run and
          a trip page is visited.
        </p>
      ) : (
        <div className="border border-line rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Itinerary</th>
                <th className="px-4 py-3 font-semibold text-right">Views</th>
                <th className="px-4 py-3 font-semibold text-right">Avg. time</th>
                <th className="px-4 py-3 font-semibold text-right">Total time</th>
                <th className="px-4 py-3 font-semibold text-right">Last viewed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={r.trip_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink-soft">{i + 1}</td>
                  <td className="px-4 py-3">
                    {r.trip ? (
                      <Link href={`/admin/trips/${r.trip_id}`} className="font-medium hover:text-teal-deep">
                        {r.trip.title}
                      </Link>
                    ) : (
                      <span className="text-ink-soft italic">Deleted trip #{r.trip_id}</span>
                    )}
                    {r.trip?.status !== 'published' && r.trip && (
                      <span className="ml-2 text-xs text-ink-soft">({r.trip.status})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{r.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{duration(r.avg)}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{duration(r.total)}</td>
                  <td className="px-4 py-3 text-right text-ink-soft text-xs">
                    {new Date(r.last_viewed).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-ink-soft mt-4">
        Time is counted only while the page is actually on screen, ignores visits under two
        seconds, and is capped at 30 minutes so a forgotten tab can&apos;t skew the average.
      </p>
    </div>
  );
}
