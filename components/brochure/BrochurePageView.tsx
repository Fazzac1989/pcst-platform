'use client';

/* eslint-disable @next/next/no-img-element -- brochure pages are fixed-ratio leaves, not responsive layout images */
import type { Brochure, BrochurePage } from '@/lib/brochure/schema';
import type { BrochureTrip } from '@/lib/brochure/data';
import { CONTACT_EMAIL, CONTACT_PHONE, STANDARD_COPY } from '@/lib/brochure/standard-copy';

/**
 * One printed leaf.
 *
 * Every page is real HTML rather than a rendered image, so text stays sharp at
 * any zoom, links work, screen readers can read it and analytics can see which
 * trip someone clicked. Layout is sized in `cqw` units against the leaf itself,
 * which means one set of rules holds whether the leaf is 480px wide on a phone
 * or 720px on a desktop spread.
 */

export type PageProps = {
  page: BrochurePage;
  brochure: Brochure;
  trips: Record<number, BrochureTrip>;
  brochureQrSvg: string | null;
  pageNumber: number;
  onTripClick?: (tripId: number, href: string) => void;
};

const Cta = ({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick?: () => void;
}) => (
  <a className="bp-cta" href={href} target="_blank" rel="noreferrer" onClick={onClick}>
    {label}
    <span aria-hidden="true"> →</span>
  </a>
);

function Qr({ svg, caption }: { svg: string | null; caption: string }) {
  if (!svg) return null;
  return (
    <div className="bp-qr">
      <img src={svg} alt="" />
      <span>{caption}</span>
    </div>
  );
}

