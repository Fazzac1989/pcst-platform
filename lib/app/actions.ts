'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_COOKIE, getAppSession } from './session';

export async function appLogin(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  if (code.length < 8) return { ok: false, error: 'Enter your full access code.' };

  const db = createAdminClient();
  const { data } = await db
    .from('app_members')
    .select('login_code, app_trips(status)')
    .eq('login_code', code)
    .maybeSingle();
  if (!data || (data.app_trips as any)?.status !== 'active') {
    return { ok: false, error: 'Code not recognised — check it and try again.' };
  }

  cookies().set(APP_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 90, // 90 days — covers the run-up and the trip
    path: '/',
  });
  redirect('/app/trip');
}

export async function appLogout() {
  cookies().delete(APP_COOKIE);
  redirect('/app');
}

export async function createAppPost(imageUrl: string | null, caption: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getAppSession();
  if (!session) return { ok: false, error: 'Signed out — please log in again.' };
  if (session.member.role !== 'student') return { ok: false, error: 'Only students can post.' };
  const text = caption.trim().slice(0, 500);
  if (!imageUrl && !text) return { ok: false, error: 'Add a photo or a caption.' };

  const db = createAdminClient();
  const { error } = await db.from('app_posts').insert({
    app_trip_id: session.member.tripId,
    member_id: session.member.id,
    image_url: imageUrl,
    caption: text || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/trip/photos');
  return { ok: true };
}

export async function sendAppMessage(body: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getAppSession();
  if (!session) return { ok: false, error: 'Signed out — please log in again.' };
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: 'Message is empty.' };

  const m = session.member;
  const channel = m.role === 'teacher' ? 'pct' : 'family';
  const studentId = m.role === 'teacher' ? null : m.role === 'student' ? m.id : m.parentOf;
  if (channel === 'family' && !studentId) {
    return { ok: false, error: 'No linked student on this account — ask your trip organiser.' };
  }

  const db = createAdminClient();
  const { error } = await db.from('app_messages').insert({
    app_trip_id: m.tripId,
    channel,
    student_id: studentId,
    sender_member_id: m.id,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/trip/messages');
  return { ok: true };
}
