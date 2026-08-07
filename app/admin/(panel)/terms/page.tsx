import { createClient } from '@/lib/supabase/server';
import TermsEditor from './TermsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminTermsPage() {
  const db = createClient();
  const { data } = await db.from('booking_terms').select('text, sort_order').order('sort_order');
  return <TermsEditor initial={(data ?? []).map((t) => t.text)} />;
}
