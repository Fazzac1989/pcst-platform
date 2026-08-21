import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * The public site's words and switches.
 *
 * The complete content lives here as defaults; the site_settings table stores
 * only what an admin has changed, merged over the top at render time. The site
 * therefore works identically whether the table exists, is empty, or carries a
 * full set of edits — and copy changes made in the admin need no deploy.
 */

export type SiteSettings = {
  hero: {
    eyebrow: string;
    /** The headline, with the italic accent carried separately so the design can set it. */
    headline: string;
    headlineAccent: string;
    lede: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  intro: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    paragraphs: string[];
  };
  pct: {
    headline: string;
    sub: string;
    parents: string;
    children: string;
    teachers: string;
  };
  tailored: {
    headline: string;
    headlineAccent: string;
    paragraphs: string[];
    closing: string;
  };
  inspiration: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
  };
  stages: {
    eyebrow: string;
    headline: string;
    headlineAccent: string;
    sub: string;
    steps: { title: string; text: string }[];
  };
  planning: {
    headline: string;
    headlineAccent: string;
    panelTitle: string;
    panelSub: string;
    steps: { title: string; text: string }[];
  };
  flags: {
    /** The app exists but is not being announced yet. */
    appPromotion: boolean;
    /** The world map on subject pages. */
    subjectMap: boolean;
  };
  contact: {
    phone: string;
    email: string;
  };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    eyebrow: 'Premium Choice School Trips',
    headline: 'School travel shaped by',
    headlineAccent: 'experience',
    lede:
      'Educational journeys created with experience, care and a genuine understanding of what schools, students and parents need.',
    ctaPrimary: 'Browse trips',
    ctaSecondary: 'Arrange a consultation',
  },
  intro: {
    eyebrow: 'The future of school travel starts here',
    headline: 'Led by experience,',
    headlineAccent: 'guided by care',
    paragraphs: [
      'Led by Paul Farrell, a travel professional with more than 20 years of experience in the Middle East, Premium Choice School Trips combines extensive destination knowledge, trusted international partnerships and a highly personal approach to school travel.',
      'We work closely with our customers to understand their objectives and create journeys that are engaging, rewarding and appropriate for their students.',
      "From the first conversation through to the group's safe return, every detail is carefully considered and professionally managed. Our aim is to make the planning process straightforward for teachers while creating meaningful experiences that help students discover new places, encounter different cultures and develop confidence, independence and a broader understanding of the world beyond the classroom.",
    ],
  },
  pct: {
    headline: 'One journey. Three perspectives.',
    sub: 'Every school trip has three equally important stakeholders. It is why we are called PCT.',
    parents: 'Confidence, communication, safety and reassurance — so home always knows all is well.',
    children:
      'Discovery, learning, independence, friendship and experiences they will still be talking about years later.',
    teachers:
      'Simple planning, curriculum value, professional support and confidence that everything is properly managed.',
  },
  tailored: {
    headline: 'Designed around your school —',
    headlineAccent: 'never off the shelf',
    paragraphs: [
      'We create purposeful school journeys that take learning beyond the classroom and introduce students to new places, cultures, ideas and experiences. We engage directly with teachers and trip leaders, listening carefully to what they want to achieve, and design a journey that is exactly right for their school and students — not simply selected from a standard itinerary.',
      'By moving beyond repetitive sightseeing, each journey becomes an opportunity for discovery, personal growth and shared experience. Whether students are exploring history where it happened, competing on an international sports tour or developing confidence through adventure, they return with greater independence, broader perspectives and memories that remain with them long after they leave school.',
    ],
    closing:
      "Whatever the school's objectives, we design programmes that bring them to life in some of the world's most exciting destinations.",
  },
  inspiration: {
    eyebrow: 'Journey inspiration',
    headline: 'Where could your students',
    headlineAccent: 'go next?',
  },
  stages: {
    eyebrow: 'With you at every stage',
    headline: 'From the first conversation to',
    headlineAccent: 'their safe return',
    sub: 'One team, involved from the first idea until the group is home — and afterwards.',
    steps: [
      {
        title: 'Listen and understand',
        text: 'We engage directly with teachers, trip leaders and school leaders to understand objectives, preferred destinations, budget, student needs and expectations.',
      },
      {
        title: 'Design and propose',
        text: 'We create a programme specifically around the trip objectives, including a carefully planned itinerary, transparent per-student pricing and the information needed by leadership teams and parents.',
      },
      {
        title: 'Plan and prepare',
        text: 'Once approved, we coordinate travel arrangements, accommodation, activities, insurance and visa requirements — and provide the documentation teachers need to prepare students and communicate confidently with parents.',
      },
      {
        title: 'Travel and return',
        text: 'Throughout the journey the group is supported by experienced local partners with access to 24-hour assistance. We remain involved until the group returns safely, and follow up with the school afterwards.',
      },
    ],
  },
  planning: {
    headline: 'From a staff-room idea to a',
    headlineAccent: 'boarding pass',
    panelTitle: 'Arrange a consultation',
    panelSub: 'Tell us what you have in mind and a member of our team will respond within one working day.',
    steps: [
      {
        title: 'Arrange a consultation',
        text: 'Tell us about your objectives, preferred dates, approximate group size, destination ideas and budget — by telephone, video call or a meeting at your school. There is no obligation and no commitment.',
      },
      {
        title: 'Receive your tailored proposal',
        text: 'We create a carefully considered itinerary with transparent per-student pricing and the essential information leadership teams, teachers and parents need.',
      },
      {
        title: 'Confirm and prepare',
        text: "Once the school is ready to proceed, we coordinate bookings, travel arrangements, documentation and trip preparation, supporting teachers and trip leaders through to the group's safe return.",
      },
    ],
  },
  flags: {
    appPromotion: false,
    subjectMap: true,
  },
  contact: {
    phone: '+971 4 420 6965',
    email: 'info@premiumchoicetravel.com',
  },
};

