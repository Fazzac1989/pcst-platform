import { createClient } from '@/lib/supabase/server';
import { citySlug, isSingleCity } from '@/lib/data';
import TaxonomyManager from '../TaxonomyManager';
import CountryFactsManager, { type FactsRow } from './CountryFactsManager';
import PageContentManager, { type ContentRow } from './PageContentManager';

export const dynamic = 'force-dynamic';

const FACT_FIELDS = 'capital, currency, languages, timezone, population, best_time, avg_temp_c, facts_updated_at';

export default async function AdminCountriesPage() {
  const db = createClient();
  const withFacts = await db
    .from('countries')
    .select(`id, name, slug, region, intro, trips(count), ${FACT_FIELDS}`)
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

  // The cities each country's published trips visit (single-city trips only —
  // routes never make city pages), with whether each has content yet.
  const [{ data: pubTrips }, { data: cityRows }] = await Promise.all([
    db.from('trips').select('country_id, city').eq('status', 'published'),
    db.from('cities').select('slug, intro'),
  ]);
  const writtenCities = new Set((cityRows ?? []).filter((c) => c.intro).map((c) => c.slug));
  const citiesByCountry = new Map<number, { name: string; slug: string; hasContent: boolean }[]>();
  for (const t of pubTrips ?? []) {
    if (!t.country_id || !t.city || !isSingleCity(t.city)) continue;
    const slug = citySlug(t.city);
    const list = citiesByCountry.get(t.country_id) ?? [];
    if (!list.some((c) => c.slug === slug)) {
      list.push({ name: t.city.trim(), slug, hasContent: writtenCities.has(slug) });
      citiesByCountry.set(t.country_id, list);
    }
  }

  const contentRows: ContentRow[] = data.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    hasContent: Boolean(c.intro),
    cities: (citiesByCountry.get(c.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
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
        <>
          <CountryFactsManager rows={factsRows} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
          <PageContentManager rows={contentRows} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
        </>
      )}
    </>
  );
}
