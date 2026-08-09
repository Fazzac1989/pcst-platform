import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AppMember } from './session';

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
