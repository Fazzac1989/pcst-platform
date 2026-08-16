import { createClient } from '@/lib/supabase/server';
import TaxonomyManager from '../TaxonomyManager';
import CountryFactsManager, { type FactsRow } from './CountryFactsManager';

export const dynamic = 'force-dynamic';

const FACT_FIELDS = 'capital, currency, languages, timezone, population, best_time, avg_temp_c, facts_updated_at';

export default async function AdminCountriesPage() {
  const db = createClient();
  const withFacts = await db
    .from('countries')
    .select(`id, name, slug, region, trips(count), ${FACT_FIELDS}`)
    .order('name');

  // Safety net until the country-facts migration has been run.
  const pendingMigration = Boolean(withFacts.error);
  const data: any[] = pendingMigration
    ? (await db.from('countries').select('id, name, slug, region, trips(count)').order('name')).data ?? []
    : withFacts.data ?? [];

  const rows = data.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    region: c.region,
    tripCount: c.trips?.[0]?.count ?? 0,
  }));

  const factsRows: FactsRow[] = data.map((c: any) => ({
    id: c.id,
    name: c.name,
    capital: c.capital ?? '',
    currency: c.currency ?? '',
    languages: c.languages ?? '',
    timezone: c.timezone ?? '',
    population: c.population ?? '',
    best_time: c.best_time ?? '',
    avg_temp_c: c.avg_temp_c === null || c.avg_temp_c === undefined ? null : Number(c.avg_temp_c),
    updatedAt: c.facts_updated_at ?? null,
  }));

  return (
    <>
      <TaxonomyManager kind="country" title="Countries" rows={rows} />
      {pendingMigration ? (
        <p className="mt-12 border-t border-line pt-10 text-sm text-danger">
          Country facts are unavailable until the <code>20260813000000_country_facts.sql</code>{' '}
          migration has been run in the Supabase SQL editor.
        </p>
      ) : (
        <CountryFactsManager rows={factsRows} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
      )}
    </>
  );
}
