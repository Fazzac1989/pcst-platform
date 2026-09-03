'use client';

import { airlineLogoUrl, pagesAt, type PagePlacement } from '@/lib/brochure/proposal-schema';
import { useCallback, useEffect, useState } from 'react';
import { freePlacesTotal, type ProposalViewModel } from '@/lib/brochure/proposal-schema';
import type { EditorialSlide } from '@/lib/brochure/editorial';
import { EditorialBody } from '@/components/slides/Editorial';
import '@/components/slides/editorial.css';
import '@/components/slides/deck.css';
import '@/components/proposal/slides.css';

/**
 * The proposal, as landscape slides.
 *
 * Same deck as the brochure — 16:9 on screen, one page at a time with a turn,
 * landscape A4 in print. A proposal is one trip written for one school, so
 * where the brochure has a contents page of many trips this has a slide per
 * day, a price and the booking conditions.
 *
 * Every slide is rendered; only the current one is shown. That is what lets
 * the print stylesheet lay the whole deck out as pages without a second
 * component tree to keep in step.
 */
/** Measured: more than this and the conditions run off the slide. */
const TERMS_PER_SLIDE = 2;

export default function ProposalSlides({
  vm,
  shareToken,
  editorial,
  mode = 'page',
}: {
  vm: ProposalViewModel;
  /** Present on the shared link, so the reader's PDF request can prove itself. */
  shareToken?: string;
  /** Who we are, safety and the app — shared with the brochure. */
  editorial: EditorialSlide[];
  /**
   * How it is shown. 'page' stacks the slides into one scrolling document,
   * which is what a school opens; 'deck' turns them one at a time. The PDF is
   * the same either way — the print rules make every slide a page from
   * whichever mode rendered it.
   */
  mode?: 'page' | 'deck';
}) {
  const { content: c, commercials: m } = vm;
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'forward' | 'back' | null>(null);
  const [previous, setPrevious] = useState(0);

  const money = (n: number | null) =>
    n === null
      ? null
      : `${m.currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const outbound = vm.flights.filter((f) => f.direction === 'outbound');
  const inbound = vm.flights.filter((f) => f.direction === 'return');

  /* ── which slides this proposal has ── */
  const has = {
    overview: c.intro.length > 0 || Boolean(c.pctParents || c.pctChildren || c.pctTeachers),
    experiences: c.signatureExperiences.length > 0,
    outcomes: c.learningOutcomes.length > 0,
    flights: vm.flights.length > 0,
    price: m.pricePerStudent !== null || c.inclusions.length > 0 || c.exclusions.length > 0,
    terms: Boolean(vm.terms && vm.terms.sections.length > 0),
    next: c.nextSteps.length > 0,
  };

  // Built in reading order, so a slide's number is its position.
  const plan: { key: string; label: string; detail: string }[] = [];
  // The author's own pages, where they asked for them.
  const pushPages = (where: PagePlacement) =>
    pagesAt(c, where).forEach((p) =>
      plan.push({ key: `page-${p.id}`, label: p.title || 'A page of our own', detail: p.eyebrow }),
    );
  plan.push({ key: 'cover', label: 'Cover', detail: '' });
  plan.push({ key: 'contents', label: 'What is inside', detail: '' });
  if (has.overview) plan.push({ key: 'overview', label: 'Overview', detail: 'The programme' });
  pushPages('after-overview');
  vm.days.forEach((d) =>
    plan.push({ key: `day-${d.dayNumber}`, label: `Day ${d.dayNumber}`, detail: d.title }),
  );
  pushPages('after-itinerary');
  if (has.experiences)
    plan.push({ key: 'experiences', label: 'Signature experiences', detail: 'What they will remember' });
  pushPages('after-experiences');
  if (has.outcomes)
    plan.push({ key: 'outcomes', label: 'Learning outcomes', detail: 'What students take away' });
  pushPages('after-outcomes');
  if (has.flights) plan.push({ key: 'flights', label: 'Flights', detail: 'Routing as scheduled' });
  pushPages('before-price');
  if (has.price) plan.push({ key: 'price', label: 'Price', detail: 'What is and is not included' });
  editorial.forEach((e, i) =>
    plan.push({
      key: `ed-${i}`,
      label:
        e.kind === 'introduction' ? 'About Premium Choice'
        : e.kind === 'safety' ? 'Health, safety & security'
        : 'Our technology',
      detail: e.kind === 'safety' && e.parts > 1 ? `${e.part} of ${e.parts}` : '',
    }),
  );
  // Nine sections of booking conditions overflowed a single slide by more than
  // two slides' worth. They are chunked rather than shrunk: conditions a school
  // is asked to accept should be readable.
  const termChunks: number[][] = [];
  if (has.terms) {
    const sections = vm.terms!.sections;
    for (let i = 0; i < sections.length; i += TERMS_PER_SLIDE) {
      termChunks.push(sections.map((_, n) => n).slice(i, i + TERMS_PER_SLIDE));
    }
    termChunks.forEach((_, i) =>
      plan.push({
        key: `terms-${i}`,
        label: termChunks.length > 1 ? `Booking conditions ${i + 1} of ${termChunks.length}` : 'Booking conditions',
        detail: i === 0 ? vm.terms?.name ?? '' : '',
      }),
    );
  }
  if (has.next) plan.push({ key: 'next', label: 'Next steps', detail: 'How to confirm' });
  pushPages('end');

  const total = plan.length;

  const go = useCallback(
    (next: number) => {
      const i = Math.max(0, Math.min(total - 1, next));
      setIndex((current) => {
        if (i === current) return current;
        setPrevious(current);
        setTurning(i > current ? 'forward' : 'back');
        return i;
      });
    },
    [total],
  );

  useEffect(() => {
    if (!turning) return;
    const t = setTimeout(() => setTurning(null), 440);
    return () => clearTimeout(t);
  }, [turning, index]);

  useEffect(() => {
    if (mode === 'page') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, total, mode]);

  const pdfHref = `/api/proposals/${vm.id}/pdf${shareToken ? `?token=${encodeURIComponent(shareToken)}` : ''}`;
  /**
   * Our own PDF, not the browser's print dialogue.
   *
   * Ctrl+P produces whatever the reader's settings say: its own header and
   * footer, its own margins, and "Background graphics" off by default. The
   * route renders the same document the same way every time.
   */
  const download = () => {
    window.location.href = pdfHref;
  };

  const cls = (i: number) =>
    mode === 'deck' && i === index && turning === 'forward' ? 'sl-page sl-entering'
    : mode === 'deck' && i === previous && turning ? 'sl-page sl-leaving'
    : 'sl-page';
  const shown = (i: number) =>
    mode === 'page' || i === index || (turning !== null && i === previous);

  const img = (id: number | null | undefined) => (id ? vm.images[id] : undefined);
  const schoolLogo = img(c.schoolLogoImageId);
  const Mark = () => (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
  );

  /* ── the slides ── */
  const render = (key: string): React.ReactNode => {
    switch (true) {
      case key === 'cover':
        return (
          <div className="sl-body">
            <p className="sl-eyebrow">{c.eyebrow || 'Premium Choice School Trips'}</p>
            <h1>
              {c.title} {c.titleEmphasis && <em>{c.titleEmphasis}</em>}
            </h1>
            {c.subtitle && <p className="sl-sub">{c.subtitle}</p>}
            {schoolLogo && (
              <div className="sl-school-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogo.url} alt={m.preparedFor ? `${m.preparedFor} logo` : 'School logo'} />
              </div>
            )}
            {m.preparedFor && <p className="sl-prepared">Prepared for {m.preparedFor}</p>}
          </div>
        );

      case key === 'contents':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">What is inside</p>
              <Mark />
            </div>
            <h2>Your proposal, page by page</h2>
            <ul className="pr-toc">
              {/* Booking conditions run to several slides; the contents says so
                  once rather than listing each of them. */}
              {plan
                .slice(2)
                .filter(
                  (s) =>
                    (!s.key.startsWith('terms-') || s.key === 'terms-0') &&
                    !(s.label === 'Health, safety & security' && s.detail && !s.detail.startsWith('1')),
                )
                .map((s, i) => (
                  <li key={s.key}>
                    <span className="pr-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="pr-t">
                      {s.key === 'terms-0' ? 'Booking conditions' : s.label}
                    </span>
                    {s.detail && <span className="pr-d">{s.detail}</span>}
                  </li>
                ))}
            </ul>
          </div>
        );

      case key === 'overview':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">The programme</p>
              <Mark />
            </div>
            <h2>
              {c.overviewHeading || 'What this trip is built around'}
              {c.overviewEmphasis ? <> <em>{c.overviewEmphasis}</em></> : null}
            </h2>
            <div className="pr-two" style={{ marginTop: '1.4cqw' }}>
              <div>
                {c.intro.map((para, i) => (
                  <p className="sl-lede" key={i}>{para}</p>
                ))}
              </div>
              <div>
                {(c.pctParents || c.pctChildren || c.pctTeachers) && (
                  <div className="pr-three" style={{ gridTemplateColumns: '1fr', gap: '1.2cqw', marginTop: 0 }}>
                    {c.pctParents && (
                      <div><h3>Parents</h3><p>{c.pctParents}</p></div>
                    )}
                    {c.pctChildren && (
                      <div><h3>Children</h3><p>{c.pctChildren}</p></div>
                    )}
                    {c.pctTeachers && (
                      <div><h3>Teachers</h3><p>{c.pctTeachers}</p></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case key.startsWith('day-'): {
        const n = Number(key.slice(4));
        const day = vm.days.find((d) => d.dayNumber === n)!;
        const shots = day.imageIds.map((id) => img(id)).filter(Boolean).slice(0, 3);
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">
                Day {day.dayNumber}
                {day.date ? ` · ${longDate(day.date)}` : ''}
              </p>
              <Mark />
            </div>
            <div className="pr-day">
              <div>
                <h2>{day.title}</h2>
                {day.summary && <p className="sl-lede">{day.summary}</p>}
                {day.items.length > 0 && (
                  <ul className="pr-times">
                    {day.items.map((it, i) => (
                      <li key={it.id ?? i}>
                        <time>{it.timeLabel}</time>
                        {/* Only <b> survives the importer's sanitiser. */}
                        <span dangerouslySetInnerHTML={{ __html: it.text }} />
                      </li>
                    ))}
                  </ul>
                )}
                {day.overnight && (
                  <div className="pr-base">
                    <b>Overnight</b>
                    {day.overnight}
                  </div>
                )}
              </div>
              <div className="pr-shots">
                {shots.map((s, i) => (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s!.url} alt={s!.alt} loading="lazy" />
                  </figure>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case key.startsWith('page-'): {
        const page = c.customPages.find((p) => `page-${p.id}` === key);
        if (!page) return null;
        const shot = img(page.imageId);
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">{page.eyebrow || 'A page of our own'}</p>
              <Mark />
            </div>
            <h2>{page.title}</h2>
            <div className={`pr-page${shot ? ' pr-page--image' : ''}`}>
              <div className="pr-page-text">
                {page.body.map((para, i) => (
                  <p className="sl-lede" key={i}>
                    {para}
                  </p>
                ))}
              </div>
              {shot && (
                <figure className="pr-page-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.url} alt={shot.alt} loading="lazy" />
                </figure>
              )}
            </div>
          </div>
        );
      }

      case key === 'experiences':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">Signature experiences</p>
              <Mark />
            </div>
            <h2>What the group will remember</h2>
            <div className={`pr-cards${c.signatureExperiences.length > 3 ? ' pr-cards-4' : ''}`}>
              {c.signatureExperiences.map((e, i) => (
                <div className="pr-card" key={i}>
                  <h3>{e.title}</h3>
                  <p>{e.caption}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case key === 'outcomes':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">Learning outcomes</p>
              <Mark />
            </div>
            <h2>What students take away</h2>
            <div className={`pr-cards${c.learningOutcomes.length > 3 ? ' pr-cards-4' : ''}`}>
              {c.learningOutcomes.map((o, i) => (
                <div className="pr-card" key={i}>
                  <h3>{o.title}</h3>
                  <p>{o.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case key === 'flights':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow" style={{ color: 'var(--teal)' }}>Flights</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-white.png" alt="Premium Choice School Trips" />
            </div>
            <h2 style={{ color: '#fff' }}>Getting there and back</h2>
            <div className="pr-legs">
              {[
                ['Outbound', outbound],
                ['Return', inbound],
              ].map(([label, legs]) =>
                (legs as typeof outbound).length > 0 ? (
                  <div className="pr-leg" key={label as string}>
                    <p className="pr-dir">{label as string}</p>
                    {(legs as typeof outbound).map((f, i) => (
                      <div key={i} style={{ marginTop: i ? '1.2cqw' : 0 }}>
                        {airlineLogoUrl(f) && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img className="pr-airline" src={airlineLogoUrl(f)!} alt={f.carrier || ''} loading="lazy" />
                        )}
                        <p className="pr-route">
                          {f.fromCode} → {f.toCode}
                        </p>
                        <p className="pr-sub">
                          {[f.carrier, f.flightNumber].filter(Boolean).join(' ')}
                          {f.note ? ` · ${f.note}` : ''}
                        </p>
                        <p className="pr-sub">
                          {[f.fromName, f.toName].filter(Boolean).join(' → ')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
            <p className="pr-sub" style={{ marginTop: '1.6cqw' }}>
              Times are as scheduled and may be adjusted by the airline.
            </p>
          </div>
        );

      case key === 'price':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">Price</p>
              <Mark />
            </div>
            <div className="pr-price">
              <div className="pr-figure">
                <p className="pr-big">{money(m.pricePerStudent) ?? 'On request'}</p>
                <p className="pr-basis">{m.priceBasisNote || 'Indicative price per student'}</p>
                <ul>
                  {m.studentCount !== null && <li>Based on {m.studentCount} students</li>}
                  {freePlacesTotal(m) > 0 && (
                    <li>
                      {freePlacesTotal(m)} free places — {m.freePlacesTeachers ?? 0} teachers +{' '}
                      {m.freePlacesPctStaff ?? 0} PCT staff
                    </li>
                  )}
                  {m.travelStart && (
                    <li>{shortRange(m.travelStart, m.travelEnd)}</li>
                  )}
                </ul>
              </div>
              <div className="pr-lists">
                <div>
                  <p className="sl-eyebrow">Included</p>
                  <ul>
                    {c.inclusions.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="pr-exc">
                  <p className="sl-eyebrow">Not included</p>
                  <ul>
                    {c.exclusions.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case key.startsWith('terms-'): {
        const chunk = termChunks[Number(key.slice(6))] ?? [];
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow">Booking conditions</p>
              <Mark />
            </div>
            <h2>{vm.terms?.name}</h2>
            <div className="pr-terms">
              {chunk.map((n) => {
                const sec = vm.terms!.sections[n];
                return (
                  <section className="pr-term" key={n}>
                    <h4>{sec.heading}</h4>
                    {/* The terms are our own copy, written by us. */}
                    <div dangerouslySetInnerHTML={{ __html: sec.bodyHtml }} />
                  </section>
                );
              })}
            </div>
          </div>
        );
      }

      case key === 'next':
        return (
          <div className="sl-body">
            <div className="sl-masthead">
              <p className="sl-eyebrow" style={{ color: 'var(--teal)' }}>Next steps</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-white.png" alt="Premium Choice School Trips" />
            </div>
            <h2 style={{ color: '#fff' }}>How to confirm</h2>
            <div className="pr-steps">
              {c.nextSteps.map((s, i) => (
                <div className="pr-step" key={i}>
                  <p className="pr-num">{['i', 'ii', 'iii', 'iv', 'v'][i] ?? i + 1}</p>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
            <div className="sl-contact">
              {c.contact.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/\s+/g, '')}`}>{p}</a>
              ))}
              {c.contact.email && <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>}
            </div>
          </div>
        );

      case key.startsWith('ed-'):
        return <EditorialBody slide={editorial[Number(key.slice(3))]} />;

      default:
        return null;
    }
  };

  return (
    <div className={`sl-deck${mode === 'page' ? ' sl-deck--page' : ''}`}>
      <div className="sl-bar">
        {mode === 'deck' ? (
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
            ← Back
          </button>
        ) : (
          <span className="sl-count">{c.title || 'Your proposal'}</span>
        )}
        {mode === 'deck' && (
          <span className="sl-count" aria-hidden="true">
            {index + 1} / {total}
          </span>
        )}
        <span style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={download}>
            Download as PDF
          </button>
          {mode === 'deck' && (
            <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1}>
              Next →
            </button>
          )}
        </span>
      </div>

      <div className="sl-stage">
        {plan.map((s, i) => (
          <article
            key={s.key}
            className={`${cls(i)}${s.key === 'cover' ? ' sl-cover' : ''}${
              s.key === 'flights' || s.key === 'next' ? ' sl-closing' : ''
            }`}
            hidden={!shown(i)}
          >
            {render(s.key)}
            {s.key === 'cover' && (
              <div className="sl-mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo-white.png" alt="Premium Choice School Trips" />
                {m.travelStart && (
                  <span className="sl-edition">{shortRange(m.travelStart, m.travelEnd)}</span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {mode === 'deck' && (
        <p aria-live="polite" style={SR_ONLY}>
          Page {index + 1} of {total}
        </p>
      )}
    </div>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function shortRange(start: string, end: string | null) {
  const f = (s: string, withYear = false) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  return end ? `${f(start)} – ${f(end, true)}` : f(start, true);
}
