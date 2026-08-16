'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './actions';

async function requireAdmin(): Promise<string | null> {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return 'Signed out — please log in again.';
  const { data } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' ? null : 'Admin access required.';
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Invite a teacher. Creates the account and returns a single-use link for the
 * admin to send — no email service is required. The link sets their password.
 */
export async function inviteTeacher(input: {
  name: string;
  email: string;
  schoolName: string;
}): Promise<ActionResult & { link?: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const schoolName = input.schoolName.trim();
  if (!name || !schoolName) return { ok: false, error: 'Name and school are both required.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'That email looks wrong.' };

  const db = createAdminClient();

  const { data: existing } = await db
    .from('portal_teachers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) return { ok: false, error: 'That teacher has already been invited.' };

  // generateLink creates the auth user and hands back a token we build a URL
  // from, so the admin can send it however they like.
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'invite',
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { ok: false, error: linkError?.message ?? 'Could not create the invite.' };
  }

  const { error } = await db.from('portal_teachers').insert({
    email,
    name,
    school_name: schoolName,
    user_id: linkData.user?.id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/teachers');
  return {
    ok: true,
    link: `${siteUrl()}/portal/confirm?token_hash=${linkData.properties.hashed_token}&type=invite`,
  };
}

/** Fresh link for a teacher who lost theirs or needs a password reset. */
export async function resendTeacherInvite(id: number): Promise<ActionResult & { link?: string }> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { data: teacher } = await db
    .from('portal_teachers')
    .select('email, status')
    .eq('id', id)
    .maybeSingle();
  if (!teacher) return { ok: false, error: 'Teacher not found.' };

  // An accepted account needs a recovery link; a pending one needs the invite.
  const { data, error } = await db.auth.admin.generateLink({
    type: teacher.status === 'active' ? 'recovery' : 'invite',
    email: teacher.email,
  });
  if (error || !data?.properties?.hashed_token) {
    return { ok: false, error: error?.message ?? 'Could not create the link.' };
  }

  const type = teacher.status === 'active' ? 'recovery' : 'invite';
  return { ok: true, link: `${siteUrl()}/portal/confirm?token_hash=${data.properties.hashed_token}&type=${type}` };
}

export async function setTeacherStatus(id: number, status: 'active' | 'disabled'): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { error } = await db.from('portal_teachers').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/teachers');
  return { ok: true };
}

export async function deleteTeacher(id: number): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const db = createAdminClient();
  const { data: teacher } = await db
    .from('portal_teachers')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await db.from('portal_teachers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  // Remove the login too, so the address can be re-invited cleanly.
  if (teacher?.user_id) await db.auth.admin.deleteUser(teacher.user_id).catch(() => {});

  revalidatePath('/admin/teachers');
  return { ok: true };
}
