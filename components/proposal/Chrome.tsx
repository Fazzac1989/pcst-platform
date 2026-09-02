'use client';

import { useEffect, useRef } from 'react';

/**
 * The sticky bar, the print button and the terms accordion — the three pieces
 * that need a browser.
 */

export function TopBar({ pdfHref }: { pdfHref: string }) {
  /**
   * Printing is the primary path because it gives the reader their own dialogue
   * and their own paper size. Inside an iframe, or where the browser blocks it,
   * the server-rendered PDF is the fallback rather than a dead button.
   */
  const print = () => {
    try {
      if (window.self !== window.top) throw new Error('framed');
      window.print();
    } catch {
      window.location.href = pdfHref;
    }
  };

  return (
    <button className="btn print" type="button" onClick={print}>
      Print / save as PDF
    </button>
  );
}

/** Terms open one at a time, or all at once before printing. */
export function TermsToggle() {
  const openAll = (open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>('.terms details').forEach((d) => {
      d.open = open;
    });
  };

  useEffect(() => {
    // Print with everything expanded: a collapsed <details> prints as a heading
    // and nothing else, which would silently drop the booking conditions.
    const before = () => {
      document.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => {
        d.dataset.wasOpen = String(d.open);
        d.open = true;
      });
    };
    const after = () => {
      document.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => {
        if (d.dataset.wasOpen === 'false') d.open = false;
        delete d.dataset.wasOpen;
      });
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return (
    <div className="toggle-all">
      <button type="button" onClick={() => openAll(true)}>
        Open all
      </button>
      <button type="button" onClick={() => openAll(false)}>
        Close all
      </button>
    </div>
  );
}

/**
 * Snowfall behind the hero.
 *
 * Off entirely for anyone who has asked for reduced motion, paused when the
 * hero is off-screen so it costs nothing while the rest of the page is read,
 * and never drawn in print.
 */
export function Snowfall() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let flakes: { x: number; y: number; r: number; d: number }[] = [];

    const size = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with area so a phone does not draw a desktop's worth.
      const count = Math.round((width * height) / 14000);
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.2,
        d: 0.4 + Math.random() * 1.1,
      }));
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (const f of flakes) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        f.y += f.d;
        f.x += Math.sin(f.y / 60) * 0.35;
        if (f.y > height) {
          f.y = -4;
          f.x = Math.random() * width;
        }
      }
      if (running) raf = requestAnimationFrame(draw);
    };

    size();
    draw();

    const onResize = () => size();
    window.addEventListener('resize', onResize);

    const io = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, []);

  return <canvas id="snow" ref={ref} aria-hidden="true" />;
}
