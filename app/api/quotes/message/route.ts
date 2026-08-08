import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const token = String(body.token ?? '');
  const author = String(body.author ?? '').trim().slice(0, 120);
  const text = String(body.body ?? '').trim().slice(0, 4000);
  if (!/^[0-9a-f-]{36}$/i.test(token) || !text) {
    return NextResponse.json({ ok: false, error: 'Invalid message.' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: quote } = await db
    .from('quotes')
    .select('id, status')
    .eq('public_token', token)
    .in('status', ['published', 'accepted'])
    .maybeSingle();
  if (!quote) return NextResponse.json({ ok: false, error: 'Quote not found.' }, { status: 404 });

  const { error } = await db
    .from('quote_messages')
    .insert({ quote_id: quote.id, sender: 'teacher', author: author || null, body: text });
  if (error) {
    console.error('[quote message]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not save your message.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
