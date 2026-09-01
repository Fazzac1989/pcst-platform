import type { Brochure, BrochurePage, PageContent } from '@/lib/brochure/schema';
import type { BrochureTrip } from '@/lib/brochure/data';
import { PrintBar } from '@/components/brochure/ReportChrome';
import { sizedImage } from '@/lib/brochure/image-size';
import '@/components/brochure/report.css';

/**
 * A brochure as a collection report.
 *
 * The block model stores roughly three pages per trip — a hero, an overview
 * and a gallery. Rendered one block to a page that is a flipbook. Here the
 * blocks belonging to one trip are gathered into a single spread, so a
 * twenty-trip brochure reads as twenty spreads rather than sixty slides.
 *
 * One tree serves screen, print and PDF. The print stylesheet does the
 * rearranging, so the PDF cannot drift from the page it is a copy of.
 */

type Props = {
  brochure: Brochure;
  pages: BrochurePage[];
  trips: Record<number, BrochureTrip>;
  brochureQrSvg: string | null;
  pdfHref: string;
};

/** Everything the block model holds about one trip, in one place. */
type TripSpread = {
  tripId: number;
  trip: BrochureTrip | undefined;
  content: PageContent;
  images: string[];
};

const EDITORIAL_TYPES = new Set([
  'brandIntroduction',
  'howItWorks',
  'safety',
  'appFeature',
  'textEditorial',
]);

/**
 * Merge the pages of one trip into a single spread.
 *
 * Later pages fill gaps rather than overwrite: a tripOverview carries the
 * highlights, a tripHero the proposition, and neither should erase the other.
 */
function gatherTrips(pages: BrochurePage[], trips: Record<number, BrochureTrip>): TripSpread[] {
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
      const empty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      if (empty) continue;
      if ((spread.content as any)[key] === undefined) (spread.content as any)[key] = value;
    }
    for (const url of c.imageUrls ?? []) {
      if (url && !spread.images.includes(url)) spread.images.push(url);
    }
  }

  return order.map((id) => byTrip.get(id)!);
}

