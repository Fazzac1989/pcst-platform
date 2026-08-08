import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type QuoteLine = {
  description: string;
  qty: number;
  unitCost: number;
  markupPct: number;
};

export type QuoteDay = { label: string; title: string; description: string };

export type QuoteMessage = {
  id: number;
  sender: 'teacher' | 'admin';
  author: string | null;
  body: string;
  createdAt: string;
};

export type Quote = {
  id: number;
  ref: string;
  publicToken: string;
  title: string;
  status: string;
  tripId: number | null;
  schoolName: string | null;
  schoolLogo: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  travelDates: string | null;
  validity: string | null;
  pupils: number | null;
  staff: number | null;
  notes: string | null;
  currency: string;
  defaultMarkupPct: number;
  itinerary: QuoteDay[];
  images: string[];
  terms: string[];
  lines: QuoteLine[];
  messages: QuoteMessage[];
  publishedAt: string | null;
  updatedAt: string;
};

export const sellUnit = (l: QuoteLine) => l.unitCost * (1 + l.markupPct / 100);
export const lineTotal = (l: QuoteLine) => l.qty * sellUnit(l);
export const quoteTotal = (lines: QuoteLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const perStudent = (lines: QuoteLine[], pupils: number | null) =>
  pupils && pupils > 0 ? quoteTotal(lines) / pupils : null;

export const formatMoney = (currency: string, n: number) =>
  `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function mapQuote(row: any): Quote {
  return {
    id: row.id,
    ref: row.ref,
    publicToken: row.public_token,
    title: row.title,
    status: row.status,
    tripId: row.trip_id,
    schoolName: row.school_name,
    schoolLogo: row.school_logo,
    teacherName: row.teacher_name,
    teacherEmail: row.teacher_email,
    travelDates: row.travel_dates,
    validity: row.validity,
    pupils: row.pupils,
    staff: row.staff,
    notes: row.notes,
    currency: row.currency ?? 'AED',
    defaultMarkupPct: Number(row.default_markup_pct ?? 0),
    itinerary: row.itinerary ?? [],
    images: row.images ?? [],
    terms: row.terms ?? [],
    lines: (row.quote_lines ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((l: any) => ({
        description: l.description,
        qty: l.qty,
        unitCost: Number(l.unit_cost ?? 0),
        markupPct: Number(l.markup_pct ?? 0),
      })),
    messages: (row.quote_messages ?? [])
      .sort((a: any, b: any) => a.id - b.id)
      .map((m: any) => ({
        id: m.id,
        sender: m.sender,
        author: m.author,
        body: m.body,
        createdAt: m.created_at,
      })),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export const QUOTE_SELECT =
  '*, quote_lines(description, qty, unit_cost, markup_pct, sort_order), quote_messages(id, sender, author, body, created_at)';

/** Public access: token knowledge is the credential; published quotes only. */
export async function getQuoteByToken(token: string): Promise<Quote | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const db = createAdminClient();
  const { data, error } = await db
    .from('quotes')
    .select(QUOTE_SELECT)
    .eq('public_token', token)
    .in('status', ['published', 'accepted'])
    .maybeSingle();
  if (error || !data) return null;
  return mapQuote(data);
}
