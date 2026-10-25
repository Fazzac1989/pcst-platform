'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { makeAppCode } from '@/lib/app/codes';
import { emailConfigured, sendChecklistEmail } from '@/lib/email';
import { getPortalTeacher } from './session';
import { tripForTeacher } from './planning';
import { appTripForWorkspace } from './checklist';
import { looksLikeEmail } from './student-fields';

const nameKey = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Paste "Student name, parent email" (or "Student name, parent name, email")
 * lines to fill in many parents at once. Names are matched to the students
 * already on the trip.
 */
export async function addParentEmailsBulk(
  tripId: number,
  textBlock: string
): Promise<{ ok: true; matched: number; unmatched: string[] } | { ok: false; error: string }> {
  const teacher = await getPortalTeacher();
  if (!teacher) return { ok: false, error: 'Signed out — please log in again.' };
  const trip = await tripForTeacher(tripId, teacher.id);
  if (!trip || trip.dataPurgedAt) return { ok: false, error: 'That trip is not on your account.' };

  const db = createAdminClient();
  const { data: students } = await db.from('portal_students').select('id, full_name').eq('portal_trip_id', tripId);
  const byName = new Map((students ?? []).map((s: any) => [nameKey(s.full_name), s.id as number]));

  let matched = 0;
  const unmatched: string[] = [];
  for (const raw of textBlock.split(/\r?\n/).slice(0, 300)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[,\t;]/).map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => looksLikeEmail(p));
    const name = parts[0];
    if (!email || !name || name === email) {
      unmatched.push(line);
      continue;
    }
    const parentName = parts.length >= 3 ? parts.find((p, i) => i > 0 && p !== email) ?? null : null;
    const id = byName.get(nameKey(name));
    if (!id) {
      unmatched.push(line);
      continue;
    }
    const patch: Record<string, string> = { parent_email: email.toLowerCase() };
    if (parentName) patch.parent_name = parentName;
    const { error } = await db.from('portal_students').update(patch).eq('id', id).eq('portal_trip_id', tripId);
    if (error) return { ok: false, error: error.message };
    matched++;
  }
  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true, matched, unmatched };
}

/**
 * Email each parent the pre-arrival checklist with a link that signs them in
 * to the travel app. Students and parents who aren't in the app yet are given
 * their own codes on the way. Parents already sent it are skipped unless
 * `again` is set.
 */
export async function emailChecklistToParents(
  tripId: number,
  again = false
): Promise<{ ok: true; sent: number; skipped: number; failed: number } | { ok: false; error: string }> {
  const teacher = await getPortalTeacher();
  if (!teacher) return { ok: false, error: 'Signed out — please log in again.' };
  const trip = await tripForTeacher(tripId, teacher.id);
  if (!trip || trip.dataPurgedAt) return { ok: false, error: 'That trip is not on your account.' };
  if (!emailConfigured()) return { ok: false, error: 'Email isn’t switched on for the portal yet — please let your PCT contact know.' };

  const appTripId = await appTripForWorkspace(tripId);
  if (!appTripId) return { ok: false, error: 'The travel app isn’t set up for this trip yet — your PCT contact does this.' };

  const db = createAdminClient();
  const [{ data: appTrip }, { data: items }, { data: students }, { data: members }] = await Promise.all([
    db.from('app_trips').select('title, destination, start_date, end_date, status').eq('id', appTripId).single(),
    db.from('app_checklist_items').select('title, detail, due_date').eq('app_trip_id', appTripId).order('sort_order').order('id'),
    db.from('portal_students').select('id, full_name, parent_name, parent_email').eq('portal_trip_id', tripId).order('full_name'),
    db.from('app_members').select('id, role, name, login_code, parent_of, portal_student_id, checklist_sent_at').eq('app_trip_id', appTripId),
  ]);
  if (!appTrip || appTrip.status !== 'active') return { ok: false, error: 'The travel app for this trip is switched off.' };
  if (!items?.length) return { ok: false, error: 'Your PCT team hasn’t added the checklist for this trip yet.' };

  const roster = [...(members ?? [])];
  const prefix = roster[0]?.login_code?.split('-')[0] ?? appTrip.title;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const dates =
    appTrip.start_date && appTrip.end_date
      ? `${new Date(appTrip.start_date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – ${new Date(appTrip.end_date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : null;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const s of (students ?? []).filter((x: any) => looksLikeEmail(x.parent_email))) {
    // The student in the app: already linked, or the one with the same name, or a new one.
    let student: any =
      roster.find((m) => m.role === 'student' && m.portal_student_id === s.id) ??
      roster.find((m) => m.role === 'student' && !m.portal_student_id && nameKey(m.name) === nameKey(s.full_name));
    if (!student) {
      const { data, error } = await db
        .from('app_members')
        .insert({ app_trip_id: appTripId, role: 'student', name: s.full_name, login_code: makeAppCode(prefix, 'student'), portal_student_id: s.id })
        .select('id, role, name, login_code, parent_of, portal_student_id, checklist_sent_at')
        .single();
      if (error) return { ok: false, error: error.message };
      student = data;
      roster.push(data);
    } else if (student.portal_student_id !== s.id) {
      await db.from('app_members').update({ portal_student_id: s.id }).eq('id', student.id);
      student.portal_student_id = s.id;
    }

    const parentName = s.parent_name?.trim() || null;
    let parent: any = roster.find((m) => m.role === 'parent' && m.parent_of === student.id);
    if (!parent) {
      const { data, error } = await db
        .from('app_members')
        .insert({
          app_trip_id: appTripId,
          role: 'parent',
          name: parentName ?? `Parent of ${s.full_name}`,
          login_code: makeAppCode(prefix, 'parent'),
          parent_of: student.id,
          email: s.parent_email,
        })
        .select('id, role, name, login_code, parent_of, portal_student_id, checklist_sent_at')
        .single();
      if (error) return { ok: false, error: error.message };
      parent = data;
      roster.push(data);
    } else {
      await db
        .from('app_members')
        .update({ email: s.parent_email, ...(parentName ? { name: parentName } : {}) })
        .eq('id', parent.id);
    }

    if (parent.checklist_sent_at && !again) {
      skipped++;
      continue;
    }
    const ok = await sendChecklistEmail({
      to: s.parent_email,
      parentName,
      studentName: s.full_name,
      tripTitle: appTrip.title,
      schoolName: trip.schoolName,
      dates,
      items: items.map((i: any) => ({ title: i.title, detail: i.detail ?? '', dueDate: i.due_date })),
      link: `${site}/app/open?code=${encodeURIComponent(parent.login_code)}&to=checklist`,
      code: parent.login_code,
      appUrl: `${site}/app`,
    });
    if (ok) {
      sent++;
      await db.from('app_members').update({ checklist_sent_at: new Date().toISOString() }).eq('id', parent.id);
    } else failed++;
  }

  revalidatePath(`/portal/trips/${tripId}`);
  return { ok: true, sent, skipped, failed };
}
