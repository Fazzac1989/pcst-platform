import type { EditorialSlide } from '@/lib/brochure/editorial';

/**
 * The three pages a brochure and a proposal share, drawn the way the website
 * draws them: numbered safety cards with ticked points, the app shown as the
 * three screens it actually has, and an introduction with the mark beside it.
 *
 * Presentational only — both decks are client components and render these
 * inside a slide.
 */

const Mark = () => (
  /* eslint-disable-next-line @next/next/no-img-element */
  <img src="/images/logo-navy.png" alt="Premium Choice School Trips" />
);

export function EditorialBody({ slide }: { slide: EditorialSlide }) {
  if (slide.kind === 'introduction') {
    return (
      <div className="sl-body">
        <div className="sl-masthead">
          <p className="sl-eyebrow">{slide.eyebrow}</p>
          <Mark />
        </div>
        {/* Text on the left, the mark large on the right. */}
        <div className="ed-intro">
          <div>
            <h2>{slide.headline}</h2>
            {slide.body.map((para, i) => (
              <p className="sl-lede" key={i}>
                {para}
              </p>
            ))}
            {slide.trio.length > 0 && (
              <p className="ed-trio">
                {slide.trio.map((t) => (
                  <span key={t.word}>
                    <b>{t.word}</b> {t.after}.
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="ed-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-navy.png" alt="" />
          </div>
        </div>
      </div>
    );
  }

  if (slide.kind === 'safety') {
    return (
      <div className="sl-body">
        <div className="sl-masthead">
          <p className="sl-eyebrow">
            {slide.eyebrow}
            {slide.parts > 1 ? ` · ${slide.part} of ${slide.parts}` : ''}
          </p>
          <Mark />
        </div>
        <h2>{slide.headline}</h2>
        {slide.intro && <p className="sl-lede ed-safety-intro">{slide.intro}</p>}
        <div className="ed-safety">
          {slide.cards.map((card, i) => (
            <article className="ed-card" key={card.title}>
              <span className="ed-num">
                {String((slide.part - 1) * 3 + i + 1).padStart(2, '0')}
              </span>
              <h3>{card.title}</h3>
              <p>{card.intro}</p>
              {card.points.length > 0 && (
                <ul>
                  {card.points.map((point, j) => (
                    <li key={j}>
                      <span className="ed-tick">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sl-body">
      <div className="sl-masthead">
        <p className="sl-eyebrow">{slide.eyebrow}</p>
        <Mark />
      </div>
      <div className="ed-tech">
        <div>
          <h2>{slide.headline}</h2>
          {slide.body.map((para, i) => (
            <p className="sl-lede" key={i}>
              {para}
            </p>
          ))}
        </div>
        <div className="ed-phones">
          {slide.roles.map((r) => (
            <figure key={r.role}>
              <div className="ed-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.img} alt={r.alt} loading="lazy" />
              </div>
              <figcaption>
                <b>{r.role}</b>
                {r.tagline}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