/** Stored values win field by field; arrays replace wholesale. */
function merge<T>(base: T, over: unknown): T {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(over) && over.length ? over : base) as T;
  if (typeof base === 'object' && base !== null && typeof over === 'object') {
    const out: any = { ...base };
    for (const k of Object.keys(base as any)) {
      out[k] = merge((base as any)[k], (over as any)[k]);
    }
    return out;
  }
  return (typeof over === typeof base && over !== '' ? over : base) as T;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const db = createClient();
    const { data, error } = await db.from('site_settings').select('value').eq('key', 'site').maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return merge(DEFAULT_SETTINGS, data.value);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/* ─────────────────── Health, Safety & Security page ─────────────────── */

export type SafetySection = { title: string; intro: string; points: string[] };

export type SafetyPage = {
  heroTitle: string;
  heroSub: string;
  intro: string;
  sections: SafetySection[];
  closing: { title: string; text: string };
};

export const DEFAULT_SAFETY: SafetyPage = {
  heroTitle: 'Health, Safety & Security',
  heroSub: 'Carefully considered for every student, on every journey',
  intro:
    "Safety is not a page on our website or a form filled in before departure. It is built into how every journey is designed, from the first conversation with a school until every student is safely home. These are the areas we consider for every group, on every programme.",
  sections: [
    {
      title: 'Risk assessment and careful planning',
      intro:
        'Every programme is risk assessed before it is offered to a school, and again against the specific group travelling.',
      points: [
        'Comprehensive risk assessment covering transport, accommodation and every activity',
        'Destination-specific risks reviewed against official travel guidance',
        'Local regulations considered in programme design',
        'Documentation prepared in the format school leadership teams need',
      ],
    },
    {
      title: 'Transportation and accommodation',
      intro:
        'Groups travel with established local partners chosen for their record with school groups, not their price.',
      points: [
        'Licensed transport with appropriately qualified drivers',
        'Accommodation appropriate for school groups, with attention to security and supervision',
        'Fire and emergency procedures reviewed for every property',
        'Rooming arranged with appropriate considerations, and suitable communal areas for the group',
      ],
    },
    {
      title: 'Activities and experiences',
      intro: 'Every activity is delivered by an established provider and assessed for the age group travelling.',
      points: [
        'Specialist instructors and appropriate equipment where activities require them',
        'Appropriate student supervision throughout',
        'Local safety requirements observed and verified',
        'Age suitability considered for every experience on the itinerary',
      ],
    },
    {
      title: 'Student health and wellbeing',
      intro:
        'Wellbeing is broader than physical safety, and it is planned for with the same care.',
      points: [
        'Medical conditions, allergies and dietary requirements collected in advance and shared with those who need them, at every meal and activity',
        'Accessibility and student-specific requirements built into the programme',
        'Attention to emotional wellbeing and inclusion throughout the journey',
        'An environment where students are comfortable raising concerns with any accompanying adult',
      ],
    },
    {
      title: 'Preparation and communication',
      intro: 'A well-prepared group is a safer group, and preparation involves parents as much as students.',
      points: [
        'Full itinerary and essential travel information provided well before departure',
        'Insurance details, emergency contacts and supporting documentation supplied to the school',
        'Parent information sessions and pre-departure briefings supported',
        'Behaviour expectations, local customs and emergency procedures covered with students before travel',
      ],
    },
    {
      title: 'Insurance and assistance',
      intro: 'Cover is arranged before travel and explained in plain language, not discovered afterwards.',
      points: [
        'Travel insurance with policy documentation provided to the school',
        'Clear explanation of what is covered and what is excluded',
        'Straightforward procedures for obtaining support while travelling',
        '24-hour emergency contact, with support from our Dubai team and local partners in destination',
      ],
    },
    {
      title: 'Trusted partners around the world',
      intro:
        'Every journey depends on the people delivering it locally. We work with carefully selected hotels, transport companies, guides, activity providers and destination management partners — relationships built over years, reviewed continuously, and held to the standards a school group requires.',
      points: [],
    },
    {
      title: 'A shared commitment to every student',
      intro:
        'Keeping students safe is a responsibility shared between Premium Choice School Trips, school leadership, teachers, parents, students themselves and our destination partners. We are clear about who does what, so nothing is assumed and nothing is missed.',
      points: [],
    },
  ],
  closing: {
    title: 'Questions about safety on a specific journey?',
    text: 'Every proposal we prepare includes the safety documentation for that programme. If you would like to talk any aspect of it through, arrange a consultation and ask us anything.',
  },
};

export async function getSafetyPage(): Promise<SafetyPage> {
  try {
    const db = createClient();
    const { data, error } = await db
      .from('site_settings')
      .select('value')
      .eq('key', 'safety_page')
      .maybeSingle();
    if (error || !data) return DEFAULT_SAFETY;
    return merge(DEFAULT_SAFETY, data.value);
  } catch {
    return DEFAULT_SAFETY;
  }
}
