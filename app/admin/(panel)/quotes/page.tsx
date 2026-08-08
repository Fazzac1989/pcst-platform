import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatMoney, perStudent } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage() {
  const db = createClient();
  const { data } = await db
    .from('quotes')
    .select('id, ref, title, status, school_name, teacher_name, pupils, currency, updated_at, quote_lines(qty, unit_cost, markup_pct)')
    .order('updated_at', { ascending: false });

  const rows = (data ?? []).map((q: any) => {
    const lines = (q.quote_lines ?? []).map((l: any) => ({
      description: '',
      qty: l.qty,
      unitCost: Number(l.unit_cost ?? 0),
      markupPct: Number(l.markup_pct ?? 0),
    }));
    const pps = perStudent(lines, q.pupils);
    return {
      id: q.id,
      ref: q.ref,
      title: q.title,
      status: q.status,
      school: q.school_name ?? '—',
      teacher: q.teacher_name ?? '—',
      perStudent: pps !== null ? formatMoney(q.currency ?? 'AED', pps) : '—',
      updated: q.updated_at,
    };
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl">Quotes</h1>
          <p className="text-sm text-ink-soft mt-1">
            {rows.length} quotes · {rows.filter((r) => r.status === 'published').length} published
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors"
        >
          New quote
        </Link>
      </div>

      <div className="border border-line rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
              <th className="px-4 py-3 font-semibold">Ref</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">School</th>
              <th className="px-4 py-3 font-semibold">Teacher</th>
              <th className="px-4 py-3 font-semibold">Per student</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-ink/[.02]">
                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/quotes/${r.id}`} className="font-medium hover:text-teal-deep">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.school}</td>
                <td className="px-4 py-3">{r.teacher}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.perStudent}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      r.status === 'published'
                        ? 'bg-teal/15 text-teal-deep'
                        : r.status === 'draft'
                          ? 'bg-ink/10 text-ink-soft'
                          : 'bg-ink/5 text-ink-soft'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {new Date(r.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No quotes yet — create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
