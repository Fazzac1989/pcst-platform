'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BrochurePageView from './BrochurePageView';
import { PAGE_LABELS, type Brochure, type BrochurePage } from '@/lib/brochure/schema';
import type { BrochureTrip } from '@/lib/brochure/data';

/**
 * The page-turn.
 *
 * Built rather than installed: every maintained-looking flipbook library was
 * last published in 2022, and the ones that exist drive the DOM directly, which
 * leaves no clean route to keyboard control, reduced-motion or an accessible
 * fallback. This is a few hundred lines of CSS 3D instead, and it owes nobody a
 * dependency upgrade.
 *
 * Desktop shows a two-page spread and turns a leaf around the spine. Below the
 * breakpoint it becomes one page at a time with a horizontal swipe, because a
 * magazine spread shrunk onto a phone is unreadable.
 */

type Props = {
  brochure: Brochure;
  pages: BrochurePage[];
  trips: Record<number, BrochureTrip>;
  brochureQrSvg: string | null;
};

const TURN_MS = 620;

export default function Flipbook({ brochure, pages, trips, brochureQrSvg }: Props) {
  // Index of the left-hand leaf of the current spread. 0 = cover alone.
  const [index, setIndex] = useState(0);
  const [turning, setTurning] = useState<'next' | 'prev' | null>(null);
  const [spread, setSpread] = useState(true);
  const [contents, setContents] = useState(false);
  const [thumbs, setThumbs] = useState(false);
  const [full, setFull] = useState(false);
  const [shared, setShared] = useState(false);
  const [reduced, setReduced] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  /* Viewport: a spread needs real width, and a phone in portrait never gets one.
     A media query rather than a resize listener, because mobile browsers fire
     resize every time the address bar slides away. */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setSpread(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /* Leaves: on desktop the cover stands alone, then pages pair up. */
  const leaves = useMemo(() => {
    if (!spread) return pages.map((p) => [p]);
    const out: BrochurePage[][] = [[pages[0]]];
    for (let i = 1; i < pages.length; i += 2) {
      out.push(pages.slice(i, i + 2));
    }
    return out;
  }, [pages, spread]);

  const total = leaves.length;
  const atStart = index === 0;
  const atEnd = index >= total - 1;

  const go = useCallback(
    (dir: 'next' | 'prev') => {
      if (turning) return;
      if (dir === 'next' && atEnd) return;
      if (dir === 'prev' && atStart) return;

      if (reduced) {
        setIndex((i) => i + (dir === 'next' ? 1 : -1));
        return;
      }
      setTurning(dir);
      window.setTimeout(() => {
        setIndex((i) => i + (dir === 'next' ? 1 : -1));
        setTurning(null);
      }, TURN_MS);
    },
    [turning, atEnd, atStart, reduced]
  );

  const jump = useCallback(
    (pageIndex: number) => {
      const leaf = spread ? (pageIndex === 0 ? 0 : Math.floor((pageIndex - 1) / 2) + 1) : pageIndex;
      setIndex(Math.max(0, Math.min(leaf, total - 1)));
      setContents(false);
      setThumbs(false);
    },
    [spread, total]
  );

  /* Keyboard: arrows turn, Home/End jump, Escape leaves full screen. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go('next');
      else if (e.key === 'ArrowLeft') go('prev');
      else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(total - 1);
      else if (e.key === 'Escape' && full) exitFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, total, full]);

  /* Full screen, with the browser API where it exists. */
  const enterFull = async () => {
    try {
      await shellRef.current?.requestFullscreen?.();
    } catch {
      /* the CSS fallback below still applies */
    }
    setFull(true);
  };
  const exitFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    setFull(false);
  };
  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* Swipe, on the page rather than the controls. */
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    // Ignore mostly-vertical drags so page scrolling still works.
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    go(dx < 0 ? 'next' : 'prev');
  };

  /* Analytics: one event per leaf reached, and one per trip clicked. */
  const seen = useRef(new Set<number>());
  useEffect(() => {
    if (seen.current.has(index)) return;
    seen.current.add(index);
    void fetch('/api/brochure-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brochureId: brochure.id, event: 'page', pageIndex: index }),
      keepalive: true,
    }).catch(() => {});
  }, [index, brochure.id]);

  const onTripClick = (tripId: number) => {
    void fetch('/api/brochure-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brochureId: brochure.id, event: 'trip_click', tripId }),
      keepalive: true,
    }).catch(() => {});
  };

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: brochure.title, url });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  /* Chapters, derived from the pages themselves. */
  const chapters = useMemo(
    () =>
      pages
        .map((p, i) => ({ page: p, i }))
        // The cover and the contents page itself are not entries in the contents.
        .filter(
          ({ page: p }) =>
            p.pageType === 'subjectDivider' ||
            p.pageType === 'destinationDivider' ||
            p.pageType === 'brandIntroduction' ||
            p.pageType === 'tripHero' ||
            p.pageType === 'safety' ||
            p.pageType === 'contact'
        )
        .map(({ page: p, i }) => ({
          index: i,
          label:
            p.content?.headline ||
            (p.tripId ? trips[p.tripId]?.title : null) ||
            PAGE_LABELS[p.pageType],
          kind: p.pageType,
        })),
    [pages, trips]
  );

  const current = leaves[index] ?? [];
  const incoming = leaves[index + (turning === 'next' ? 1 : -1)] ?? [];

  const renderPage = (page: BrochurePage | undefined, n: number) =>
    page ? (
      <BrochurePageView
        page={page}
        brochure={brochure}
        trips={trips}
        brochureQrSvg={brochureQrSvg}
        pageNumber={n}
        onTripClick={onTripClick}
        chapters={chapters}
        onJump={jump}
      />
    ) : (
      // The leaf facing the cover. Carries the mark rather than sitting blank.
      <div className="bp bp-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-white.png" alt="" />
      </div>
    );

  const leftNumber = spread ? (index === 0 ? 1 : (index - 1) * 2 + 2) : index + 1;

  return (
    <div
      ref={shellRef}
      className={`fb ${full ? 'fb--full' : ''} ${spread ? 'fb--spread' : 'fb--single'} ${
        reduced ? 'fb--still' : ''
      }`}
    >
      {/* Controls sit outside the artwork, never on top of it. */}
      <div className="fb-bar">
        <div className="fb-bar-left">
          <button onClick={() => setContents((v) => !v)} aria-expanded={contents}>
            Contents
          </button>
          <button onClick={() => setThumbs((v) => !v)} aria-expanded={thumbs}>
            All pages
          </button>
        </div>

        <div className="fb-bar-mid" aria-live="polite">
          {spread && index > 0 ? `${leftNumber} — ${Math.min(leftNumber + 1, pages.length)}` : leftNumber}
          <span className="fb-of"> of {pages.length}</span>
        </div>

        <div className="fb-bar-right">
          <button onClick={share}>{shared ? 'Link copied' : 'Share'}</button>
          <button onClick={full ? exitFull : enterFull}>{full ? 'Exit full screen' : 'Full screen'}</button>
        </div>
      </div>

      <div className="fb-stage">
        <button
          className="fb-nav fb-nav--prev"
          onClick={() => go('prev')}
          disabled={atStart}
          aria-label="Previous page"
        >
          ‹
        </button>

        <div className="fb-book" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* The spread underneath: where the turn lands. */}
          <div className="fb-leaf fb-leaf--under">
            {spread ? (
              <>
                <div className="fb-side fb-side--left">
                  {renderPage(turning === 'prev' ? incoming[0] : current[0], leftNumber)}
                </div>
                <div className="fb-side fb-side--right">
                  {renderPage(turning === 'next' ? incoming[0] : current[1], leftNumber + 1)}
                </div>
              </>
            ) : (
              <div className="fb-side">{renderPage(current[0], leftNumber)}</div>
            )}
          </div>

          {/* The leaf in motion. Only ever one, only while turning. */}
          {turning && spread && (
            <div className={`fb-turner fb-turner--${turning}`} key={`${index}-${turning}`}>
              <div className="fb-face fb-face--front">
                {renderPage(turning === 'next' ? current[1] : incoming[1], 0)}
              </div>
              <div className="fb-face fb-face--back">
                {renderPage(turning === 'next' ? incoming[0] : current[0], 0)}
              </div>
            </div>
          )}

          {turning && !spread && (
            <div className={`fb-slide fb-slide--${turning}`} key={`${index}-${turning}`}>
              <div className="fb-side">{renderPage(incoming[0], 0)}</div>
            </div>
          )}

          {/* Corner targets, the way you'd actually pick up a page. */}
          {!turning && (
            <>
              {!atEnd && (
                <button className="fb-corner fb-corner--next" onClick={() => go('next')} aria-label="Next page" />
              )}
              {!atStart && (
                <button className="fb-corner fb-corner--prev" onClick={() => go('prev')} aria-label="Previous page" />
              )}
            </>
          )}
        </div>

        <button
          className="fb-nav fb-nav--next"
          onClick={() => go('next')}
          disabled={atEnd}
          aria-label="Next page"
        >
          ›
        </button>
      </div>

      {contents && (
        <nav className="fb-panel" aria-label="Contents">
          <p className="fb-panel-title">Contents</p>
          <ul>
            {chapters.map((ch) => (
              <li key={ch.index}>
                <button onClick={() => jump(ch.index)} className={ch.kind.includes('Divider') ? 'is-section' : ''}>
                  <span>{ch.label}</span>
                  <em>{ch.index + 1}</em>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {thumbs && (
        <div className="fb-panel fb-panel--thumbs">
          <p className="fb-panel-title">All pages</p>
          <div className="fb-thumbs">
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => jump(i)} aria-label={`Page ${i + 1}`}>
                <span className="fb-thumb">
                  <span className="fb-thumb-inner">
                    <BrochurePageView
                      page={p}
                      brochure={brochure}
                      trips={trips}
                      brochureQrSvg={brochureQrSvg}
                      pageNumber={i + 1}
                    />
                  </span>
                </span>
                <em>{i + 1}</em>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
