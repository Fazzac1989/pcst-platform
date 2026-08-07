import { createClient } from '@/lib/supabase/server';
import TaxonomyManager from '../TaxonomyManager';

export const dynamic = 'force-dynamic';

export default async function AdminCountriesPage() {
  const db = createClient();
  const { data } = await db
    .from('countries')
    .select('id, name, slug, region, trips(count)')
    .order('name');
  const rows = (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    region: c.region,
    tripCount: c.trips?.[0]?.count ?? 0,
  }));
  return <TaxonomyManager kind="country" title="Countries" rows={rows} />;
}
