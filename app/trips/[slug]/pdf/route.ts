import { NextResponse } from 'next/server';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  getBookingTerms,
  getCuratedImages,
  getItineraryDays,
  getTripBySlug,
  getTripHighlights,
} from '@/lib/data';
import { buildJourney } from '@/lib/itinerary/schema';
import TripDoc from '@/lib/pdf/trip-doc';

/**
 * A printable copy of a trip: /trips/<slug>/pdf
 *
 * Generated on demand rather than stored, so it can never drift from the page
 * it came from. Rendering takes a second or two, so the result is cached at the
 * edge for an hour; publishing a change revalidates the trip page anyway.
 */

export const runtime = 'nodejs';

/**
 * Storage holds photography at full resolution — some heroes are 8000px wide —
 * and react-pdf embeds whatever it is given, which produced a 4.5MB file for a
 * five-day trip. Supabase resizes on request, so the PDF gets a print-sized
 * copy instead. Images hosted anywhere else are passed through untouched.
 */
function pdfImage(url: string | null, width: number): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  return `${url.replace(marker, '/storage/v1/render/image/public/')}?width=${width}&quality=72`;
}

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) {
    return NextResponse.json({ ok: false, error: 'Trip not found' }, { status: 404 });
  }

  const [days, highlights, curated, terms] = await Promise.all([
    getItineraryDays(trip.id),
    getTripHighlights(trip.id),
    getCuratedImages(trip.id),
    getBookingTerms(),
  ]);

  const hero = curated.find((c) => c.role === 'hero')?.url ?? trip.heroImage;
  const gallery = curated.filter((c) => c.role === 'gallery').map((c) => c.url);
  const fallbackGallery = trip.gallery.map((g) => g.url);

  const f = trip.countryFacts;
  const countryFacts = !f
    ? []
    : (
        [
          ['Capital', f.capital],
          ['Language', f.languages],
          ['Currency', f.currency],
          ['Time zone', f.timezone],
          ['Population', f.population],
          ['Average temp', f.avgTempC === null ? null : `${f.avgTempC}°C`],
          ['Best time to go', f.bestTime],
        ] as const
      )
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => ({ label, value: value as string }));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pcst-platform.vercel.app';

  try {
    const buffer = await renderToBuffer(
      createElement(TripDoc, {
        trip: {
          title: trip.title,
          slug: trip.slug,
          city: trip.city,
          countryName: trip.country || null,
          subjectName: trip.subject || null,
          durationDays: trip.durationDays,
          durationNights: trip.durationNights,
          departs: trip.departs || null,
          overview: trip.overview,
          includes: trip.includes,
        },
        days,
        journey: buildJourney(days),
        highlights,
        heroImage: pdfImage(hero, 1400),
        galleryImages: (gallery.length ? gallery : fallbackGallery)
          .slice(0, 3)
          .map((url) => pdfImage(url, 800))
          .filter((url): url is string => Boolean(url)),
        countryFacts,
        terms,
        siteUrl,
      }) as any
    );

    const filename = `${trip.title.replace(/[^\w\s-]/g, '').trim() || trip.slug}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        // inline: teachers usually want to read it before saving
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e: any) {
    console.error('[trip pdf]', trip.slug, e?.message);
    return NextResponse.json({ ok: false, error: 'PDF generation failed' }, { status: 500 });
  }
}
