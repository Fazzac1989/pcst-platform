import type { PageType } from './schema';

/**
 * The company's own pages — the ones that are the same in every brochure.
 *
 * Kept here rather than inside the flipbook components because the accessible
 * reading view has to say exactly the same things. When this copy lived only in
 * the visual component, a screen reader reached six empty headings where the
 * introduction, how-it-works and safety pages should have been.
 *
 * An admin can override any of it per brochure through the page editor; this is
 * the fallback, not a lock.
 */

export type StandardCopy = {
  eyebrow: string;
  headline: string;
  body: string[];
  /** Small print or a closing line, set apart from the body. */
  note?: string;
  steps?: { number: string; title: string; text: string }[];
  trio?: { word: string; after: string }[];
};

export const STANDARD_COPY: Partial<Record<PageType, StandardCopy>> = {
  brandIntroduction: {
    eyebrow: 'Premium Choice School Trips',
    headline: 'The world is your classroom.',
    body: [
      'We design educational travel around what a school actually teaches — then run it so carefully that teachers can concentrate on their students rather than the logistics.',
      'Every itinerary in this brochure is a real programme we operate, built with schools in the region and refined trip after trip.',
    ],
    trio: [
      { word: 'Parents', after: 'reassured' },
      { word: 'Children', after: 'inspired' },
      { word: 'Teachers', after: 'supported' },
    ],
  },

  howItWorks: {
    eyebrow: 'How it works',
    headline: 'From an idea to the airport.',
    body: [],
    steps: [
      {
        number: '01',
        title: 'Tell us the curriculum aim',
        text: 'We shape the itinerary around what you need students to come back knowing.',
      },
      {
        number: '02',
        title: 'We build the programme',
        text: 'A costed, day-by-day proposal you can take to parents and to your leadership team.',
      },
      {
        number: '03',
        title: 'Everything in one place',
        text: 'Rooming, dietary and medical needs, passports and consent forms in your own portal.',
      },
      {
        number: '04',
        title: 'We travel with you',
        text: 'Support on the ground, and an app that keeps teachers, students and parents in step.',
      },
    ],
  },

  safety: {
    eyebrow: 'Health & safety',
    headline: 'The part we take most seriously.',
    body: [
      'Every programme is risk assessed before it is offered, and again against your group. Accommodation, transport and suppliers are chosen for their record with school groups, not their price.',
      'Medical and dietary requirements are collected in advance and travel with your team, so an allergy is known at every meal rather than remembered at one.',
    ],
    note: 'Full documentation, insurance details and supplier accreditations are provided with every proposal.',
  },

  appFeature: {
    eyebrow: 'Our technology',
    headline: 'Everyone in step, all week.',
    body: [
      "Teachers get a command centre: the day's plan, the student register, meeting points and times, and a way to reach every adult at once.",
      'Students get the trip in their pocket, with the learning content built in. Parents get the reassurance of knowing the group has landed.',
    ],
  },

  callToAction: {
    eyebrow: 'Getting started',
    headline: 'Tell us what you teach.',
    body: [
      'Every trip in this brochure can be shaped around your curriculum, your dates and your group. Send us the outline and we will build the programme around it.',
    ],
  },

  contact: {
    eyebrow: 'Contact',
    headline: 'Speak to our team.',
    body: [],
    note: 'Dubai, United Arab Emirates',
  },
};

export const CONTACT_EMAIL = 'info@premiumchoicetravel.com';
export const CONTACT_PHONE = '+971 4 420 6965';

/** A padding leaf inserted to keep spreads aligned — never shown in the reading view. */
export const isBlankPage = (content: Record<string, unknown> | undefined) =>
  Boolean(content && (content as { blank?: boolean }).blank);
