import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeaderWithData';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getSafetyPage } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Health, Safety & Security',
  description:
    'How Premium Choice School Trips looks after every student on every journey — risk assessment, trusted partners, wellbeing, preparation, insurance and 24-hour assistance.',
};

/**
 * Student welfare is central to the brand, so it gets a page of its own rather
 * than a paragraph repeated across every country. Content is editable through
 * site_settings ('safety_page'), with the full text as defaults in code.
 */
export default async function SafetyPage() {
  const page = await getSafetyPage();

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          <Image
            src="/images/hero-home.jpg"
            alt=""
            fill
            priority
            quality={55}
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">Every student, every journey</span>
          <h1>{page.heroTitle}</h1>
          <div className="tmeta">
            <div>
              <b>Our promise</b>
              {page.heroSub}
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        <section className="safety-intro">
          <div className="wrap">
            <span className="eyebrow">Built in, not bolted on</span>
            <h2 className="st serif">
              From the first conversation to <i>their safe return</i>
            </h2>
            <p className="ovp">{page.intro}</p>
          </div>
        </section>

        <section className="safety-grid-band">
          <div className="wrap">
            <div className="safety-grid">
              {page.sections.map((section, i) => (
                <article className="safety-card" key={i}>
                  <span className="safety-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{section.title}</h3>
                  <p>{section.intro}</p>
                  {section.points.length > 0 && (
                    <ul>
                      {section.points.map((point, j) => (
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

        <section className="safety-close">
          <div className="wrap">
            <h2 className="st serif">{page.closing.title}</h2>
            <p className="ovp">{page.closing.text}</p>
            <Link className="btn btn-brass" href="/#contact">
              Arrange a consultation <span className="arrow">→</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooterSimple />
    </>
  );
}
