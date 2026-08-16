import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type PortalTeacher = {
  id: number;
  userId: string;
  email: string;
  name: string;
  schoolName: string;
  status: 'invited' | 'active' | 'disabled';
};

/**
 * The signed-in teacher, or null. Reads the Supabase Auth session from cookies,
 * then looks the teacher up with the service role — teachers have no direct
 * table access of their own.
 */
export const getPortalTeacher = cache(async function getPortalTeacher(): Promise<PortalTeacher | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const db = createAdminClient();
  const { data } = await db
    .from('portal_teachers')
    .select('id, user_id, email, name, school_name, status')
    .or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
    .maybeSingle();
  if (!data || data.status === 'disabled') return null;

  // First sign-in after an invite: bind the auth user to the teacher record.
  if (!data.user_id || data.status === 'invited') {
    await db
      .from('portal_teachers')
      .update({
        user_id: user.id,
        status: 'active',
        accepted_at: data.status === 'invited' ? new Date().toISOString() : undefined,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', data.id);
  } else {
    await db.from('portal_teachers').update({ last_seen_at: new Date().toISOString() }).eq('id', data.id);
  }

  return {
    id: data.id,
    userId: user.id,
    email: data.email,
    name: data.name,
    schoolName: data.school_name,
    status: 'active',
  };
});
