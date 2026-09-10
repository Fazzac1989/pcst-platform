'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Brochure } from '@/lib/brochure/schema';
import type { CollectionTrip } from '@/lib/brochure/collection';
import { contactHref } from '@/lib/brochure/collection-contact';
import { sizedImage } from '@/lib/brochure/image-size';
import BrochureHeader from './BrochureHeader';
import { useShortlist } from './useShortlist';
import { IconArrowRight } from './icons';

type Props = {
  brochure: Brochure;
  trips: CollectionTrip[];
  schoolName: string;
  supportHref: string;
};

const MAX_COMPARE = 3;
const NOT_SPECIFIED = 'Not specified';

/**
 * What a school has saved, and a way to put three of them side by side.
 *
 * The shortlist lives in this browser, so the whole collection is rendered on
 * the server and narrowed here — which also means an unsaved trip is never
 * fetched twice. Nothing is compared that the record does not actually say:
 * an unknown reads as "Not specified" rather than being quietly filled in, and
 * nothing is scored or ranked.
 */
export default function ShortlistView({ brochure, trips, schoolName, supportHref }: Props) {
  const shortlist = useShortlist(brochure.slug);
  const [picked, setPicked] = useState<number[]>([]);

  const saved = useMemo(
    () => shortlist.ids.map((id) => trips.find((t) => t.tripId === id)).filter(Boolean) as CollectionTrip[],
    [shortlist.ids, trips],
  );

  const comparing = useMemo(
    () => picked.map((id) => saved.find((t) => t.tripId === id)).filter(Boolean) as CollectionTrip[],
    [picked, saved],
  );

  const togglePick = (id: number) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id],
    );

  const base = `/brochures/${encodeURIComponent(brochure.slug)}`;

  return (
    <div className="sc">
      <BrochureHeader
        slug={brochure.slug}
        schoolName={schoolName}
        clientLogo={brochure.clientLogo}
        current="shortlist"
        supportHref={supportHref}
      />

      <main className="sc-main sc-wrap">
        <div className="sc-sl-head">
          <div>
            <p className="sc-eyebrow">{schoolName}</p>
            <h1>Your shortlist</h1>
          </div>
          {shortlist.ready && saved.length > 0 && (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              Saved on this device · {saved.length} trip{saved.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {/* Nothing renders until the browser has been read, so the empty state
            never flashes in front of a school that has saved six trips. */}
        {!shortlist.ready ? (
          <p style={{ marginTop: 32, color: 'var(--text-2)' }}>Loading your shortlist…</p>
        ) : saved.length === 0 ? (
          <div className="sc-empty" style={{ marginTop: 32 }}>
            <h3>Start your school’s shortlist</h3>
            <p>
              Save the trips you want to talk about and they will gather here, on this device,
              ready to compare.
            </p>
            <Link className="sc-cta" href={base}>
              Explore your trips
              <IconArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <>
            <ul className="sc-sl-list">
              {saved.map((t) => (
                <li className="sc-sl-item" key={t.tripId}>
                  <input
                    className="sc-sl-pick"
                    type="checkbox"
                    checked={picked.includes(t.tripId)}
                    disabled={!picked.includes(t.tripId) && picked.length >= MAX_COMPARE}
                    onChange={() => togglePick(t.tripId)}
                    aria-label={`Compare ${t.title}`}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sizedImage(t.image, 'micro') ?? undefined} alt="" />
                  <div>
                    <Link href={`${base}/trips/${t.tripId}`} className="sc-sl-t" style={{ textDecoration: 'none' }}>
                      {t.title}
                    </Link>
                    <p className="sc-sl-m">
                      {[t.place, t.days ? `${t.days} days` : null, t.ageShort].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="sc-sl-actions">
                    <Link href={`${base}/trips/${t.tripId}`} className="sc-btn sc-btn--ghost">
                      View trip
                    </Link>
                    <button
                      type="button"
                      className="sc-remove"
                      onClick={() => shortlist.remove(t.tripId)}
                      aria-label={`Remove ${t.title} from your shortlist`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="sc-sl-bar">
              <p>
                {picked.length === 0
                  ? `Tick up to ${MAX_COMPARE} trips to compare them side by side.`
                  : `Comparing ${picked.length} of ${MAX_COMPARE}.`}
              </p>
              {picked.length > 0 && (
                <button type="button" className="sc-linkbtn" onClick={() => setPicked([])}>
                  Clear comparison
                </button>
              )}
              <a
                className="sc-btn"
                style={{ marginLeft: 'auto' }}
                href={contactHref({
                  to: brochure.design.contactEmail,
                  schoolName,
                  brochureTitle: brochure.title,
                  trips: saved.map((t) => t.title),
                })}
              >
                Discuss your shortlist
              </a>
            </div>

            {comparing.length > 0 && (
              <section className="sc-compare" aria-label="Trip comparison">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="sr-only">Detail</span>
                      </th>
                      {comparing.map((t) => (
                        <th scope="col" key={t.tripId}>
                          {t.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Destination</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>{t.place || NOT_SPECIFIED}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Subject</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>{t.subject ?? NOT_SPECIFIED}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Suited to</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>{t.ageGroup ?? NOT_SPECIFIED}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Duration</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>
                          {t.days > 0
                            ? `${t.days} days${t.nights > 0 ? ` / ${t.nights} nights` : ''}`
                            : NOT_SPECIFIED}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Learning outcomes</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>
                          {t.educationalValues.length ? (
                            <ul>
                              {t.educationalValues.map((v, i) => (
                                <li key={i}>{v.title}</li>
                              ))}
                            </ul>
                          ) : (
                            NOT_SPECIFIED
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">Key inclusions</th>
                      {comparing.map((t) => (
                        <td key={t.tripId}>
                          {t.inclusions.length ? (
                            <ul>
                              {t.inclusions.slice(0, 6).map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          ) : (
                            NOT_SPECIFIED
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
