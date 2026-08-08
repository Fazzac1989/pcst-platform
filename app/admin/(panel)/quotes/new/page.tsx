import { createClient } from '@/lib/supabase/server';
import QuoteEditor from '../QuoteEditor';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const db = createClient();
  const [{ data: trips }, { data: terms }] = await Promise.all([
    db.from('trips').select('id, title').order('title'),
    db.from('booking_terms').select('text, sort_order').order('sort_order'),
  ]);
  return (
    <QuoteEditor
      quote={null}
      trips={trips ?? []}
      defaultTerms={(terms ?? []).map((t) => t.text)}
    />
  );
}
