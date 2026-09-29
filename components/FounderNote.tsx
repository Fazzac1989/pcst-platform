import Image from 'next/image';
import './founder.css';

/**
 * Paul's photograph on the Our story page.
 *
 * It sits in InfoPage's children slot rather than in the template itself: the
 * template is shared with Why Premium Choice, the audience pages and the app
 * page, none of which want a portrait.
 *
 * The caption is a label, not copy. Everything the page has to say about Paul
 * is already written in the sections above it.
 */
export default function FounderNote() {
  return (
    <section className="founder-band">
      <div className="wrap">
        <figure className="founder-figure">
          <div className="founder-shot">
            <Image
              src="/images/paul-farrell-portrait.webp"
              alt="Paul Farrell, founder of Premium Choice Travel"
              fill
              sizes="(max-width: 700px) 78vw, 340px"
              className="founder-img"
            />
          </div>
          <figcaption>
            <span className="eyebrow">Our founder</span>
            <b>Paul Farrell</b>
            <span>Founder, Premium Choice Travel</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
