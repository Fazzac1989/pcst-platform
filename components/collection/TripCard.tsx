'use client';

import Link from 'next/link';
import type { CollectionTrip } from '@/lib/brochure/collection';
import { sizedImage } from '@/lib/brochure/image-size';
import { IconArrowRight, IconBookmark, IconClock, IconGroup, IconPin } from './icons';

type Props = {
  trip: CollectionTrip;
  href: string;
  saved: boolean;
  onToggle: (id: number) => void;
  /** The first row of cards is worth loading eagerly; the rest can wait. */
  priority?: boolean;
};

/**
 * One trip in the collection.
 *
 * The bookmark is a button beside the link rather than inside it: a card-wide
 * anchor with a button in it is a button you cannot reach with a keyboard.
 * A trip with no recorded year group simply does not show one — an invented
 * suitability is worse than a quiet gap.
 */
export default function TripCard({ trip, href, saved, onToggle, priority }: Props) {
  const nights = trip.nights > 0 ? `${trip.days} days / ${trip.nights} nights` : `${trip.days} days`;

  return (
    <li className="sc-card">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="sc-card-img"
          src={sizedImage(trip.image, 'hero') ?? undefined}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
        />
      </Link>

      <div className="sc-card-body">
        {trip.subject && <p className="sc-eyebrow">{trip.subject}</p>}
        <h3>
          <Link href={href} className="sc-card-title">
            {trip.title}
          </Link>
        </h3>

        <p className="sc-facts">
          {trip.place && (
            <span className="sc-fact">
              <IconPin size={16} />
              {trip.place}
            </span>
          )}
          {trip.days > 0 && (
            <span className="sc-fact">
              <IconClock size={16} />
              {nights}
            </span>
          )}
          {trip.ageShort && (
            <span className="sc-fact">
              <IconGroup size={16} />
              {trip.ageShort}
            </span>
          )}
        </p>
      </div>

      <div className="sc-card-foot">
        <Link href={href} className="sc-view">
          View trip
          <IconArrowRight size={17} />
        </Link>
        <button
          type="button"
          className="sc-mark"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${trip.title} from your shortlist` : `Save ${trip.title} to your shortlist`}
          onClick={() => onToggle(trip.tripId)}
        >
          <IconBookmark size={19} filled={saved} />
        </button>
      </div>
    </li>
  );
}
