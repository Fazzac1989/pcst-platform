import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TripsTable, { type AdminTripRow } from './TripsTable';

export const dynamic = 'force-dynamic';

export default async function AdminTripsPage() {
  const db = createClient();
  const [{ data: trips }, { data: subjects }] = await Promise.all([
    db
      .from('trips')
      .select(
        'id, slug, title, status, featured, duration_days, duration_nights, updated_at, subjects(name), countries(name)'
      )
      .order('updated_at', { ascending: false }),
    db.from('subjects').select('id, name').order('name'),
  ]);

  const rows: AdminTripRow[] = (trips ?? []).map((t: any) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    subject: t.subjects?.name ?? '—',
    country: t.countries?.name ?? '—',
    duration: `${t.duration_days}d / ${t.duration_nights}n`,
    status: t.status,
    featured: t.featured,
    updatedAt: t.updated_at,
  }));

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl">Trips</h1>
          <p className="text-sm text-ink-soft mt-1">
            {rows.length} trips · {rows.filter((r) => r.status === 'published').length} published
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            href="/admin/trips/import"
            className="border border-ink text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-ink hover:text-white transition-colors"
          >
            Import from document
          </Link>
          <Link
            href="/admin/trips/new"
            className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors"
          >
            New trip
          </Link>
        </div>
      </div>
      <TripsTable rows={rows} subjects={(subjects ?? []).map((s) => s.name)} />
    </div>
  );
}
