'use client';

import Link from 'next/link';
import { IconBookmark } from './icons';
import { useShortlist } from './useShortlist';

type Props = {
  slug: string;
  schoolName: string;
  clientLogo: string | null;
  /** Which nav item is the page you are on. */
  current: 'collection' | 'support' | 'shortlist';
  supportHref: string;
};

/**
 * The navy bar every collection page wears: our lockup on the left, the school
 * on the right, and the three places a coordinator goes in between.
 *
 * The school's identity comes from the brochure record, never from a constant —
 * GEMS Modern Academy is one collection among many.
 */
export default function BrochureHeader({
  slug,
  schoolName,
  clientLogo,
  current,
  supportHref,
}: Props) {
  const { count, ready } = useShortlist(slug);
  const base = `/brochures/${encodeURIComponent(slug)}`;

  return (
    <>
      <header className="sc-header">
        <Link href={base} className="sc-brand" aria-label="Premium Choice School Trips">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-white.png" alt="Premium Choice School Trips, powered by Premium Choice Travel" />
        </Link>

        <nav className="sc-nav" aria-label="Collection">
          <Link href={base} aria-current={current === 'collection' ? 'page' : undefined}>
            Your collection
          </Link>
          <Link href={supportHref} aria-current={current === 'support' ? 'page' : undefined}>
            School support
          </Link>
          <span className="sc-nav-rule" aria-hidden="true" />
          <Link
            href={`${base}/shortlist`}
            aria-current={current === 'shortlist' ? 'page' : undefined}
          >
            <IconBookmark size={17} filled={ready && count > 0} />
            Your shortlist
            {ready && count > 0 && (
              <span className="sc-count" aria-label={`${count} saved`}>
                {count}
              </span>
            )}
          </Link>
        </nav>

        {clientLogo && (
          <div className="sc-school">
            <p className="sc-school-txt">
              Prepared for
              <b>{schoolName}</b>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clientLogo} alt={`${schoolName} crest`} />
          </div>
        )}
      </header>

      {/* Narrow screens get the school below the bar rather than three marks squeezed together. */}
      {clientLogo && (
        <div className="sc-school-mobile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clientLogo} alt="" />
          <span>
            Prepared for <b>{schoolName}</b>
          </span>
        </div>
      )}
    </>
  );
}
