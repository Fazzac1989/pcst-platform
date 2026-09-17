/**
 * Structured data for search engines, as a JSON-LD script.
 *
 * Google reads this to show the company as an organisation with a phone
 * number and address, a trip as a trip with a destination and duration, and
 * a page's place in the site. The `<` is escaped so a value can never close
 * the script tag.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const SITE = 'https://www.premiumchoiceschooltrips.com';

/** The company, once per page. */
export const ORGANISATION = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  '@id': `${SITE}/#organisation`,
  name: 'Premium Choice School Trips',
  alternateName: 'Premium Choice Travel — School Trips',
  url: SITE,
  logo: `${SITE}/images/logo-navy.png`,
  image: `${SITE}/images/hero-home.jpg`,
  description:
    'Educational travel for schools, designed around the curriculum and run from Dubai: safe, inspiring, professionally managed school trips for schools across the UAE and beyond.',
  telephone: '+971 4 420 6965',
  email: 'info@premiumchoicetravel.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jumeirah Lakes Towers',
    addressLocality: 'Dubai',
    addressCountry: 'AE',
  },
  areaServed: [{ '@type': 'Country', name: 'United Arab Emirates' }],
  parentOrganization: { '@type': 'Organization', name: 'Premium Choice Travel', url: 'https://www.premiumchoicetravel.com' },
};

/** The trail a page sits on: Home › Trips › This trip. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

/** One trip, as schema.org describes a tour. */
export function touristTrip(trip: {
  slug: string;
  title: string;
  description: string;
  country: string;
  city: string | null;
  subject: string;
  durationDays: number;
  heroImage: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: trip.title,
    description: trip.description,
    url: `${SITE}/trips/${trip.slug}`,
    image: trip.heroImage ?? undefined,
    touristType: ['School groups', 'Students', 'Teachers'],
    itinerary: {
      '@type': 'Place',
      name: [trip.city, trip.country].filter(Boolean).join(', '),
      address: { '@type': 'PostalAddress', addressCountry: trip.country },
    },
    // Duration in ISO 8601: P8D for eight days.
    ...(trip.durationDays > 0 ? { duration: `P${trip.durationDays}D` } : {}),
    about: { '@type': 'Thing', name: trip.subject },
    provider: { '@id': `${SITE}/#organisation` },
  };
}
