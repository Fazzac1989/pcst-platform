import type { BrochurePage, PageContent } from '@/lib/brochure/schema';
import type { BrochureTrip } from '@/lib/brochure/data';

/**
 * Gather the pages belonging to one trip into a single spread.
 *
 * The block model stores roughly three pages per trip — a hero, an overview
 * and a gallery. One block to a slide would give a twenty-trip brochure sixty
 * slides; one trip to a slide gives it twenty.
 */

export type TripSpread = {
  tripId: number;
  trip: BrochureTrip | undefined;
  content: PageContent;
  images: string[];
};

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Later pages fill gaps rather than overwrite: a tripOverview carries the
 * highlights and a tripHero the proposition, and neither should erase the
 * other.
 */
export function gatherTrips(
  pages: BrochurePage[],
  trips: Record<number, BrochureTrip>,
): TripSpread[] {
  const order: number[] = [];
  const byTrip = new Map<number, TripSpread>();

  for (const page of pages) {
    if (page.tripId === null) continue;
    if (!byTrip.has(page.tripId)) {
      order.push(page.tripId);
      byTrip.set(page.tripId, {
        tripId: page.tripId,
        trip: trips[page.tripId],
        content: {},
        images: [],
      });
    }
    const spread = byTrip.get(page.tripId)!;
    const c = page.content ?? {};

    for (const [key, value] of Object.entries(c)) {
      if (key === 'imageUrls') continue;
      if (isEmpty(value)) continue;
      if ((spread.content as any)[key] === undefined) (spread.content as any)[key] = value;
    }
    for (const url of c.imageUrls ?? []) {
      if (url && !spread.images.includes(url)) spread.images.push(url);
    }
  }

  return order.map((id) => byTrip.get(id)!);
}

export type TripGroup = { label: string; spreads: TripSpread[] };

/**
 * Group the contents page by country, or by subject when a brochure is built
 * around a subject instead.
 *
 * Trips with nothing to group by are collected under one honest heading rather
 * than each becoming a heading of its own.
 */
export function groupSpreads(
  spreads: TripSpread[],
  by: 'country' | 'subject' = 'country',
): TripGroup[] {
  const order: string[] = [];
  const groups = new Map<string, TripSpread[]>();
  const OTHER = 'More trips';

  for (const s of spreads) {
    const raw = by === 'subject' ? s.trip?.subject : s.trip?.country;
    const label = (raw ?? '').trim() || OTHER;
    if (!groups.has(label)) {
      order.push(label);
      groups.set(label, []);
    }
    groups.get(label)!.push(s);
  }

  // A single group is not a grouping; the contents reads better as a plain list.
  if (order.length <= 1) return [{ label: '', spreads }];

  // "More trips" belongs at the end, whatever order it was met in.
  const named = order.filter((l) => l !== OTHER);
  const tail = order.includes(OTHER) ? [OTHER] : [];
  return [...named, ...tail].map((label) => ({ label, spreads: groups.get(label)! }));
}

/**
 * A brochure-sized introduction, cut at a sentence.
 *
 * A trip's own overview is written for a web page with room to scroll — one
 * of them runs to twenty lines, which is more than a slide holds. Cutting to
 * a character count would end mid-thought, so this keeps whole sentences and
 * stops once it has enough. The full text is a QR scan away on the trip page.
 */
export function introSummary(paragraphs: string[], maxChars = 380): string {
  const text = (paragraphs[0] ?? '').trim();
  if (!text || text.length <= maxChars) return text;

  // Split on sentence ends, keeping the punctuation with the sentence.
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).trim().length > maxChars) break;
    out += s;
  }
  // A single sentence longer than the budget is kept whole rather than cut:
  // half a sentence in a brochure reads as a mistake.
  return (out.trim() || sentences[0] || text).trim();
}
