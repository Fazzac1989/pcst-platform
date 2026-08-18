'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

export type GalleryItem = {
  url: string;
  alt: string;
  caption?: string | null;
  photographer?: string | null;
  licence?: string | null;
  sourceUrl?: string | null;
  focalX?: number;
  focalY?: number;
};

/**
 * Editorial mosaic on desktop, swipeable rail on mobile, with a full-screen
 * lightbox: arrow keys, Escape, swipe, counter and adjacent-image preloading.
 */
export default function TripGallery({ images, tripTitle }: { images: GalleryItem[]; tripTitle: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + count) % count)),
    [count]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    // Stop the page scrolling behind the lightbox.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  if (count === 0) return null;
  const current = open === null ? null : images[open];

  return (
    <>
      <div className={`tgal n${Math.min(count, 5)}`}>
        {images.slice(0, 5).map((img, i) => (
          <button
            key={img.url}
            className="tgal-item"
            onClick={() => setOpen(i)}
            aria-label={`Open image ${i + 1} of ${count}${img.alt ? `: ${img.alt}` : ''}`}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              sizes="(max-width: 720px) 78vw, (max-width: 1100px) 50vw, 33vw"
              style={{
                objectFit: 'cover',
                objectPosition: `${(img.focalX ?? 0.5) * 100}% ${(img.focalY ?? 0.5) * 100}%`,
              }}
            />
            {i === 4 && count > 5 && <span className="tgal-more">+{count - 5} more</span>}
          </button>
        ))}
      </div>

      {current && (
        <div
          className="lbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${tripTitle} photographs`}
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <button className="lbox-close" onClick={() => setOpen(null)} aria-label="Close">
            ✕
          </button>
          {count > 1 && (
            <>
              <button className="lbox-nav prev" onClick={() => go(-1)} aria-label="Previous image">
                ‹
              </button>
              <button className="lbox-nav next" onClick={() => go(1)} aria-label="Next image">
                ›
              </button>
            </>
          )}

          <figure className="lbox-figure">
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt}
              width={current ? 1800 : 0}
              height={1200}
              sizes="90vw"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }}
              priority
            />
            <figcaption>
              <span className="lbox-count">
                {open! + 1} / {count}
              </span>
              {(current.caption || current.alt) && <p>{current.caption || current.alt}</p>}
              {current.photographer && (
                <small>
                  {current.sourceUrl ? (
                    <a href={current.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {current.photographer}
                    </a>
                  ) : (
                    current.photographer
                  )}
                  {current.licence ? ` · ${current.licence}` : ''}
                </small>
              )}
            </figcaption>
          </figure>

          {/* Preload the neighbours so paging feels instant. */}
          {count > 1 && (
            <div style={{ display: 'none' }} aria-hidden="true">
              <Image src={images[(open! + 1) % count].url} alt="" width={40} height={40} />
              <Image src={images[(open! - 1 + count) % count].url} alt="" width={40} height={40} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
