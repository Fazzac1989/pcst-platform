import { createClient } from '@/lib/supabase/server';
import AppointmentsTable, { type AppointmentRow } from './AppointmentsTable';

export const dynamic = 'force-dynamic';

export default async function AdminAppointmentsPage() {
  const db = createClient();
  const { data } = await db
    .from('appointment_requests')
    .select('id, name, school, email, appointment_type, trip_slug, status, created_at')
    .order('created_at', { ascending: false });

  const rows: AppointmentRow[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    school: r.school,
    email: r.email,
    appointmentType: r.appointment_type,
    tripSlug: r.trip_slug,
    status: r.status,
    createdAt: r.created_at,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Appointments</h1>
        <p className="text-sm text-ink-soft mt-1">
          {rows.filter((r) => r.status === 'new').length} awaiting reply · {rows.length} total
        </p>
      </div>
      <AppointmentsTable rows={rows} />
    </div>
  );
}
