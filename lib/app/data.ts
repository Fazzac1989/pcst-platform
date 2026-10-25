import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppMember } from './session';
import type { Challenge, ChallengeAnswer, ChecklistItem, ChecklistTick } from './learning';
import type { RoomingStudent } from './accommodation';

export type AppPost = {
  id: number;
  memberId: number;
  memberName: string;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string;
};

export type AppDocument = {
  id: number;
  kind: string;
  title: string;
  fileUrl: string;
  memberId: number | null;
  memberName: string | null;
};

export type AppMessage = {
  id: number;
  senderName: string;
  fromSelf: boolean;
  body: string;
  createdAt: string;
};

export type Roster = { id: number; role: string; name: string; loginCode: string; parentOf: number | null };

export async function getTripPosts(tripId: number): Promise<AppPost[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_posts')
    .select('id, member_id, image_url, caption, created_at, app_members(name)')
    .eq('app_trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    memberId: p.member_id,
    memberName: p.app_members?.name ?? 'Unknown',
    imageUrl: p.image_url,
    caption: p.caption,
    createdAt: p.created_at,
  }));
}

/** Documents visible to this member, by role. */
export async function getMemberDocuments(member: AppMember): Promise<AppDocument[]> {
  const db = createAdminClient();
  let query = db
    .from('app_documents')
    .select('id, kind, title, file_url, member_id, app_members(name)')
    .eq('app_trip_id', member.tripId)
    .order('kind')
    .order('title');

  if (member.role === 'student') {
    query = query.eq('scope', 'all').or(`member_id.is.null,member_id.eq.${member.id}`);
  } else if (member.role === 'parent') {
    const child = member.parentOf ?? -1;
    query = query.eq('scope', 'all').or(`member_id.is.null,member_id.eq.${child}`);
  }
  // teachers see everything, including teacher-scoped docs and every e-ticket

  const { data } = await query;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    fileUrl: d.file_url,
    memberId: d.member_id,
    memberName: d.app_members?.name ?? null,
  }));
}

/** The message channel this member participates in. */
export async function getMemberMessages(member: AppMember): Promise<AppMessage[]> {
  const db = createAdminClient();
  // app_messages has two FKs to app_members — disambiguate the sender join.
  let query = db
    .from('app_messages')
    .select('id, sender_member_id, body, created_at, sender:app_members!app_messages_sender_member_id_fkey(name)')
    .eq('app_trip_id', member.tripId)
    .order('created_at')
    .limit(200);

  if (member.role === 'teacher') {
    query = query.eq('channel', 'pct');
  } else if (member.role === 'student') {
    query = query.eq('channel', 'family').eq('student_id', member.id);
  } else {
    query = query.eq('channel', 'family').eq('student_id', member.parentOf ?? -1);
  }

  const { data } = await query;
  return (data ?? []).map((m: any) => ({
    id: m.id,
    senderName: m.sender_member_id === null ? 'PCT Team' : (m.sender?.name ?? 'Member'),
    fromSelf: m.sender_member_id === member.id,
    body: m.body,
    createdAt: m.created_at,
  }));
}

export type Highlight = { id: number; date: string; caption: string; imageUrl: string | null };

export type ScheduleItem = {
  id: number;
  date: string;
  startTime: string; // "HH:MM"
  title: string;
  description: string;
  meetingPlace: string | null;
  meetingTime: string | null;
  educationalContent: string | null;
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** Highlights for a given date; falls back to the next date that has any. */
export async function getHighlights(tripId: number, isoDate: string): Promise<{ date: string; items: Highlight[] }> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_highlights')
    .select('id, date, caption, image_url, sort_order')
    .eq('app_trip_id', tripId)
    .gte('date', isoDate)
    .order('date')
    .order('sort_order')
    .limit(30);
  const rows = data ?? [];
  if (!rows.length) return { date: isoDate, items: [] };
  const firstDate = rows[0].date;
  return {
    date: firstDate,
    items: rows
      .filter((r) => r.date === firstDate)
      .map((r) => ({ id: r.id, date: r.date, caption: r.caption, imageUrl: r.image_url })),
  };
}

