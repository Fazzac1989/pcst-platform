'use server';

import { createClient } from '@/lib/supabase/server';
import { sendQuoteShareEmail } from '@/lib/email';
import { sellUnit, type QuoteDay, type QuoteLine } from '@/lib/quotes';
import type { ActionResult } from './actions';

export type QuotePayload = {
  id?: number;
  title: string;
  tripId: number | null;
  schoolName: string;
  schoolLogo: string | null;
  teacherName: string;
  teacherEmail: string;
  travelDates: string;
  validity: string | null;
  pupils: number | null;
  staff: number | null;
  notes: string;
  currency: string;
  defaultMarkupPct: number;
  itinerary: QuoteDay[];
  images: string[];
  terms: string[];
  lines: QuoteLine[];
  status: 'draft' | 'published';
};

export async function saveQuote(payload: QuotePayload): Promise<ActionResult & { token?: string }> {
  const db = createClient();
  const { id, lines, status, ...p } = payload;

  const fields = {
    title: p.title,
    trip_id: p.tripId,
    school_name: p.schoolName || null,
    school_logo: p.schoolLogo,
    teacher_name: p.teacherName || null,
    teacher_email: p.teacherEmail || null,
    travel_dates: p.travelDates || null,
    validity: p.validity || null,
    pupils: p.pupils,
    staff: p.staff,
    notes: p.notes || null,
    currency: p.currency || 'AED',
    default_markup_pct: p.defaultMarkupPct,
    itinerary: p.itinerary,
    images: p.images,
    terms: p.terms,
    status,
    ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
  };

  let quoteId = id;
  if (quoteId) {
    const { error } = await db.from('quotes').update(fields).eq('id', quoteId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await db
      .from('quotes')
      .insert({ ...fields, ref: `QUO-${Date.now().toString(36).toUpperCase()}` })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };
    quoteId = data.id;
    const { error: refErr } = await db
      .from('quotes')
      .update({ ref: `QUO-${1000 + quoteId!}` })
      .eq('id', quoteId);
    if (refErr) return { ok: false, error: refErr.message };
  }

  const { error: delErr } = await db.from('quote_lines').delete().eq('quote_id', quoteId);
  if (delErr) return { ok: false, error: delErr.message };
  if (lines.length) {
    const { error: lineErr } = await db.from('quote_lines').insert(
      lines.map((l, i) => ({
        quote_id: quoteId,
        sort_order: i + 1,
        description: l.description,
        qty: l.qty,
        unit_cost: l.unitCost,
        markup_pct: l.markupPct,
        unit_price: Math.round(sellUnit(l) * 100) / 100,
      }))
    );
    if (lineErr) return { ok: false, error: lineErr.message };
  }

  const { data: q } = await db.from('quotes').select('public_token').eq('id', quoteId).single();
  return { ok: true, id: quoteId, token: q?.public_token };
}

export async function deleteQuote(id: number): Promise<ActionResult> {
  const db = createClient();
  const { error } = await db.from('quotes').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addAdminQuoteMessage(quoteId: number, body: string): Promise<ActionResult> {
  const db = createClient();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty.' };
  const { error } = await db
    .from('quote_messages')
    .insert({ quote_id: quoteId, sender: 'admin', author: 'Premium Choice School Trips', body: trimmed });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function shareQuoteByEmail(quoteId: number, teacherEmail: string): Promise<ActionResult> {
  const email = teacherEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };
  const db = createClient();
  const { data: quote, error } = await db
    .from('quotes')
    .select('id, ref, title, status, public_token, teacher_name, school_name')
    .eq('id', quoteId)
    .maybeSingle();
  if (error || !quote) return { ok: false, error: error?.message ?? 'Quote not found.' };
  if (quote.status !== 'published') return { ok: false, error: 'Publish the quote before sharing it.' };

  await db.from('quotes').update({ teacher_email: email }).eq('id', quoteId);

  const sent = await sendQuoteShareEmail({
    to: email,
    teacherName: quote.teacher_name,
    schoolName: quote.school_name,
    quoteTitle: quote.title,
    ref: quote.ref,
    link: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/quotes/${quote.public_token}`,
  });
  if (!sent) return { ok: false, error: 'Email service not configured (RESEND_API_KEY) — the link still works, copy it manually.' };
  return { ok: true };
}

/** Prefill helper for the editor: pull a trip's itinerary + hero. */
export async function loadTripForQuote(tripId: number): Promise<
  | { ok: true; title: string; heroImage: string | null; itinerary: QuoteDay[] }
  | { ok: false; error: string }
> {
  const db = createClient();
  const { data, error } = await db
    .from('trips')
    .select('title, hero_image, itinerary_days(label, title, description, sort_order)')
    .eq('id', tripId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? 'Trip not found' };
  return {
    ok: true,
    title: data.title,
    heroImage: data.hero_image,
    itinerary: (data.itinerary_days ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((d: any) => ({ label: d.label ?? '', title: d.title ?? '', description: d.description })),
  };
}
