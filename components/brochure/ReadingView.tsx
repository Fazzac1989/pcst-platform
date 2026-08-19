/* eslint-disable @next/next/no-img-element -- brochure photography, sized by the page */
import Link from 'next/link';
import type { Brochure, BrochurePage } from '@/lib/brochure/schema';
import type { BrochureTrip } from '@/lib/brochure/data';
import { CONTACT_EMAIL, CONTACT_PHONE, STANDARD_COPY, isBlankPage } from '@/lib/brochure/standard-copy';

/**
 * The same brochure as an ordinary web page.
 *
 * An animated page-turn cannot be the only way to read this: it is unusable
 * with a screen reader, awkward with a keyboard alone, and wrong for anyone who
 * has asked for less motion. This renders the identical content as semantic
 * HTML in a single column — proper headings, real lists, working links.
 */
export default function ReadingView({
  brochure,
  pages,
  trips,
  slug,
}: {
  brochure: Brochure;
  pages: BrochurePage[];
  trips: Record<number, BrochureTrip>;
  slug: string;
}) {
  return (
    <main className="bread">
      <Link href={`/brochures/${slug}`} className="bread-switch">
        ← View as a flipbook
      </Link>

      <h1>{brochure.title}</h1>
      {brochure.subtitle && <p className="bread-sub">{brochure.subtitle}</p>}
      {brochure.clientName && <p className="bread-sub">Prepared for {brochure.clientName}</p>}

      {pages.map((page) => {
        const c = page.content ?? {};
        const trip = page.tripId ? trips[page.tripId] : null;

        // The cover is already the page heading above.
        if (page.pageType === 'cover' || page.pageType === 'backCover') return null;
        // Padding leaves exist only to keep the printed spreads aligned.
        if (isBlankPage(c as Record<string, unknown>)) return null;

        // The company's own pages carry their copy centrally, so this view says
        // the same things the flipbook does rather than rendering a bare heading.
        const std = STANDARD_COPY[page.pageType];
        const heading = trip?.title ?? c.headline ?? std?.headline ?? '';
        if (!heading) return null;

        return (
          <section key={page.id} aria-labelledby={`sec-${page.id}`}>
            {(c.eyebrow || std?.eyebrow) && <h3>{c.eyebrow ?? std?.eyebrow}</h3>}
            <h2 id={`sec-${page.id}`}>
              {heading}
              {c.subheadline && !trip ? ` — ${c.subheadline}` : ''}
            </h2>

            {!trip &&
              (std?.body ?? []).map((p, i) => (
                <p key={`std-${i}`}>{p}</p>
              ))}

            {std?.steps && (
              <ol>
                {std.steps.map((s) => (
                  <li key={s.number}>
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
            )}

            {std?.trio && (
              <ul>
                {std.trio.map((t) => (
                  <li key={t.word}>
                    <strong>{t.word}</strong>
                    <span>{t.after}</span>
                  </li>
                ))}
              </ul>
            )}

            {std?.note && <p>{std.note}</p>}

            {page.pageType === 'contact' && (
              <p>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                {' · '}
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}>{CONTACT_PHONE}</a>
              </p>
            )}

            {trip && (
              <p>
                {[
                  trip.country,
                  trip.city,
                  `${trip.durationDays} days / ${trip.durationNights} nights`,
                  trip.subject,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}

            {c.proposition && <p><strong>{c.proposition}</strong></p>}
            {c.intro && <p>{c.intro}</p>}
            {(c.body ?? []).map((p, i) => (
              <p key={i}>{p}</p>
            ))}

            {page.backgroundImage && (
              <img src={page.backgroundImage} alt="" loading="lazy" />
            )}

            {(c.highlights ?? []).length > 0 && (
              <>
                <h3>Highlights</h3>
                <ul>
                  {(c.highlights ?? []).map((h, i) => (
                    <li key={i}>
                      <strong>{h.name}</strong>
                      <span>
                        {h.note}
                        {h.conditional ? ` (${h.conditional})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {(c.learningFocus ?? []).length > 0 && (
              <p>
                <strong>Learning focus: </strong>
                {(c.learningFocus ?? []).join(', ')}
              </p>
            )}

            {page.pageType === 'tripItinerary' && trip && (
              <>
                <h3>Your journey</h3>
                <ol>
                  {trip.days.map((d) => (
                    <li key={d.dayNumber}>
                      <strong>
                        {d.label}
                        {d.location ? ` — ${d.location}` : ''}
                      </strong>
                      <span>{d.summary ?? d.title}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {(c.conditions ?? []).length > 0 && (
              <>
                <h3>Please note</h3>
                <ul>
                  {(c.conditions ?? []).map((t, i) => (
                    <li key={i}>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {c.ctaHref && (
              <p>
                <a href={c.ctaHref}>{c.ctaLabel ?? 'Explore the full itinerary'} →</a>
              </p>
            )}
          </section>
        );
      })}

      <section>
        <h2>Speak to our team</h2>
        <p>
          <a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a>
          {' · '}
          <a href="tel:+97144206965">+971 4 420 6965</a>
        </p>
      </section>
    </main>
  );
}
