import 'server-only';
import { createHash } from 'node:crypto';
import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapBrochure, mapBrochurePage, type Brochure, type BrochurePage } from './schema';

/**
 * Reading a brochure for public display.
 *
 * Everything is read with the service role and filtered here rather than by
 * RLS, because visibility and password checks have to happen before any content
 * is sent — an unlisted proposal must not be recoverable from a network trace.
 *
 * A live brochure joins its pages to the current trip records, so a change to a
 * trip shows up. A snapshot brochure ignores them and renders the frozen copy.
 */

export type BrochureTrip = {
  id: number;
  slug: string;
  title: string;
  subject: string | null;
  country: string | null;
  city: string | null;
  durationDays: number;
  durationNights: number;
  heroImage: string | null;
  images: string[];
  journey: { location: string; fromDay: number; toDay: number }[];
  days: { dayNumber: number; label: string; title: string; location: string | null; summary: string | null }[];
  /** Generated once at render, embedded as a data URI so nothing loads at runtime. */
  qrSvg: string | null;
};

export type LoadedBrochure = {
  brochure: Brochure;
  pages: BrochurePage[];
  trips: Record<number, BrochureTrip>;
  brochureQrSvg: string | null;
};

/** A QR that scans cleanly at about 25mm and inherits the brand ink. */
async function qr(url: string): Promise<string | null> {
  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#16242E', light: '#00000000' },
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null; // a missing QR is not worth failing a brochure over
  }
}

export const passwordHash = (password: string) =>
  createHash('sha256').update(`${password.trim()}:${process.env.REVALIDATE_SECRET ?? 'pcst'}`).digest('hex');

export type BrochureAccess =
  | { state: 'ok'; data: LoadedBrochure }
  | { state: 'missing' }
  | { state: 'password'; title: string }
  | { state: 'draft' };

export async function loadBrochure(
  slug: string,
  { password, allowDraft = false }: { password?: string; allowDraft?: boolean } = {}
): Promise<BrochureAccess> {
  const db = createAdminClient();

  const { data: row } = await db.from('brochures').select('*').eq('slug', slug).maybeSingle();
  if (!row) return { state: 'missing' };

  const brochure = mapBrochure(row);

  if (brochure.status === 'archived') return { state: 'missing' };
  if (brochure.status !== 'published' && !allowDraft) return { state: 'draft' };

  // The hash never leaves the server, and no content is loaded until it matches.
  if (row.password_hash && !allowDraft) {
    if (!password || passwordHash(password) !== row.password_hash) {
      return { state: 'password', title: brochure.title };
    }
  }

  const { data: pageRows } = await db
    .from('brochure_pages')
    .select('*')
    .eq('brochure_id', brochure.id)
    .eq('hidden', false)
    .order('sort_order');

  const pages = (pageRows ?? []).map(mapBrochurePage);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pcst-platform.vercel.app';

  // Snapshot brochures carry their own copy of everything.
  const snapshot = brochure.publishingMode === 'snapshot' ? (row.snapshot_data as any) : null;

  const tripIds = Array.from(
    new Set(pages.map((p) => p.tripId).filter((id): id is number => typeof id === 'number'))
  );

  const trips: Record<number, BrochureTrip> = {};

  if (tripIds.length) {
    const { data: tripRows } = await db
      .from('trips')
      .select(
        `id, slug, title, city, duration_days, duration_nights, hero_image, gallery, journey,
         subjects(name), countries(name),
         itinerary_days(sort_order, label, title, display_title, summary, primary_location)`
      )
      .in('id', tripIds);

    for (const t of (tripRows ?? []) as any[]) {
      // The trip's own photography, the same set the public page shows.
      const gallery = Array.isArray(t.gallery)
        ? (t.gallery as any[])
            .map((g) => (typeof g === 'string' ? g : g?.url))
            .filter((u): u is string => typeof u === 'string')
        : [];
      const hero = t.hero_image ?? null;

      trips[t.id] = {
        id: t.id,
        slug: t.slug,
        title: t.title,
        subject: t.subjects?.name ?? null,
        country: t.countries?.name ?? null,
        city: t.city ?? null,
        durationDays: t.duration_days ?? 0,
        durationNights: t.duration_nights ?? 0,
        heroImage: hero,
        images: gallery,
        journey: ((t.journey ?? []) as any[]).map((j) => ({
          location: j.location,
          fromDay: j.from_day,
          toDay: j.to_day,
        })),
        days: ((t.itinerary_days ?? []) as any[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((d, i) => ({
            dayNumber: i + 1,
            label: d.label ?? `Day ${i + 1}`,
            title: d.display_title || d.title || '',
            location: d.primary_location ?? null,
            summary: d.summary ?? null,
          })),
        qrSvg: await qr(`${siteUrl}/trips/${t.slug}`),
      };
    }
  }

  // A snapshot overrides live trip facts with the frozen ones, so a renamed or
  // re-photographed trip cannot change a proposal already sent to a school.
  if (snapshot?.trips) {
    for (const frozen of snapshot.trips as any[]) {
      const live = trips[frozen.id];
      if (!live) continue;
      trips[frozen.id] = {
        ...live,
        title: frozen.title ?? live.title,
        city: frozen.city ?? live.city,
        durationDays: frozen.duration_days ?? live.durationDays,
        durationNights: frozen.duration_nights ?? live.durationNights,
        subject: frozen.subjects?.name ?? live.subject,
        country: frozen.countries?.name ?? live.country,
      };
    }
  }

  return {
    state: 'ok',
    data: {
      brochure,
      pages: snapshot?.pages ? (snapshot.pages as any[]).map(mapBrochurePage) : pages,
      trips,
      brochureQrSvg: await qr(`${siteUrl}/brochures/${brochure.slug}`),
    },
  };
}

/** Published, public brochures only — used for listing and sitemaps. */
export async function listPublicBrochures(): Promise<Brochure[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('brochures')
    .select('*')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false });
  return (data ?? []).map(mapBrochure);
}
