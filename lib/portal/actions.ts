'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getPortalTeacher } from './session';

export type PortalResult = { ok: true } | { ok: false; error: string };

export async function portalSignIn(formData: FormData): Promise<PortalResult | void> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { ok: false, error: 'Enter your email and password.' };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Those details were not recognised.' };

  // Only invited teachers may use the portal.
  const db = createAdminClient();
  const { data } = await db
    .from('portal_teachers')
    .select('status')
    .eq('email', email)
    .maybeSingle();
  if (!data || data.status === 'disabled') {
    await supabase.auth.signOut();
    return { ok: false, error: 'This account does not have portal access.' };
  }

  redirect('/portal');
}

export async function portalSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/portal/login');
}

/** Set or reset the password for the signed-in teacher. */
export async function portalSetPassword(formData: FormData): Promise<PortalResult | void> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 10) return { ok: false, error: 'Use at least 10 characters.' };
  if (password !== confirm) return { ok: false, error: 'The two passwords do not match.' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your invite link has expired — ask us for a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  redirect('/portal');
}

/** Teacher accepts a quote. Notifies the team; nothing is charged or invoiced. */
export async function acceptQuote(quoteId: number): Promise<PortalResult> {
  const teacher = await getPortalTeacher();
  if (!teacher) return { ok: false, error: 'Signed out — please log in again.' };

  const db = createAdminClient();
  const { data: quote } = await db
    .from('quotes')
    .select('id, ref, title, teacher_email, status')
    .eq('id', quoteId)
    .maybeSingle();

  // The quote must belong to this teacher and still be open.
  if (!quote || (quote.teacher_email ?? '').toLowerCase() !== teacher.email.toLowerCase()) {
    return { ok: false, error: 'That quote is not available on your account.' };
  }
  if (quote.status === 'accepted') return { ok: true };
  if (quote.status !== 'published') {
    return { ok: false, error: 'That quote is no longer open for acceptance.' };
  }

  const { error } = await db
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (error) return { ok: false, error: error.message };

  const { sendQuoteAcceptedNotification } = await import('@/lib/email');
  await sendQuoteAcceptedNotification({
    ref: quote.ref,
    quoteTitle: quote.title,
    teacherName: teacher.name,
    schoolName: teacher.schoolName,
    teacherEmail: teacher.email,
  });

  revalidatePath('/portal');
  revalidatePath('/admin/quotes');
  return { ok: true };
}
