/**
 * "Discuss this trip" — the existing contact route, prefilled.
 *
 * There is no enquiry backend behind a brochure; the deck's closing page offers
 * a phone number and an address, and that is the real workflow. So this opens
 * the reader's mail client with the school and the trip already written in,
 * rather than showing a form that would have to pretend it had sent something.
 * A brochure that carries its own prepared-by address uses that instead.
 */

const HOUSE_EMAIL = 'info@premiumchoicetravel.com';

export function contactHref(opts: {
  to?: string | null;
  schoolName: string;
  brochureTitle: string;
  /** One trip, or the several on a shortlist. */
  trips?: string[];
}): string {
  const to = (opts.to ?? '').trim() || HOUSE_EMAIL;
  const many = (opts.trips ?? []).length > 1;

  const subject = many
    ? `${opts.schoolName}: shortlist enquiry`
    : opts.trips?.[0]
      ? `${opts.schoolName}: ${opts.trips[0]}`
      : `${opts.schoolName}: ${opts.brochureTitle}`;

  const lines = [
    `Hello Premium Choice,`,
    ``,
    many
      ? `We would like to talk about these trips from our collection:`
      : `We would like to talk about this trip from our collection:`,
    ...(opts.trips ?? []).map((t) => `  · ${t}`),
    ``,
    `School: ${opts.schoolName}`,
    `Collection: ${opts.brochureTitle}`,
    ``,
    `Preferred dates:`,
    `Group size:`,
    ``,
    `Thank you,`,
  ];

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
