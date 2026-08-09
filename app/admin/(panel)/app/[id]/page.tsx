import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TripManager from './TripManager';

export const dynamic = 'force-dynamic';

export default async function AdminAppTripPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const db = createClient();
  const [{ data: trip }, { data: members }, { data: docs }, { data: msgs }, { data: posts }, { data: highlights }, { data: schedule }] =
    await Promise.all([
      db.from('app_trips').select('*').eq('id', id).maybeSingle(),
      db.from('app_members').select('id, role, name, login_code, parent_of').eq('app_trip_id', id).order('role').order('name'),
      db.from('app_documents').select('id, kind, title, file_url, scope, member_id').eq('app_trip_id', id).order('kind'),
      db.from('app_messages').select('id, channel, student_id, sender_member_id, body, created_at').eq('app_trip_id', id).order('created_at'),
      db.from('app_posts').select('id, member_id, image_url, caption, created_at').eq('app_trip_id', id).order('created_at', { ascending: false }).limit(50),
      db.from('app_highlights').select('id, date, caption, image_url, sort_order').eq('app_trip_id', id).order('date').order('sort_order'),
      db.from('app_schedule_items').select('*').eq('app_trip_id', id).order('date').order('start_time'),
    ]);
  if (!trip) notFound();

  return (
    <TripManager
      trip={{
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        status: trip.status,
        contacts: trip.contacts ?? [],
        confirmations: trip.confirmations ?? [],
      }}
      members={(members ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        name: m.name,
        loginCode: m.login_code,
        parentOf: m.parent_of,
      }))}
      documents={(docs ?? []).map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        fileUrl: d.file_url,
        scope: d.scope,
        memberId: d.member_id,
      }))}
      pctMessages={(msgs ?? [])
        .filter((m) => m.channel === 'pct')
        .map((m) => ({
          id: m.id,
          fromTeam: m.sender_member_id === null,
          senderName:
            m.sender_member_id === null
              ? 'PCT Team'
              : (members ?? []).find((x) => x.id === m.sender_member_id)?.name ?? 'Teacher',
          body: m.body,
          createdAt: m.created_at,
        }))}
      posts={(posts ?? []).map((p) => ({
        id: p.id,
        memberName: (members ?? []).find((x) => x.id === p.member_id)?.name ?? '—',
        imageUrl: p.image_url,
        caption: p.caption,
        createdAt: p.created_at,
      }))}
      highlights={(highlights ?? []).map((h) => ({
        id: h.id,
        date: h.date,
        caption: h.caption,
        imageUrl: h.image_url,
        sortOrder: h.sort_order,
      }))}
      schedule={(schedule ?? []).map((s) => ({
        id: s.id,
        date: s.date,
        startTime: String(s.start_time).slice(0, 5),
        title: s.title,
        description: s.description,
        meetingPlace: s.meeting_place,
        meetingTime: s.meeting_time ? String(s.meeting_time).slice(0, 5) : null,
        educationalContent: s.educational_content,
      }))}
    />
  );
}
