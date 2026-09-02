import Journey from '@/components/proposal/Journey';
import { Snowfall, TermsToggle, TopBar } from '@/components/proposal/Chrome';
import { freePlacesTotal, type ProposalViewModel } from '@/lib/brochure/proposal-schema';
import '@/components/proposal/proposal.css';

/**
 * The proposal, in the order the reference presents it.
 *
 * A server component holding the whole document, with the three interactive
 * pieces — the print button, the journey tabs and the terms accordion — split
 * out as clients. One tree serves screen, print and PDF; the print stylesheet
 * does the rearranging rather than a second set of components, so the two can
 * never drift.
 */
export default function ProposalDocument({
  vm,
  shareToken,
}: {
  vm: ProposalViewModel;
  /** Present on the shared link, so the reader's PDF request can prove itself. */
  shareToken?: string;
}) {
  const { content: c, commercials: m } = vm;
  const money = (n: number | null) =>
    n === null ? null : `${m.currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const outbound = vm.flights.filter((f) => f.direction === 'outbound');
  const inbound = vm.flights.filter((f) => f.direction === 'return');
  const carrier = vm.flights.find((f) => f.carrier)?.carrier ?? '';
  const nights = vm.days.length > 1 ? vm.days.length - 1 : 0;

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <a href="#top" aria-label={c.contact.name || 'Premium Choice School Trips'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
          </a>
          <nav aria-label="Sections">
            <a href="#overview">Overview</a>
            <a href="#journey">The journey</a>
            <a href="#experiences">Experiences</a>
            <a href="#flights">Flights</a>
            <a href="#price">Price</a>
            <a href="#terms">Booking conditions</a>
          </nav>
          <TopBar pdfHref={`/api/proposals/${vm.id}/pdf${shareToken ? `?token=${encodeURIComponent(shareToken)}` : ''}`} />
        </div>
      </header>

      {/* ── hero ── */}
      <section className="hero on-dark" id="top">
        <div
          className="bg"
          role="img"
          aria-label={vm.heroImage ? c.subtitle : ''}
          style={vm.heroImage ? { backgroundImage: `url(${vm.heroImage})` } : undefined}
        />
        {vm.heroEffect && <Snowfall />}
        <div className="wrap">
          {m.preparedFor && <div className="prepared">Proposal prepared for {m.preparedFor}</div>}
          {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
          <h1>
            {c.title} {c.titleEmphasis && <em>{c.titleEmphasis}</em>}
          </h1>
          {c.subtitle && <p className="sub">{c.subtitle}</p>}
          <div className="meta">
            {vm.days.length > 0 && (
              <span>
                {vm.days.length} days
                {nights ? ` · ${nights} nights` : ''}
              </span>
            )}
            {m.travelStart && m.travelEnd && (
              <span>
                {range(m.travelStart, m.travelEnd)}
              </span>
            )}
            {carrier && <span>{carrier}</span>}
          </div>
          <div className="ctas">
            <a className="btn solid" href="#price">
              See the price
            </a>
            <a className="btn" href="#journey">
              Day by day
            </a>
          </div>
        </div>
      </section>

      {/* ── at a glance ── */}
      <div className="glance">
        <div className="wrap">
          {m.pricePerStudent !== null && (
            <div>
              <b>{money(m.pricePerStudent)}</b>
              <small>Indicative price per student</small>
            </div>
          )}
          {m.studentCount !== null && (
            <div>
              <b>{m.studentCount} students</b>
              <small>Basis for pricing</small>
            </div>
          )}
          {freePlacesTotal(m) > 0 && (
            <div>
              <b>{freePlacesTotal(m)} free places</b>
              <small>
                {m.freePlacesTeachers} teachers + {m.freePlacesPctStaff} PCT staff member
              </small>
            </div>
          )}
          {vm.days[0]?.overnight && (
            <div>
              <b>Full board</b>
              <small>{vm.days[0].overnight.split('·')[0].trim()}</small>
            </div>
          )}
        </div>
      </div>

      {/* ── what is inside: a contents page, print and PDF only ── */}
      <nav className="contents" aria-hidden="true">
        <div className="wrap">
          <p className="eyebrow">What is inside</p>
          <ol>
            <li><span>Overview</span><span>The programme, and who it looks after</span></li>
            {vm.days.length > 0 && (
              <li>
                <span>The journey</span>
                <span>
                  {vm.days.length} {vm.days.length === 1 ? 'day' : 'days'}, day by day
                </span>
              </li>
            )}
            {c.signatureExperiences.length > 0 && (
              <li><span>Signature experiences</span><span>What the group will remember</span></li>
            )}
            {c.learningOutcomes.length > 0 && (
              <li><span>Learning outcomes</span><span>What students take away</span></li>
            )}
            {vm.flights.length > 0 && (
              <li><span>Flights</span><span>Routing as scheduled</span></li>
            )}
            <li><span>Price</span><span>What is and is not included</span></li>
            {vm.terms && (
              <li><span>Booking conditions</span><span>{vm.terms.name}</span></li>
            )}
            {c.nextSteps.length > 0 && (
              <li><span>Next steps</span><span>How to confirm</span></li>
            )}
          </ol>
        </div>
      </nav>

      {/* ── overview ── */}
      <section className="overview" id="overview">
        <div className="wrap">
          <div className="grid">
            <div>
              <p className="eyebrow">The programme</p>
              {/* Authored per proposal. The old version keyed off vm.slug, which is
                  always truthy, so every proposal claimed the same sentence. */}
              <h2>
                {c.overviewHeading || 'What this trip is built around'}
                {c.overviewEmphasis ? <> <em>{c.overviewEmphasis}</em></> : null}
              </h2>
              {c.intro.map((para, i) => (
                <p className="lede" key={i} style={i === 0 ? { marginTop: 24 } : undefined}>
                  {para}
                </p>
              ))}
            </div>
          </div>

          {(c.pctParents || c.pctChildren || c.pctTeachers) && (
            <div className="pct">
              <p className="eyebrow">Who this trip looks after</p>
              <h2>
                Parents reassured. Children inspired. Teachers <em>supported.</em>
              </h2>
              <div className="cols">
                {(
                  [
                    ['P', 'arents', c.pctParents],
                    ['C', 'hildren', c.pctChildren],
                    ['T', 'eachers', c.pctTeachers],
                  ] as const
                ).map(([initial, rest, body]) => (
                  <div key={initial}>
                    <h3>
                      <span>{initial}</span>
                      {rest}
                    </h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Journey days={vm.days} images={vm.images} />

      {/* ── signature experiences ── */}
      {c.signatureExperiences.length > 0 && (
        <section className="exp" id="experiences">
          <div className="wrap">
            <p className="eyebrow">Signature experiences</p>
            <h2>
              {c.signatureExperiences.length} things they will <em>never forget</em>
            </h2>
            <div className="grid">
              {c.signatureExperiences.map((exp, i) => {
                const img = exp.imageId ? vm.images[exp.imageId] : null;
                return (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={img.url} alt="" loading="lazy" />}
                    <figcaption>
                      <b>{exp.title}</b>
                      <small>{exp.caption}</small>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── learning outcomes ── */}
      {c.learningOutcomes.length > 0 && (
        <section className="outcomes on-white" id="outcomes">
          <div className="wrap">
            <p className="eyebrow">Learning outcomes</p>
            <h2>
              What students will <em>gain</em>
            </h2>
            <div className="grid">
              {c.learningOutcomes.map((o, i) => (
                <div className="item" key={i}>
                  <span className="tick" />
                  <div>
                    <b>{o.title}</b>
                    <p>{o.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── flights ── */}
      {vm.flights.length > 0 && (
        <section className="flights on-dark" id="flights">
          <div className="wrap">
            <p className="eyebrow">Flight plan</p>
            <h2>
              {carrier}
              {outbound[0]?.toName ? (
                <>
                  , <em>via {outbound[0].toName}</em>
                </>
              ) : null}
            </h2>
            <div className="board" role="table" aria-label="Flight schedule">
              <div className="row h" role="row">
                <span>Flight</span>
                <span>Route</span>
                <span>Details</span>
              </div>
              {[
                ['Outbound', outbound],
                ['Return', inbound],
              ].map(([label, list]) =>
                (list as typeof outbound).length ? (
                  <div key={label as string}>
                    <div className="grp">{label as string}</div>
                    {(list as typeof outbound).map((f) => (
                      <div className="row" role="row" key={f.id}>
                        <span className="fl">{f.flightNumber}</span>
                        <span className="leg">
                          <b>
                            {f.fromName} → {f.toName}
                          </b>
                          {(f.fromCode || f.toCode) && (
                            <small>
                              {f.fromCode} → {f.toCode}
                            </small>
                          )}
                        </span>
                        <span className="t">{f.note}</span>
                      </div>
                    ))}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── investment ── */}
      <section className="price" id="price">
        <div className="wrap">
          <div className="top">
            <div>
              <p className="eyebrow">Investment</p>
              {m.pricePerStudent !== null && (
                <div className="big">
                  {money(m.pricePerStudent)}
                  <small>Indicative price per student{carrier ? ` · flying ${carrier}` : ''}</small>
                </div>
              )}
            </div>
            <p className="basis">
              {m.studentCount !== null && `Based on ${m.studentCount} paying students. `}
              {freePlacesTotal(m) > 0 &&
                `${m.freePlacesTeachers} teachers and ${m.freePlacesPctStaff} Premium Choice Travel staff member travel free of charge. `}
              The price is an estimate and is confirmed on booking.
            </p>
          </div>

          <div className="lists">
            {c.inclusions.length > 0 && (
              <div className="inc">
                <h3>What&rsquo;s included</h3>
                <ul>
                  {c.inclusions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {freePlacesTotal(m) > 0 && (
                  <div className="free">
                    <b>{freePlacesTotal(m)}</b>
                    <span>
                      free places — {m.freePlacesTeachers} teachers and {m.freePlacesPctStaff} Premium Choice
                      Travel staff member accompanying the group
                    </span>
                  </div>
                )}
              </div>
            )}
            {c.exclusions.length > 0 && (
              <div className="exc">
                <h3>To budget for</h3>
                <ul>
                  {c.exclusions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── booking conditions ── */}
      {vm.terms && vm.terms.sections.length > 0 && (
        <section className="terms on-white" id="terms">
          <div className="wrap">
            <p className="eyebrow">Service levels and booking conditions</p>
            <h2>
              The <em>small print</em>, in full
            </h2>
            <p className="lede" style={{ marginTop: 20 }}>
              Everything your leadership team and parents will ask about. Open a section to read it, or open
              them all before printing.
            </p>
            <TermsToggle />
            <div className="acc">
              {vm.terms.sections.map((s, i) => (
                <details key={i}>
                  <summary>{s.heading}</summary>
                  {/* Authored by Premium Choice in the terms library, not by a
                      customer, so its markup is rendered as written. */}
                  <div className="body" dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── next steps and contact ── */}
      {(c.nextSteps.length > 0 || c.contact.name) && (
        <section className="next on-dark" id="contact">
          <div className="wrap">
            {c.nextSteps.length > 0 && (
              <>
                <p className="eyebrow">Next steps</p>
                <h2>
                  How this <em>moves forward</em>
                </h2>
                <div className="steps">
                  {c.nextSteps.map((s, i) => (
                    <div key={i}>
                      <i>{['i.', 'ii.', 'iii.', 'iv.', 'v.'][i] ?? `${i + 1}.`}</i>
                      <h4>{s.title}</h4>
                      <p>{s.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {c.contact.name && (
              <div className="who">
                <b>{c.contact.name}</b>
                {c.contact.phones.map((p, i) => (
                  <span key={p}>
                    {i > 0 && ' · '}
                    <a href={`tel:${p.replace(/\s/g, '')}`}>{p}</a>
                  </span>
                ))}
                <br />
                {c.contact.email && <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>}
                {c.contact.website && (
                  <>
                    {' · '}
                    <a href={c.contact.website}>{c.contact.website.replace(/^https:\/\//, '')}</a>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <footer>
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-white.png" alt="Premium Choice School Trips" />
          {c.contact.address && <span>{c.contact.address}</span>}
        </div>
      </footer>
    </>
  );
}

function range(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  const day = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric' });
  const monthYear = (d: Date) =>
    d.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${day(a)}–${day(b)} ${monthYear(b)}`
    : `${day(a)} ${monthYear(a)} – ${day(b)} ${monthYear(b)}`;
}
