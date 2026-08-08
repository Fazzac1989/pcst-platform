import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { mapQuote, QUOTE_SELECT } from '@/lib/quotes';
import QuoteEditor, { type EditorQuote } from '../QuoteEditor';

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const db = createClient();
  const [{ data: row }, { data: trips }, { data: terms }] = await Promise.all([
    db.from('quotes').select(QUOTE_SELECT).eq('id', id).maybeSingle(),
    db.from('trips').select('id, title').order('title'),
    db.from('booking_terms').select('text, sort_order').order('sort_order'),
  ]);
  if (!row) notFound();
  const q = mapQuote(row);

  const editorQuote: EditorQuote = {
    id: q.id,
    ref: q.ref,
    publicToken: q.publicToken,
    title: q.title,
    tripId: q.tripId,
    schoolName: q.schoolName ?? '',
    schoolLogo: q.schoolLogo,
    teacherName: q.teacherName ?? '',
    teacherEmail: q.teacherEmail ?? '',
    travelDates: q.travelDates ?? '',
    validity: q.validity,
    pupils: q.pupils,
    staff: q.staff,
    notes: q.notes ?? '',
    currency: q.currency,
    defaultMarkupPct: q.defaultMarkupPct,
    itinerary: q.itinerary,
    images: q.images,
    terms: q.terms.length ? q.terms : (terms ?? []).map((t) => t.text),
    lines: q.lines.length ? q.lines : [{ description: '', qty: 1, unitCost: 0, markupPct: q.defaultMarkupPct }],
    status: q.status === 'published' ? 'published' : 'draft',
    messages: q.messages.map((m) => ({ ...m, createdAt: m.createdAt })),
  };

  return <QuoteEditor quote={editorQuote} trips={trips ?? []} defaultTerms={(terms ?? []).map((t) => t.text)} />;
}