export async function getSchedule(tripId: number): Promise<ScheduleItem[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_schedule_items')
    .select('*')
    .eq('app_trip_id', tripId)
    .order('date')
    .order('start_time');
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    startTime: hhmm(r.start_time)!,
    title: r.title,
    description: r.description,
    meetingPlace: r.meeting_place,
    meetingTime: hhmm(r.meeting_time),
    educationalContent: r.educational_content,
  }));
}

export type Broadcast = { id: number; senderName: string; body: string; createdAt: string };

export async function getBroadcasts(tripId: number): Promise<Broadcast[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_messages')
    .select('id, body, created_at, sender:app_members!app_messages_sender_member_id_fkey(name)')
    .eq('app_trip_id', tripId)
    .eq('channel', 'broadcast')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((m: any) => ({
    id: m.id,
    senderName: m.sender?.name ?? 'Trip leader',
    body: m.body,
    createdAt: m.created_at,
  }));
}

export async function getTripRoster(tripId: number): Promise<Roster[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_members')
    .select('id, role, name, login_code, parent_of')
    .eq('app_trip_id', tripId)
    .order('role')
    .order('name');
  return (data ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    name: m.name,
    loginCode: m.login_code,
    parentOf: m.parent_of,
  }));
}

// ─── Learning challenges ──────────────────────────────────────────────

export async function getChallenges(tripId: number): Promise<Challenge[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_challenges')
    .select('id, date, title, fact, question, options, answer, points, sort_order')
    .eq('app_trip_id', tripId)
    .order('date', { nullsFirst: true })
    .order('sort_order')
    .order('id');
  return (data ?? []).map((c: any) => ({
    id: c.id,
    date: c.date,
    title: c.title,
    fact: c.fact ?? '',
    question: c.question,
    options: Array.isArray(c.options) ? c.options.map(String) : [],
    answer: c.answer,
    points: c.points,
    sortOrder: c.sort_order,
  }));
}

/** Every answer given on this trip's challenges. */
export async function getChallengeAnswers(challengeIds: number[]): Promise<ChallengeAnswer[]> {
  if (!challengeIds.length) return [];
  const db = createAdminClient();
  const { data } = await db
    .from('app_challenge_answers')
    .select('challenge_id, member_id, choice, correct, points, answered_at')
    .in('challenge_id', challengeIds);
  return (data ?? []).map((a: any) => ({
    challengeId: a.challenge_id,
    memberId: a.member_id,
    choice: a.choice,
    correct: a.correct,
    points: a.points,
    answeredAt: a.answered_at,
  }));
}

// ─── Pre-arrival checklist ────────────────────────────────────────────

export async function getChecklist(tripId: number): Promise<ChecklistItem[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('app_checklist_items')
    .select('id, title, detail, due_date, sort_order')
    .eq('app_trip_id', tripId)
    .order('sort_order')
    .order('id');
  return (data ?? []).map((i: any) => ({ id: i.id, title: i.title, detail: i.detail ?? '', dueDate: i.due_date, sortOrder: i.sort_order }));
}

export async function getChecklistTicks(itemIds: number[]): Promise<ChecklistTick[]> {
  if (!itemIds.length) return [];
  const db = createAdminClient();
  const { data } = await db.from('app_checklist_ticks').select('item_id, student_id, ticked_at').in('item_id', itemIds);
  return (data ?? []).map((t: any) => ({ itemId: t.item_id, studentId: t.student_id, tickedAt: t.ticked_at }));
}

// ─── Accommodation ────────────────────────────────────────────────────

/**
 * The rooming list for an app trip, from the teacher portal's planning
 * workspace on the same booking. Empty when there isn't one.
 */
export async function getRooming(tripId: number): Promise<RoomingStudent[]> {
  const db = createAdminClient();
  const { data: booking, error } = await db
    .from('bookings')
    .select('portal_trip_id')
    .eq('app_trip_id', tripId)
    .not('portal_trip_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (error || !booking?.portal_trip_id) return [];
  const { data } = await db.from('portal_students').select('id, full_name, room_group').eq('portal_trip_id', booking.portal_trip_id);
  return (data ?? []).map((s: any) => ({ id: s.id, fullName: s.full_name, room: s.room_group }));
}

/** Which portal student an app member is, if linked. */
export async function getPortalStudentId(memberId: number): Promise<number | null> {
  const db = createAdminClient();
  const { data } = await db.from('app_members').select('portal_student_id').eq('id', memberId).maybeSingle();
  return data?.portal_student_id ?? null;
}
