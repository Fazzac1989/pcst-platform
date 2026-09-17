import { config } from 'dotenv';
import { beforeAll, describe, expect, it } from 'vitest';

config({ path: '.env.local' });

/**
 * The resolver against the real database.
 *
 * The unit tests pin the rules; this one checks that the rules are wired to
 * tables that actually look the way they assume. It reads only, and skips
 * itself when there are no credentials, so a checkout without secrets still
 * runs a green suite.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const describeIfConfigured = configured ? describe : describe.skip;

describeIfConfigured('the proposal resolver, against the live database', () => {
  let getProposalById: typeof import('@/lib/brochure/proposal-view-model')['getProposalById'];
  let proposalId: number | null = null;

  beforeAll(async () => {
    const mod = await import('@/lib/brochure/proposal-view-model');
    getProposalById = mod.getProposalById;

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data } = await createAdminClient()
      .from('brochures')
      .select('id')
      .eq('kind', 'proposal')
      .neq('status', 'archived')
      .order('id')
      .limit(1);
    proposalId = data?.[0]?.id ?? null;
  });

  it('finds a proposal to resolve', () => {
    expect(proposalId, 'no proposal rows — seed one before running this').not.toBeNull();
  });

  it('returns null for an id that does not exist', async () => {
    expect(await getProposalById(999_999_999)).toBeNull();
  });

  it('resolves a complete document', async () => {
    const vm = await getProposalById(proposalId!);
    expect(vm).not.toBeNull();
    expect(vm!.content.title.trim()).not.toBe('');
    expect(vm!.days.length).toBeGreaterThan(0);
  });

  it('numbers the days from one, without gaps', async () => {
    const vm = await getProposalById(proposalId!);
    const numbers = vm!.days.map((d) => d.dayNumber);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
  });

  it('resolves every image a day refers to', async () => {
    const vm = await getProposalById(proposalId!);
    const dangling = vm!.days.flatMap((d) => d.imageIds).filter((id) => !vm!.images[id]);
    expect(dangling, 'day photographs pointing at missing images').toEqual([]);
  });

  it('gives every resolved image a usable URL', async () => {
    const vm = await getProposalById(proposalId!);
    const urls = Object.values(vm!.images).map((i) => i.url);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((u) => u.startsWith('http'))).toBe(true);
  });

  it('resolves the hero image', async () => {
    const vm = await getProposalById(proposalId!);
    expect(vm!.heroImage, 'no hero — the opening page would be a flat colour').toBeTruthy();
  });

  it('carries booking conditions with sections', async () => {
    const vm = await getProposalById(proposalId!);
    expect(vm!.terms).not.toBeNull();
    expect(vm!.terms!.sections.length).toBeGreaterThan(0);
  });

  it('has a price and a currency, or neither', async () => {
    const vm = await getProposalById(proposalId!);
    const { pricePerStudent, currency } = vm!.commercials;
    if (pricePerStudent !== null) {
      expect(Number(pricePerStudent)).toBeGreaterThan(0);
      expect(currency.trim()).not.toBe('');
    }
  });

  it('gives each flight a direction the renderer understands', async () => {
    const vm = await getProposalById(proposalId!);
    for (const f of vm!.flights) {
      expect(['outbound', 'return']).toContain(f.direction);
    }
  });
});
