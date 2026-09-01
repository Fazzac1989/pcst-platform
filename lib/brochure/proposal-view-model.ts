import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  EMPTY_CONTENT,
  type ProposalContent,
  type ProposalDay,
  type ProposalFlight,
  type ProposalViewModel,
  type TermsSet,
} from '@/lib/brochure/proposal-schema';

/**
 * Build everything the renderer needs, with overrides already applied.
 *
 * The three output modes — web, print and PDF — share one component tree, so
 * they must share one resolved model too. Anything conditional resolved here
 * rather than in a component is one fewer way for the PDF to disagree with the
 * page it is supposed to be a copy of.
 */

const BUCKET = 'brochure-images';

/** Values on the proposal win over the source brochure, field by field. */
function applyOverrides<T extends object>(base: T, overrides: unknown): T {
  if (!overrides || typeof overrides !== 'object') return base;
  const out: any = { ...base };
  for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) out[k] = v;
      continue;
    }
    if (typeof v === 'object' && typeof out[k] === 'object' && out[k] !== null) {
      out[k] = applyOverrides(out[k], v);
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

async function load(match: { id: number } | { share_token: string }) {
  const db = createAdminClient();
  const query = db.from('brochures').select('*');
  const { data: brochure } = await ('id' in match
    ? query.eq('id', match.id)
    : query.eq('share_token', match.share_token)
  ).maybeSingle();
  return brochure;
}

export async function getProposalById(id: number): Promise<ProposalViewModel | null> {
  const brochure = await load({ id });
  return brochure ? build(brochure) : null;
}

/**
 * A share link resolves only while it is live.
 *
 * Expiry is checked here rather than in the page so every caller gets the same
 * answer, and an expired link is indistinguishable from a wrong one.
 */
export async function getProposalByToken(token: string): Promise<ProposalViewModel | null> {
  if (!token || token.length < 32) return null;
  const brochure = await load({ share_token: token });
  if (!brochure) return null;
  if (brochure.status === 'draft') return null;
  if (brochure.share_expires_at && new Date(brochure.share_expires_at).getTime() < Date.now()) {
    return null;
  }
  return build(brochure);
}

async function build(brochure: any): Promise<ProposalViewModel> {
  const db = createAdminClient();

  const [daysRes, flightsRes, termsRes, imagesRes] = await Promise.all([
    db.from('brochure_days').select('*').eq('brochure_id', brochure.id).order('sort_order'),
    db.from('brochure_flights').select('*').eq('brochure_id', brochure.id).order('sort_order'),
    brochure.terms_set_id
      ? db.from('brochure_terms_sets').select('*').eq('id', brochure.terms_set_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from('brochure_images').select('*'),
  ]);

  const dayRows = daysRes.data ?? [];
  const itemsRes = dayRows.length
    ? await db
        .from('brochure_day_items')
        .select('*')
        .in(
          'day_id',
          dayRows.map((d: any) => d.id),
        )
        .order('sort_order')
    : { data: [] as any[] };

  const itemsByDay = new Map<number, any[]>();
  for (const item of itemsRes.data ?? []) {
    const list = itemsByDay.get(item.day_id) ?? [];
    list.push(item);
    itemsByDay.set(item.day_id, list);
  }

  const images: ProposalViewModel['images'] = {};
  for (const img of imagesRes.data ?? []) {
    images[img.id] = {
      url: db.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl,
      alt: img.alt ?? '',
      width: img.width ?? null,
      height: img.height ?? null,
    };
  }

  const days: ProposalDay[] = dayRows.map((d: any) => ({
    id: d.id,
    dayNumber: d.day_number,
    date: d.date,
    title: d.title ?? '',
    summary: d.summary ?? '',
    overnight: d.overnight ?? '',
    imageIds: Array.isArray(d.image_ids) ? d.image_ids : [],
    sortOrder: d.sort_order ?? 0,
    items: (itemsByDay.get(d.id) ?? []).map((it: any) => ({
      id: it.id,
      timeLabel: it.time_label ?? '',
      text: it.text ?? '',
      sortOrder: it.sort_order ?? 0,
    })),
  }));

  const flights: ProposalFlight[] = (flightsRes.data ?? []).map((f: any) => ({
    id: f.id,
    direction: f.direction === 'return' ? 'return' : 'outbound',
    flightNumber: f.flight_number ?? '',
    carrier: f.carrier ?? '',
    fromCode: f.from_code ?? '',
    fromName: f.from_name ?? '',
    toCode: f.to_code ?? '',
    toName: f.to_name ?? '',
    departsAt: f.departs_at ?? null,
    arrivesAt: f.arrives_at ?? null,
    note: f.note ?? '',
    sortOrder: f.sort_order ?? 0,
  }));

  const termsRow = (termsRes as any).data;
  const terms: TermsSet | null = termsRow
    ? {
        id: termsRow.id,
        name: termsRow.name,
        version: termsRow.version,
        sections: Array.isArray(termsRow.sections) ? termsRow.sections : [],
        isDefault: termsRow.is_default,
        effectiveFrom: termsRow.effective_from,
      }
    : null;

  const content = applyOverrides<ProposalContent>(
    { ...EMPTY_CONTENT, ...(brochure.content ?? {}) },
    (brochure.overrides ?? {}).content,
  );

  const commercials = applyOverrides(
    {
      preparedFor: brochure.prepared_for ?? brochure.client_name ?? '',
      travelStart: brochure.travel_start ?? null,
      travelEnd: brochure.travel_end ?? null,
      studentCount: brochure.student_count ?? null,
      freePlacesTeachers: brochure.free_places_teachers ?? null,
      freePlacesPctStaff: brochure.free_places_pct_staff ?? null,
      pricePerStudent: brochure.price_per_student ?? null,
      currency: brochure.currency ?? 'AED',
      priceBasisNote: brochure.price_basis_note ?? '',
    },
    (brochure.overrides ?? {}).commercials,
  );

  const heroId = Number(content.heroImageId ?? brochure.cover_image);
  return {
    id: brochure.id,
    slug: brochure.slug,
    status: brochure.status,
    heroImage: images[heroId]?.url ?? (typeof brochure.cover_image === 'string' ? brochure.cover_image : null),
    heroEffect: Boolean(brochure.hero_effect),
    content,
    commercials,
    days,
    flights,
    terms,
    images,
  };
}
