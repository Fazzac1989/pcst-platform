import { createClient } from '@/lib/supabase/server';
import TeachersManager, { type TeacherRow } from './TeachersManager';

export const dynamic = 'force-dynamic';

export default async function AdminTeachersPage() {
  const db = createClient();
  const { data, error } = await db
    .from('portal_teachers')
    .select('id, name, email, school_name, status, invited_at, accepted_at, last_seen_at')
    .order('name');

  if (error) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl mb-4">Teacher portal</h1>
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          The teacher portal is unavailable until the{' '}
          <code>20260815000000_teacher_portal.sql</code> migration has been run in the Supabase SQL
          editor.
        </p>
      </div>
    );
  }

  // How many open quotes each teacher can see, matched on the quote's email.
  const { data: quotes } = await db.from('quotes').select('teacher_email, status');
  const counts = new Map<string, number>();
  for (const q of quotes ?? []) {
    const email = (q.teacher_email ?? '').toLowerCase();
    if (!email || !['published', 'accepted'].includes(q.status)) continue;
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }

  const rows: TeacherRow[] = (data ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    schoolName: t.school_name,
    status: t.status,
    invitedAt: t.invited_at,
    acceptedAt: t.accepted_at,
    lastSeenAt: t.last_seen_at,
    quoteCount: counts.get(t.email.toLowerCase()) ?? 0,
  }));

  return <TeachersManager rows={rows} />;
}
