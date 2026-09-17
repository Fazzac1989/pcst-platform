import 'server-only';
import { getSafetyPage } from '@/lib/settings';
import { STANDARD_COPY } from '@/lib/brochure/standard-copy';

/**
 * The pages a brochure and a proposal both carry: who we are, how we keep a
 * group safe, and the app the trip runs on.
 *
 * The safety content is the same the public safety page shows, read through
 * `getSafetyPage`, rather than a second copy that would drift from it. The app
 * screenshots are the same three the home page uses.
 */

export type SafetyCard = { title: string; intro: string; points: string[] };

export type EditorialSlide =
  | {
      kind: 'introduction';
      eyebrow: string;
      headline: string;
      body: string[];
      /** Parents reassured, children inspired, teachers supported. */
      trio: { word: string; after: string }[];
    }
  | {
      kind: 'safety';
      eyebrow: string;
      headline: string;
      intro: string;
      cards: SafetyCard[];
      /** 1 of 2, when the sections do not fit one slide. */
      part: number;
      parts: number;
    }
  | {
      kind: 'technology';
      eyebrow: string;
      headline: string;
      body: string[];
      roles: { role: string; tagline: string; img: string; alt: string }[];
    };

/** The three screens, as the home page presents them. */
const APP_ROLES = [
  {
    role: 'Parent',
    tagline: 'Follow the journey',
    img: '/images/app-parent.png',
    alt: "The itinerary screen a parent follows: each day's activities laid out from arrival onwards",
  },
  {
    role: 'Child',
    tagline: 'Experience the journey',
    img: '/images/app-student.png',
    alt: "The child's Explorer home screen: flights, accommodation, vouchers, photos and announcements",
  },
  {
    role: 'Teacher',
    tagline: 'Run the trip',
    img: '/images/app-teacher.png',
    alt: "The teacher's home screen: student register, flights, accommodation, vouchers and broadcast",
  },
] as const;

/**
 * Three to a slide.
 *
 * Measured: four overflowed a 16:9 slide by about 120px, and safety is the
 * last thing to set in type too small to read.
 */
const SAFETY_PER_SLIDE = 3;

export async function buildEditorialSlides(): Promise<EditorialSlide[]> {
  const slides: EditorialSlide[] = [];

  const intro = STANDARD_COPY.brandIntroduction;
  if (intro) {
    slides.push({
      kind: 'introduction',
      eyebrow: intro.eyebrow,
      headline: intro.headline,
      body: intro.body,
      trio: intro.trio ?? [],
    });
  }

  const safety = await getSafetyPage();
  // The last section on the public page is a "questions?" prompt with a form
  // behind it; it has nowhere to lead in a printed document.
  const cards = safety.sections.filter((s) => !s.title.trim().endsWith('?'));
  const chunks: SafetyCard[][] = [];
  for (let i = 0; i < cards.length; i += SAFETY_PER_SLIDE) {
    chunks.push(cards.slice(i, i + SAFETY_PER_SLIDE));
  }
  chunks.forEach((chunk, i) =>
    slides.push({
      kind: 'safety',
      eyebrow: 'Health, safety & security',
      headline: i === 0 ? safety.heroTitle : 'Health, safety & security, continued',
      intro: i === 0 ? safety.intro : '',
      cards: chunk,
      part: i + 1,
      parts: chunks.length,
    }),
  );

  const tech = STANDARD_COPY.appFeature;
  if (tech) {
    slides.push({
      kind: 'technology',
      eyebrow: tech.eyebrow,
      headline: tech.headline,
      body: tech.body,
      roles: APP_ROLES.map((r) => ({ ...r })),
    });
  }

  return slides;
}

export type EditorialToggles = { showIntro?: boolean; showSafety?: boolean; showApp?: boolean };

/**
 * The standard pages a brochure asked for. Each is on unless it was turned
 * off — the studio stored these choices from the start, but nothing read
 * them, so a brochure made without the safety pages still had them.
 */
export function editorialFor(slides: EditorialSlide[], design: EditorialToggles): EditorialSlide[] {
  return slides.filter((s) =>
    s.kind === 'introduction' ? design.showIntro !== false
    : s.kind === 'safety' ? design.showSafety !== false
    : design.showApp !== false,
  );
}
