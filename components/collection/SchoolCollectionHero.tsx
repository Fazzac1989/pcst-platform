'use client';

import { sizedImage } from '@/lib/brochure/image-size';
import { IconArrowRight, IconDownload } from './icons';

type Props = {
  /** "YOUR SCHOOL COLLECTION · 2026" — the edition comes from the record. */
  edition: string;
  schoolName: string;
  image: string | null;
  pdfHref: string;
  /** Where "Explore your trips" sends focus. */
  targetId: string;
};

/**
 * The split hero: a cream panel of type against a photograph, meeting without
 * a gap. The heading breaks where the design breaks it, so the two lines are
 * written as two lines rather than left to the browser.
 */
export default function SchoolCollectionHero({
  edition,
  schoolName,
  image,
  pdfHref,
  targetId,
}: Props) {
  const explore = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Move the keyboard's place to the collection too, not just the viewport's.
    const focusable = el.querySelector<HTMLElement>('input, select, a, button');
    focusable?.focus({ preventScroll: true });
  };

  return (
    <section className="sc-hero" aria-labelledby="sc-hero-h">
      <div className="sc-hero-panel">
        <p className="sc-eyebrow">{edition}</p>
        <h1 id="sc-hero-h">
          Learning beyond
          <br />
          the classroom.
        </h1>
        <p className="sc-hero-sub">
          Journeys selected for {schoolName}, ready to explore and shape around your school.
        </p>
        <div className="sc-hero-actions">
          <a className="sc-cta" href={`#${targetId}`} onClick={explore}>
            Explore your trips
            <IconArrowRight size={18} />
          </a>
          <a className="sc-textlink" href={pdfHref}>
            <IconDownload size={18} />
            <span>Download full brochure</span>
          </a>
        </div>
      </div>

      <div className="sc-hero-figure">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sizedImage(image, 'cover') ?? image} alt="" fetchPriority="high" />
        )}
        <p className="sc-hero-quote">
          Different places.
          <br />
          Brighter perspectives.
          <hr />
        </p>
      </div>
    </section>
  );
}
