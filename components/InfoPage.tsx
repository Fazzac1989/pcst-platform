import Link from 'next/link';
import SiteHeader from '@/components/SiteHeaderWithData';
import SiteFooter from '@/components/SiteFooterWithData';

/**
 * The shared shell for the information pages — Why Premium Choice, the
 * audience pages, the app and About. A dark hero, editorial sections in
 * cards, and the consultation ask at the foot of every one, so each page
 * ends where a reader can act.
 */

export type InfoSection = {
  title: string;
  intro?: string;
  points?: string[];
};

export default function InfoPage({
  eyebrow,
  title,
  heroLine,
  lede,
  sections,
  children,
  related,
}: {
  eyebrow: string;
  title: string;
  heroLine: string;
  lede: string;
  sections?: InfoSection[];
  children?: React.ReactNode;
  related?: { label: string; href: string }[];
}) {
  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <div className="tmeta">
            <div>
              <b>In short</b>
              {heroLine}
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        <section className="safety-intro">
          <div className="wrap">
            <p className="ovp" style={{ fontSize: 17 }}>
              {lede}
            </p>
          </div>
        </section>

        {sections && sections.length > 0 && (
          <section className="safety-grid-band">
            <div className="wrap">
              <div className="safety-grid">
                {sections.map((s, i) => (
                  <article className="safety-card" key={i}>
                    <span className="safety-num">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{s.title}</h3>
                    {s.intro && <p>{s.intro}</p>}
                    {s.points && s.points.length > 0 && (
                      <ul>
                        {s.points.map((point, j) => (
                          <li key={j}>
                            <span className="tick">✓</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {children}

        <section className="safety-close">
          <div className="wrap">
            <h2 className="st serif">Start planning your school&apos;s journey</h2>
            <p className="ovp">
              Every itinerary can be tailored to your preferred dates, group size, budget and
              objectives. Tell us what you have in mind and a member of our team will respond within
              one working day.
            </p>
            <Link className="btn btn-brass" href="/#contact">
              Book an appointment <span className="arrow">→</span>
            </Link>
            {related && related.length > 0 && (
              <p className="info-related">
                {related.map((r, i) => (
                  <span key={r.href}>
                    {i > 0 && ' · '}
                    <Link href={r.href}>{r.label}</Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
