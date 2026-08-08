'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './actions';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no confusable 0/O/1/I/L

function makeCode(prefix: string, role: 'teacher' | 'student' | 'parent'): string {
  const roleTag = { teacher: 'T', student: 'S', parent: 'P' }[role];
  let rand = '';
  for (let i = 0; i < 6; i++) rand += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${roleTag}-${rand}`;
}

export type PushToAppConfig = {
  quoteId: number;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  codePrefix: string;         // e.g. 'ICE24'
  teacherNames: string[];
  studentNames: string[];
  createParents: boolean;     // one parent login per student
};

export async function pushQuoteToApp(config: PushToAppConfig): Promise<ActionResult> {
  const db = createClient();

  const { data: quote, error: qErr } = await db
    .from('quotes')
    .select('id, title, itinerary, images')
    .eq('id', config.quoteId)
    .maybeSingle();
  if (qErr || !quote) return { ok: false, error: qErr?.message ?? 'Quote not found.' };

  const { data: existing } = await db
    .from('app_trips')
    .select('id')
    .eq('quote_id', config.quoteId)
    .maybeSingle();
  if (existing) return { ok: false, error: 'This quote is already pushed — manage it under App Trips.' };

  const prefix = config.codePrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'TRIP';

  const { data: trip, error } = await db
    .from('app_trips')
    .insert({
      quote_id: quote.id,
      title: quote.title,
      destination: config.destination.trim(),
      start_date: config.startDate,
      end_date: config.endDate,
      hero_image: (quote.images as string[])?.[0] ?? null,
      itinerary: quote.itinerary ?? [],
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  const members: any[] = [];
  for (const name of config.teacherNames.filter((n) => n.trim())) {
    members.push({ app_trip_id: trip.id, role: 'teacher', name: name.trim(), login_code: makeCode(prefix, 'teacher') });
  }
  for (const name of config.studentNames.filter((n) => n.trim())) {
    members.push({ app_trip_id: trip.id, role: 'student', name: name.trim(), login_code: makeCode(prefix, 'student') });
  }
  if (members.length) {
    const { data: inserted, error: mErr } = await db.from('app_members').insert(members).select('id, role, name');
    if (mErr) return { ok: false, error: mErr.message };

    if (config.createParents) {
      const parentRows = (inserted ?? [])
        .filter((m) => m.role === 'student')
        .map((s) => ({
          app_trip_id: trip.id,
          role: 'parent',
          name: `Parent of ${s.name}`,
          login_code: makeCode(prefix, 'parent'),
          parent_of: s.id,
        }));
      if (parentRows.length) {
        const { error: pErr } = await db.from('app_members').insert(parentRows);
        if (pErr) return { ok: false, error: pErr.message };
      }
    }
  }

  return { ok: true, id: trip.id };
}

export async function updateAppTrip(
  id: number,
  fields: {
    destination?: string;
    startDate?: string | null;
    endDate?: string | null;
    contacts?: { label: string; phone: string }[];
    confirmations?: { label: string; ref: string }[];
    status?: 'active' | 'archived';
  }
): Promise<ActionResult> {
  const db = createClient();
  const patch: any = {};
  if (fields.destination !== undefined) patch.destination = fields.destination;
  if (fields.startDate !== undefined) patch.start_date = fields.startDate;
  if (fields.endDate !== undefined) patch.end_date = fields.endDate;
  if (fields.contacts !== undefined) patch.contacts = fields.contacts;
  if (fields.confirmations !== undefined) patch.confirmations = fields.confirmations;
  if (fields.status !== undefined) patch.status = fields.status;
  const { error } = await db.from('app_trips').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addAppMember(
  tripId: number,
  role: 'teacher' | 'student' | 'parent',
  name: string,
  codePrefix: string,
  parentOf: number | null
): Promise<ActionResult> {
  const db = createClient();
  const prefix = codePrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'TRIP';
  const { error } = await db.from('app_members').insert({
    app_trip_id: tripId,
    role,
    name: name.trim(),
    login_code: makeCode(prefix, role),
    parent_of: parentOf,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAppMember(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('app_members').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addAppDocument(doc: {
  tripId: number;
  memberId: number | null;
  scope: 'all' | 'teacher';
  kind: string;
  title: string;
  fileUrl: string;
}): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('app_documents').insert({
    app_trip_id: doc.tripId,
    member_id: doc.memberId,
    scope: doc.scope,
    kind: doc.kind,
    title: doc.title.trim(),
    file_url: doc.fileUrl,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAppDocument(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('app_documents').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Reply to a teacher as the PCT team. */
export async function sendPctReply(tripId: number, body: string): Promise<ActionResult> {
  const db = createClient();
  const text = body.trim();
  if (!text) return { ok: false, error: 'Message is empty.' };
  const { error } = await db.from('app_messages').insert({
    app_trip_id: tripId,
    channel: 'pct',
    sender_member_id: null,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAppPost(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('app_posts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
