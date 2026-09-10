'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The trips a school has saved, kept on this device.
 *
 * There is no account behind a brochure — a link is the credential — so the
 * shortlist lives in localStorage, namespaced by the collection's slug. Two
 * schools looking at two collections on the same laptop keep separate lists,
 * and nothing about a student is ever stored.
 *
 * Reads are wrapped because a private window, or a browser set to block site
 * data, throws on access rather than returning nothing.
 */

const keyFor = (slug: string) => `pcst.shortlist.${slug}`;

function read(slug: string): number[] {
  try {
    const raw = window.localStorage.getItem(keyFor(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

function write(slug: string, ids: number[]) {
  try {
    window.localStorage.setItem(keyFor(slug), JSON.stringify(ids));
  } catch {
    /* A shortlist that cannot be saved is still usable for this visit. */
  }
}

/** So a bookmark pressed on a card updates the header's count in the same tick. */
const CHANGED = 'pcst:shortlist';

export function useShortlist(slug: string) {
  // Server and first client render must agree, so the list starts empty and is
  // filled once mounted; nothing renders a count until then.
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(read(slug));
    setReady(true);
    const sync = () => setIds(read(slug));
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, [slug]);

  const toggle = useCallback(
    (id: number) => {
      setIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        write(slug, next);
        window.dispatchEvent(new Event(CHANGED));
        return next;
      });
    },
    [slug],
  );

  const remove = useCallback(
    (id: number) => {
      setIds((prev) => {
        const next = prev.filter((x) => x !== id);
        write(slug, next);
        window.dispatchEvent(new Event(CHANGED));
        return next;
      });
    },
    [slug],
  );

  return { ids, ready, has: (id: number) => ids.includes(id), toggle, remove, count: ids.length };
}
