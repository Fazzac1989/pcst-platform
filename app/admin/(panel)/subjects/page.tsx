import { createClient } from '@/lib/supabase/server';
import TaxonomyManager from '../TaxonomyManager';

export const dynamic = 'force-dynamic';

export default async function AdminSubjectsPage() {
  const db = createClient();
  const { data } = await db
    .from('subjects')
    .select('id, name, slug, trips(count)')
    .order('name');
  const rows = (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tripCount: s.trips?.[0]?.count ?? 0,
  }));
  return <TaxonomyManager kind="subject" title="Subjects" rows={rows} />;
}
