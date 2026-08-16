import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PortalStudent, PortalTrip } from './student-fields';

export const DOCS_BUCKET = 'portal-docs';

// Shapes and completeness helpers live in student-fields so client components
// can use them too; re-exported here for server callers' convenience.
export {
  MISSING_LABELS,
  missingFor,
  passportExpiringSoon,
  type MissingKey,
  type PortalStudent,
  type PortalTrip,
} from './student-fields';

const mapStudent = (r: any): PortalStudent => ({
  id: r.id,
  fullName: r.full_name,
  dateOfBirth: r.date_of_birth,
  yearGroup: r.year_group,
  nationality: r.nationality,
  passportNumber: r.passport_number,
  passportExpiry: r.passport_expiry,
  passportFile: r.passport_file,
  consentFile: r.consent_file,
  dietary: r.dietary,
  medical: r.medical,
  emergencyContactName: r.emergency_contact_name,
  emergencyContactPhone: r.emergency_contact_phone,
  roomGroup: r.room_group,
  notes: r.notes,
});

const mapTrip = (r: any): PortalTrip => ({
  id: r.id,
  quoteId: r.quote_id,
  title: r.title,
  schoolName: r.school_name,
  travelDates: r.travel_dates,
  departureDate: r.departure_date,
  paperworkDue: r.paperwork_due,
  status: r.status,
  notes: r.notes,
  dataPurgedAt: r.data_purged_at,
});

/** Trips this teacher has been given access to. */
export async function tripsForTeacher(teacherId: number): Promise<PortalTrip[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('portal_trip_teachers')
    .select('portal_trips(*)')
    .eq('teacher_id', teacherId);
  return (data ?? [])
    .map((r: any) => r.portal_trips)
    .filter(Boolean)
    .map(mapTrip)
    .sort((a, b) => (a.departureDate ?? '').localeCompare(b.departureDate ?? ''));
}

/** A trip, but only if this teacher is on it. Returns null otherwise. */
export async function tripForTeacher(tripId: number, teacherId: number): Promise<PortalTrip | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('portal_trip_teachers')
    .select('portal_trips(*)')
    .eq('teacher_id', teacherId)
    .eq('portal_trip_id', tripId)
    .maybeSingle();
  return data?.portal_trips ? mapTrip(data.portal_trips) : null;
}

export async function studentsForTrip(tripId: number): Promise<PortalStudent[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('portal_students')
    .select('*')
    .eq('portal_trip_id', tripId)
    .order('full_name');
  return (data ?? []).map(mapStudent);
}

/** Short-lived signed URL for a private document. */
export async function signDocument(path: string, seconds = 120): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.storage.from(DOCS_BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
