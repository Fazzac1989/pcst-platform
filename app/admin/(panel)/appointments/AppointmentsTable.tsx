'use client';

import { useRouter } from 'next/navigation';
import { setAppointmentStatus } from '@/lib/admin/actions';

export type AppointmentRow = {
  id: number;
  name: string;
  school: string;
  email: string;
  appointmentType: string;
  tripSlug: string | null;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  we_visit: 'We visit them',
  you_visit: 'They visit us',
  online: 'Online meeting',
};

const STATUS_STYLES: Record<AppointmentRow['status'], string> = {
  new: 'bg-teal/15 text-teal-deep',
  contacted: 'bg-ink/10 text-ink-soft',
  closed: 'bg-ink/5 text-ink-soft',
};

export default function AppointmentsTable({ rows }: { rows: AppointmentRow[] }) {
  const router = useRouter();

  async function onStatus(row: AppointmentRow, status: AppointmentRow['status']) {
    await setAppointmentStatus(row.id, status);
    router.refresh();
  }

  return (
    <div className="border border-line rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line bg-ink/[.03]">
            <th className="px-4 py-3 font-semibold">Received</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">School</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Trip</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-0 hover:bg-ink/[.02]">
              <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                {new Date(row.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{row.name}</div>
                <a href={`mailto:${row.email}`} className="text-xs text-teal-deep hover:underline">
                  {row.email}
                </a>
              </td>
              <td className="px-4 py-3">{row.school}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {TYPE_LABELS[row.appointmentType] ?? row.appointmentType}
              </td>
              <td className="px-4 py-3">
                {row.tripSlug ? (
                  <a
                    href={`/trips/${row.tripSlug}`}
                    target="_blank"
                    className="text-teal-deep hover:underline"
                  >
                    {row.tripSlug}
                  </a>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={row.status}
                  onChange={(e) => onStatus(row, e.target.value as AppointmentRow['status'])}
                  className={`text-xs font-semibold rounded px-2 py-1 border border-line ${STATUS_STYLES[row.status]}`}
                >
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="closed">closed</option>
                </select>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                No appointment requests yet. They&apos;ll appear here the moment someone books.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
