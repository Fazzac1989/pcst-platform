'use client';

import { useEffect } from 'react';

/**
 * Fades homepage sections in as they scroll into view.
 *
 * The classes are added from here rather than the markup, so a browser without
 * JavaScript — or a reader who has asked for reduced motion — simply sees the
 * page as it always was. One observer, unobserved after first reveal, so there
 * is no ongoing scroll work.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sections = document.querySelectorAll<HTMLElement>('main.site > section');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('sr-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    sections.forEach((s) => {
      // Anything already on screen at load stays put; only what scrolls in animates.
      if (s.getBoundingClientRect().top > window.innerHeight * 0.9) {
        s.classList.add('sr-item');
        observer.observe(s);
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