export default function BrochurePageView({
  page,
  brochure,
  trips,
  brochureQrSvg,
  pageNumber,
  onTripClick,
}: PageProps) {
  const c = page.content ?? {};
  const trip = page.tripId ? trips[page.tripId] : null;
  const bg = page.backgroundImage ?? trip?.heroImage ?? null;

  const tripCta =
    trip && c.ctaHref ? (
      <Cta
        label={c.ctaLabel ?? 'Explore the full itinerary'}
        href={c.ctaHref}
        onClick={() => onTripClick?.(trip.id, c.ctaHref!)}
      />
    ) : null;

  switch (page.pageType) {
    /* ─────────────────────────────── cover ─────────────────────────────── */
    case 'cover':
      return (
        <article className={`bp bp-cover bp-cover--${brochure.design.coverTheme ?? 'dark'}`}>
          {brochure.coverImage && <img className="bp-bleed" src={brochure.coverImage} alt="" />}
          <div className="bp-scrim" />
          <div className="bp-cover-inner">
            <img className="bp-logo" src="/images/logo-white.png" alt="Premium Choice School Trips" />
            <div className="bp-cover-text">
              <h1>{brochure.title}</h1>
              {brochure.subtitle && <p className="bp-cover-sub">{brochure.subtitle}</p>}
            </div>
            {brochure.clientName && (
              <div className="bp-cover-client">
                <span>Prepared exclusively for</span>
                {brochure.clientLogo ? (
                  <img src={brochure.clientLogo} alt={brochure.clientName} />
                ) : (
                  <strong>{brochure.clientName}</strong>
                )}
              </div>
            )}
          </div>
        </article>
      );

    /* ──────────────────────────── front matter ────────────────────────────
       Copy comes from lib/brochure/standard-copy so the accessible reading
       view says exactly the same things. An admin edit to the page overrides
       it. */
    case 'brandIntroduction':
    case 'howItWorks':
    case 'safety':
    case 'appFeature': {
      const std = STANDARD_COPY[page.pageType]!;
      // The brochure's own introduction replaces the first standard paragraph.
      const body =
        page.pageType === 'brandIntroduction' && brochure.introText
          ? [brochure.introText, ...std.body.slice(1)]
          : std.body;

      return (
        <article className="bp bp-editorial">
          <p className="bp-eyebrow">{c.eyebrow ?? std.eyebrow}</p>
          <h2 className="bp-h1">{c.headline ?? std.headline}</h2>

          {body.length > 0 && (
            <div className="bp-columns">
              {body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}

          {std.steps && (
            <ol className="bp-steps">
              {std.steps.map((s) => (
                <li key={s.number}>
                  <span>{s.number}</span>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          )}

          {std.trio && (
            <div className="bp-three">
              {std.trio.map((t) => (
                <div key={t.word}>
                  <strong>{t.word}</strong>
                  <span>{t.after}</span>
                </div>
              ))}
            </div>
          )}

          {std.note && <p className="bp-note">{std.note}</p>}
        </article>
      );
    }

    /* ───────────────────────────── dividers ───────────────────────────── */
    case 'subjectDivider':
    case 'destinationDivider':
      return (
        <article className="bp bp-divider">
          {bg && <img className="bp-bleed" src={bg} alt="" />}
          <div className="bp-scrim bp-scrim--strong" />
          <div className="bp-divider-inner">
            <p className="bp-eyebrow bp-eyebrow--light">
              {page.pageType === 'subjectDivider' ? 'Subject' : 'Destination'}
            </p>
            <h2>{c.headline}</h2>
            {c.meta && <p className="bp-divider-meta">{c.meta}</p>}
          </div>
        </article>
      );

    /* ──────────────────────────── trip pages ──────────────────────────── */
    case 'tripHero':
      return (
        <article className={`bp bp-triphero bp-var-${page.layoutVariant}`}>
          {bg && <img className="bp-bleed" src={bg} alt="" />}
          <div className="bp-scrim" />
          <div className="bp-triphero-inner">
            {trip?.country && <p className="bp-eyebrow bp-eyebrow--light">{trip.country}</p>}
            <h2>
              {c.headline}
              {c.subheadline && <span>{c.subheadline}</span>}
            </h2>
            <p className="bp-meta">
              {[
                trip ? `${trip.durationDays} days` : null,
                trip?.subject,
                trip?.city,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </p>
            {c.proposition && <p className="bp-prop">{c.proposition}</p>}
          </div>
        </article>
      );

    case 'tripOverview':
      return (
        <article className={`bp bp-tripover bp-var-${page.layoutVariant}`}>
          <p className="bp-eyebrow">{c.eyebrow ?? trip?.subject}</p>
          <h3 className="bp-h2">{trip?.title ?? c.headline}</h3>
          {c.intro && <p className="bp-intro">{c.intro}</p>}

          {(c.highlights ?? []).length > 0 && (
            <>
              <p className="bp-label">Highlights</p>
              <ul className="bp-highlights">
                {(c.highlights ?? []).map((h, i) => (
                  <li key={i}>
                    <strong>{h.name}</strong>
                    <span>{h.note}</span>
                    {h.conditional && <em>{h.conditional}</em>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {(c.learningFocus ?? []).length > 0 && (
            <p className="bp-tags">
              <span className="bp-label">Learning</span>
              {(c.learningFocus ?? []).join(' · ')}
            </p>
          )}

          <div className="bp-foot">
            {tripCta}
            {trip && <Qr svg={trip.qrSvg} caption="Scan to explore the full itinerary" />}
          </div>
        </article>
      );

    case 'tripGallery': {
      const shots = (c.imageUrls ?? trip?.images ?? []).slice(0, 3);
      return (
        <article className="bp bp-gallery">
          <div className="bp-gallery-grid">
            {shots.map((src, i) => (
              <img key={i} src={src} alt="" loading="lazy" />
            ))}
          </div>
          {(c.keyLocations ?? []).length > 0 && (
            <p className="bp-places">{(c.keyLocations ?? []).join('  ·  ')}</p>
          )}
        </article>
      );
    }

    case 'tripItinerary': {
      const days = trip?.days ?? [];
      return (
        <article className="bp bp-itin">
          <p className="bp-eyebrow">Your journey</p>
          <h3 className="bp-h2">{trip?.title}</h3>
          <ol className="bp-days">
            {days.slice(0, 12).map((d) => (
              <li key={d.dayNumber}>
                <span className="bp-daynum">{String(d.dayNumber).padStart(2, '0')}</span>
                <span className="bp-dayplace">{d.location ?? ''}</span>
                <span className="bp-daytitle">{d.title}</span>
              </li>
            ))}
          </ol>
          {days.length > 12 && <p className="bp-note">Continues — see the full itinerary online.</p>}
          <div className="bp-foot">{tripCta}</div>
        </article>
      );
    }

    /* ───────────────────────────── back matter ───────────────────────────── */
    case 'callToAction': {
      const std = STANDARD_COPY.callToAction!;
      return (
        <article className="bp bp-editorial bp-cta-page">
          <p className="bp-eyebrow">{std.eyebrow}</p>
          <h2 className="bp-h1">{std.headline}</h2>
          <p className="bp-intro">{brochure.closingText ?? std.body[0]}</p>
          <Qr svg={brochureQrSvg} caption="Scan to open this brochure online" />
        </article>
      );
    }

    case 'contact': {
      const std = STANDARD_COPY.contact!;
      return (
        <article className="bp bp-editorial">
          <p className="bp-eyebrow">{std.eyebrow}</p>
          <h2 className="bp-h1">{std.headline}</h2>
          <div className="bp-contact">
            {brochure.design.contactName && (
              <p>
                <strong>{brochure.design.contactName}</strong>
                <span>Premium Choice School Trips</span>
              </p>
            )}
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>{CONTACT_PHONE}</a>
            </p>
            {std.note && <p className="bp-note">{std.note}</p>}
          </div>
        </article>
      );
    }

    case 'backCover':
      return (
        <article className="bp bp-back">
          <img className="bp-logo bp-logo--big" src="/images/logo-white.png" alt="Premium Choice School Trips" />
          <p>The world is your classroom.</p>
          <Qr svg={brochureQrSvg} caption="premiumchoicetravel.com" />
        </article>
      );

    /* A padding leaf, kept blank on purpose so a spread stays balanced. */
    case 'textEditorial':
    default:
      return (
        <article className="bp bp-editorial">
          {c.headline && <h2 className="bp-h1">{c.headline}</h2>}
          {(c.body ?? []).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      );
  }
}
