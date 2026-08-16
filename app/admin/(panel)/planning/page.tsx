import { createClient } from '@/lib/supabase/server';
import { MISSING_LABELS, missingFor, type PortalStudent } from '@/lib/portal/student-fields';
import PlanningManager, { type PlanningTrip, type TeacherOption } from './PlanningManager';

export const dynamic = 'force-dynamic';

export default async function AdminPlanningPage() {
  const db = createClient();

  const tripsRes = await db
    .from('portal_trips')
    .select('*, portal_trip_teachers(teacher_id), portal_students(*)')
    .order('departure_date', { ascending: true, nullsFirst: false });

  if (tripsRes.error) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl mb-4">Trip planning</h1>
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          The planning workspace is unavailable until the{' '}
          <code>20260816000000_planning_workspace.sql</code> migration has been run in the Supabase
          SQL editor.
        </p>
      </div>
    );
  }

  const [{ data: teachers }, { data: quotes }] = await Promise.all([
    db.from('portal_teachers').select('id, name, email, school_name').order('name'),
    db
      .from('quotes')
      .select('id, ref, title, school_name, travel_dates, teacher_email, status')
      .eq('status', 'accepted')
      .order('id', { ascending: false }),
  ]);

  const trips: PlanningTrip[] = (tripsRes.data ?? []).map((t: any) => {
    const students: PortalStudent[] = (t.portal_students ?? []).map((s: any) => ({
      id: s.id,
      fullName: s.full_name,
      dateOfBirth: s.date_of_birth,
      yearGroup: s.year_group,
      nationality: s.nationality,
      passportNumber: s.passport_number,
      passportExpiry: s.passport_expiry,
      passportFile: s.passport_file,
      consentFile: s.consent_file,
      dietary: s.dietary,
      medical: s.medical,
      emergencyContactName: s.emergency_contact_name,
      emergencyContactPhone: s.emergency_contact_phone,
      roomGroup: s.room_group,
      notes: s.notes,
    }));
    const outstanding = students.reduce((n, s) => n + missingFor(s).length, 0);
    return {
      id: t.id,
      title: t.title,
      schoolName: t.school_name,
      travelDates: t.travel_dates,
      departureDate: t.departure_date,
      paperworkDue: t.paperwork_due,
      status: t.status,
      dataPurgedAt: t.data_purged_at,
      teacherIds: (t.portal_trip_teachers ?? []).map((x: any) => x.teacher_id),
      studentCount: students.length,
      completeCount: students.filter((s) => missingFor(s).length === 0).length,
      outstanding,
      withDietary: students.filter((s) => s.dietary).length,
      withMedical: students.filter((s) => s.medical).length,
      gaps: (Object.keys(MISSING_LABELS) as (keyof typeof MISSING_LABELS)[])
        .map((k) => ({ label: MISSING_LABELS[k], count: students.filter((s) => missingFor(s).includes(k)).length }))
        .filter((g) => g.count > 0),
    };
  });

  const teacherOptions: TeacherOption[] = (teachers ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    schoolName: t.school_name,
  }));

  return (
    <PlanningManager
      trips={trips}
      teachers={teacherOptions}
      acceptedQuotes={(quotes ?? []).map((q: any) => ({
        id: q.id,
        ref: q.ref,
        title: q.title,
        schoolName: q.school_name,
        travelDates: q.travel_dates,
        teacherEmail: q.teacher_email,
      }))}
    />
  );
}