export default function BrochureReport({ brochure, pages, trips, brochureQrSvg, pdfHref }: Props) {
  const visible = pages.filter((p) => !p.hidden);
  const cover = visible.find((p) => p.pageType === 'cover')?.content ?? {};
  // An editorial page with no headline and no body has nothing to show. The
  // block model keeps them as placeholders; rendering them produced five
  // identical sections containing the word "About" and nothing else.
  const editorial = visible.filter(
    (p) =>
      EDITORIAL_TYPES.has(p.pageType) &&
      p.tripId === null &&
      (Boolean(p.content?.headline) ||
        (p.content?.body ?? []).length > 0 ||
        (p.content?.inclusions ?? []).length > 0),
  );
  const closing = visible.find((p) => p.pageType === 'contact' || p.pageType === 'callToAction')?.content;
  const spreads = gatherTrips(visible, trips);

  const coverImage = brochure.coverImage ?? cover.imageUrls?.[0] ?? null;
  const nights = spreads.reduce((n, s) => n + (s.trip?.durationNights ?? 0), 0);

  return (
    <div className="rep">
      <PrintBar pdfHref={pdfHref} />

      {/* ── cover ── */}
      <header className="rep-cover">
        {coverImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="rep-bg" src={sizedImage(coverImage, 'cover') ?? coverImage} alt="" />
        )}
        <div className="rep-wrap">
          {brochure.clientName && <p className="rep-prepared">Prepared for {brochure.clientName}</p>}
          <p className="rep-eyebrow">{cover.eyebrow ?? 'Premium Choice School Trips'}</p>
          <h1>{brochure.title}</h1>
          {brochure.subtitle && <p className="rep-sub">{brochure.subtitle}</p>}

          <div className="rep-facts">
            {spreads.length > 0 && (
              <div>
                <b>{spreads.length}</b>
                <small>{spreads.length === 1 ? 'Trip' : 'Trips'}</small>
              </div>
            )}
            {nights > 0 && (
              <div>
                <b>{nights}</b>
                <small>Nights in total</small>
              </div>
            )}
            {brochure.publishedAt && (
              <div>
                <b>{new Date(brochure.publishedAt).getFullYear()}</b>
                <small>Edition</small>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── contents ── */}
      {spreads.length > 0 && (
        <section className="rep-contents">
          <div className="rep-wrap">
            <p className="rep-eyebrow">What is inside</p>
            <h2>The trips in this collection</h2>
            <ol style={{ marginTop: 28 }}>
              {spreads.map((s) => (
                <li key={s.tripId}>
                  <span className="rep-t">{s.trip?.title ?? s.content.headline ?? 'Trip'}</span>
                  <span className="rep-meta">
                    {[s.trip?.country, s.trip?.durationDays ? `${s.trip.durationDays} days` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {(s.content.proposition || s.trip?.subject) && (
                    <span className="rep-d">{s.content.proposition ?? s.trip?.subject}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── the brochure's own editorial ── */}
      {brochure.introText && (
        <section className="rep-editorial">
          <div className="rep-wrap">
            <div className="rep-grid">
              <div>
                <p className="rep-eyebrow">Introduction</p>
              </div>
              <div>
                {brochure.introText.split(/\n\s*\n/).map((para, i) => (
                  <p className="rep-lede" key={i}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {editorial.map((page) => (
        <section className="rep-editorial" key={page.id}>
          <div className="rep-wrap">
            <div className="rep-grid">
              <div>
                <p className="rep-eyebrow">{page.content.eyebrow ?? 'About'}</p>
                {page.content.headline && <h2>{page.content.headline}</h2>}
              </div>
              <div>
                {(page.content.body ?? []).map((para, i) => (
                  <p className="rep-lede" key={i}>
                    {para}
                  </p>
                ))}
                {(page.content.inclusions ?? []).length > 0 && (
                  <ul>
                    {(page.content.inclusions ?? []).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── one spread per trip ── */}
      {spreads.map((s) => (
        <TripSection key={s.tripId} spread={s} />
      ))}

      {/* ── closing ── */}
      {(closing || brochure.closingText) && (
        <section className="rep-closing">
          <div className="rep-wrap">
            <p className="rep-eyebrow">{closing?.eyebrow ?? 'Next steps'}</p>
            <h2>{closing?.headline ?? 'Talk to us about any of these'}</h2>
            {brochure.closingText && <p className="rep-lede">{brochure.closingText}</p>}
            {(closing?.body ?? []).map((para, i) => (
              <p className="rep-lede" key={i}>
                {para}
              </p>
            ))}
            <div className="rep-contact">
              <span>
                <a href="tel:+97144206965">+971 4 420 6965</a>
              </span>
              <span>
                <a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a>
              </span>
              {brochureQrSvg && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="rep-qr" src={brochureQrSvg} alt="" width={74} height={74} />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TripSection({ spread }: { spread: TripSpread }) {
  const { trip, content: c } = spread;
  const title = trip?.title ?? c.headline ?? 'Trip';
  const hero = trip?.heroImage ?? spread.images[0] ?? null;
  // The hero is shown large; the strip below must not repeat it.
  const strip = spread.images.filter((u) => u !== hero).slice(0, 3);

  return (
    <section className="rep-trip">
      <div className="rep-wrap">
        <div className="rep-head">
          <div>
            <p className="rep-eyebrow">{c.eyebrow ?? trip?.subject ?? 'Trip'}</p>
            <h2>{title}</h2>
            {c.proposition && <p className="rep-lede">{c.proposition}</p>}
            <p className="rep-meta">
              {trip?.country && <span><b>{trip.country}</b></span>}
              {trip?.city && <span>{trip.city}</span>}
              {trip?.durationDays ? (
                <span>
                  {trip.durationDays} days / {trip.durationNights} nights
                </span>
              ) : null}
            </p>
          </div>
          {hero && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sizedImage(hero, 'hero') ?? hero} alt={title} loading="lazy" />
            </figure>
          )}
        </div>

        <div className="rep-cols">
          <div>
            {c.intro && <p className="rep-lede">{c.intro}</p>}
            {(c.body ?? []).map((para, i) => (
              <p className="rep-lede" key={i}>
                {para}
              </p>
            ))}

            {(c.highlights ?? []).length > 0 && (
              <>
                <p className="rep-eyebrow" style={{ marginTop: 22 }}>
                  Highlights
                </p>
                <ul className="rep-hl">
                  {(c.highlights ?? []).map((h, i) => (
                    <li key={i}>
                      <strong>{h.name}</strong>
                      {h.note && <span>{h.note}</span>}
                      {/* Kept, not tidied away: "subject to availability" is the
                          difference between a promise and an intention. */}
                      {h.conditional && <em>{h.conditional}</em>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <aside className="rep-side">
            {(trip?.journey ?? []).length > 0 && (
              <div className="rep-box">
                <p className="rep-label">Where the group goes</p>
                <div className="rep-journey">
                  {(trip?.journey ?? []).map((stop, i) => (
                    <span key={i}>{stop.location}</span>
                  ))}
                </div>
              </div>
            )}

            {(c.learningFocus ?? []).length > 0 && (
              <div className="rep-box">
                <p className="rep-label">Learning focus</p>
                <p>{(c.learningFocus ?? []).join(' · ')}</p>
              </div>
            )}

            {(c.inclusions ?? []).length > 0 && (
              <div className="rep-box">
                <p className="rep-label">Included</p>
                <p>{(c.inclusions ?? []).join(' · ')}</p>
              </div>
            )}

            {trip?.qrSvg && (
              <div className="rep-box">
                <p className="rep-label">Full itinerary</p>
                <p>Scan for the day-by-day plan.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="rep-qr" src={trip.qrSvg} alt="" width={74} height={74} />
              </div>
            )}
          </aside>
        </div>

        {/* One picture alone in a three-column strip reads as a mistake; the
            hero is already carrying the trip visually. */}
        {strip.length > 1 && (
          <div className="rep-gallery">
            {strip.map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={i} src={sizedImage(url, 'thumb') ?? url} alt="" loading="lazy" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
