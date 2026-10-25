import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { nameKey } from './accommodation';

export type StudentEssentials = {
  memberId: number;
  name: string;
  loginCode: string;
  photoUrl: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  yearGroup: string | null;
  dietary: string | null;
  medical: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  room: string | null;
  parentName: string | null;
  /** False when nobody has filled them in on the teacher portal yet. */
  hasDetails: boolean;
};

export type RegisterMark = { date: string; studentId: number; status: 'present' | 'absent' };

/**
 * Each student on the app trip with the essentials the trip leader needs on
 * the ground, from their record in the teacher portal. Photos live in a
 * private bucket, so each is opened with a link that lasts a few hours.
 * Teachers only: the caller must have checked the role.
 */
export async function getStudentEssentials(tripId: number): Promise<StudentEssentials[]> {
  const db = createAdminClient();
  const [{ data: members }, { data: booking }] = await Promise.all([
    db.from('app_members').select('id, name, login_code, portal_student_id').eq('app_trip_id', tripId).eq('role', 'student').order('name'),
    db.from('bookings').select('portal_trip_id').eq('app_trip_id', tripId).not('portal_trip_id', 'is', null).limit(1).maybeSingle(),
  ]);
  const { data: records } = booking?.portal_trip_id
    ? await db.from('portal_students').select('*').eq('portal_trip_id', booking.portal_trip_id)
    : { data: [] as any[] };
  const all = records ?? [];

  const matched = (members ?? []).map((m: any) => ({
    m,
    s: all.find((r: any) => r.id === m.portal_student_id) ?? all.find((r: any) => nameKey(r.full_name) === nameKey(m.name)) ?? null,
  }));

  const paths = matched.map(({ s }) => s?.photo_file).filter(Boolean) as string[];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from('portal-docs').createSignedUrls(paths, 6 * 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }

  return matched.map(({ m, s }) => ({
    memberId: m.id,
    name: m.name,
    loginCode: m.login_code,
    photoUrl: s?.photo_file ? signed.get(s.photo_file) ?? null : null,
    dateOfBirth: s?.date_of_birth ?? null,
    nationality: s?.nationality ?? null,
    yearGroup: s?.year_group ?? null,
    dietary: s?.dietary ?? null,
    medical: s?.medical ?? null,
    emergencyName: s?.emergency_contact_name ?? null,
    emergencyPhone: s?.emergency_contact_phone ?? null,
    room: s?.room_group ?? null,
    parentName: s?.parent_name ?? null,
    hasDetails: Boolean(s),
  }));
}

export async function getRegisterMarks(tripId: number): Promise<RegisterMark[]> {
  const db = createAdminClient();
  const { data } = await db.from('app_register').select('date, student_id, status').eq('app_trip_id', tripId);
  return (data ?? []).map((r: any) => ({ date: String(r.date).slice(0, 10), studentId: r.student_id, status: r.status }));
}
