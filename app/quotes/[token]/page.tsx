import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/SiteFooterWithData';
import { formatMoney, getQuoteByToken, lineTotal, perStudent, quoteTotal, sellUnit } from '@/lib/quotes';
import MessageThread from './MessageThread';

export const dynamic = 'force-dynamic';

type Props = { params: { token: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quote = await getQuoteByToken(params.token);
  if (!quote) return {};
  return {
    title: `${quote.title} (${quote.ref})`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotePage({ params }: Props) {
  const quote = await getQuoteByToken(params.token);
  if (!quote) notFound();

  const total = quoteTotal(quote.lines);
  const pps = perStudent(quote.lines, quote.pupils);
  const cover = quote.images[0] ?? null;

  return (
    <>
      <div className="thero thero--index">
        <div className="bg">
          {cover && (
            <Image src={cover} alt="" fill priority quality={60} sizes="100vw" style={{ objectFit: 'cover' }} />
          )}
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <div className="qbrand">
            <Image
              src="/images/logo-white.png"
              alt="Premium Choice School Trips"
              width={524}
              height={130}
              style={{ height: 84, width: 'auto' }}
              priority
            />
            {quote.schoolLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={quote.schoolLogo} alt={quote.schoolName ?? 'School logo'} className="qschool-logo" />
            )}
          </div>
          <span className="eyebrow">Personalised quote · {quote.ref}</span>
          <h1>{quote.title}</h1>
          <div className="tmeta">
            {quote.schoolName && (
              <div>
                <b>Prepared for</b>
                {quote.schoolName}
              </div>
            )}
            {quote.teacherName && (
              <div>
                <b>Attention</b>
                {quote.teacherName}
              </div>
            )}
            {quote.travelDates && (
              <div>
                <b>Travel dates</b>
                {quote.travelDates}
              </div>
            )}
            {quote.pupils && (
              <div>
                <b>Group</b>
                {quote.pupils} students{quote.staff ? ` + ${quote.staff} staff` : ''}
              </div>
            )}
            {quote.validity && (
              <div>
                <b>Valid until</b>
                {new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="trip-main">
        <section>
          <div className="wrap">
            <div className="cols">
              <div>
                {quote.itinerary.length > 0 && (
                  <>
                    <span className="eyebrow">Day by day</span>
                    <h2 className="st serif">
                      Your <i>itinerary</i>
                    </h2>
                    <div className="days">
                      {quote.itinerary.map((day, i) => (
                        <div className="day" key={i}>
                          <div className="dnum">{day.label}</div>
                          <div>
                            {day.title && <h3>{day.title}</h3>}
                            <p>{day.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {quote.images.length > 1 && (
                  <div className="qgallery">
                    {quote.images.slice(1).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" loading="lazy" />
                    ))}
                  </div>
                )}

                {quote.terms.length > 0 && (
                  <div style={{ marginTop: 44 }}>
                    <details className="terms">
                      <summary>Terms &amp; conditions</summary>
                      <ol>
                        {quote.terms.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ol>
                    </details>
                  </div>
                )}

                <div style={{ marginTop: 64 }}>
                  <span className="eyebrow">Questions or changes?</span>
                  <h2 className="st serif">
                    Talk to us <i>right here</i>
                  </h2>
                  <MessageThread
                    token={quote.publicToken}
                    teacherName={quote.teacherName}
                    initialMessages={quote.messages}
                  />
                </div>
              </div>

              <div className="side">
                <div className="panel cta">
                  <h3>Your investment</h3>
                  <table className="qprice">
                    <tbody>
                      {quote.lines.map((l, i) => (
                        <tr key={i}>
                          <td>
                            {l.description}
                            {l.qty !== 1 && <span className="qty"> × {l.qty}</span>}
                          </td>
                          <td>{formatMoney(quote.currency, lineTotal(l))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total">
                        <td>Total</td>
                        <td>{formatMoney(quote.currency, total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {pps !== null && (
                    <div className="qpps">
                      <span>{formatMoney(quote.currency, pps)}</span> per student
                    </div>
                  )}
                  <a className="btn btn-brass" href={`/api/quotes/pdf?token=${quote.publicToken}`}>
                    Download PDF itinerary ↓
                  </a>
                  <div className="c">
                    <div>
                      <b>Call</b> +971 4 420 6965
                    </div>
                    <div>
                      <b>Email</b> info@premiumchoicetravel.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
