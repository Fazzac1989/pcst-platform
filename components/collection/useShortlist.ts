'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * The trips a school has saved, kept on this device.
 *
 * There is no account behind a brochure — a link is the credential — so the
 * shortlist lives in localStorage, namespaced by the collection's slug. Two
 * schools looking at two collections on the same laptop keep separate lists,
 * and nothing about a student is ever stored.
 *
 * It is a small external store rather than component state. The first version
 * toggled inside a setState updater and wrote to localStorage from in there:
 * an updater that is neither pure nor idempotent, so when React replayed the
 * queue the second run saw the trip already added and took it straight back
 * out. Saving the first trip worked and every one after it silently did
 * nothing. useSyncExternalStore is the primitive for state that lives outside
 * React, and it keeps the header's count and the cards in step for free.
 */

const keyFor = (slug: string) => `pcst.shortlist.${slug}`;
const PREFIX = 'pcst.shortlist.';

/** A stable empty array: a new one each read would spin useSyncExternalStore. */
const EMPTY: readonly number[] = Object.freeze([]);

const cache = new Map<string, readonly number[]>();
const listeners = new Set<() => void>();

function readFromStorage(slug: string): readonly number[] {
  try {
    const raw = window.localStorage.getItem(keyFor(slug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter((n) => Number.isInteger(n)) as number[];
    return ids.length ? ids : EMPTY;
  } catch {
    // A private window, or a browser set to block site data, throws on access.
    return EMPTY;
  }
}

function snapshot(slug: string): readonly number[] {
  if (!cache.has(slug)) cache.set(slug, readFromStorage(slug));
  return cache.get(slug)!;
}

const emit = () => listeners.forEach((l) => l());

function commit(slug: string, ids: readonly number[]) {
  cache.set(slug, ids.length ? ids : EMPTY);
  try {
    window.localStorage.setItem(keyFor(slug), JSON.stringify(ids));
  } catch {
    // A shortlist that cannot be saved is still usable for this visit.
  }
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab on the same collection.
  const onStorage = (e: StorageEvent) => {
    if (e.key && !e.key.startsWith(PREFIX)) return;
    cache.clear();
    emit();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useShortlist(slug: string) {
  const ids = useSyncExternalStore(
    subscribe,
    () => snapshot(slug),
    // The server has no browser storage, so it renders an empty shortlist and
    // the first client render must agree with it.
    () => EMPTY,
  );
  // False until hydrated, so no count flashes before the real one is known.
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const toggle = useCallback(
    (id: number) => {
      const current = snapshot(slug);
      commit(slug, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },
    [slug],
  );

  const remove = useCallback(
    (id: number) => commit(slug, snapshot(slug).filter((x) => x !== id)),
    [slug],
  );

  return {
    ids: ids as number[],
    ready,
    has: (id: number) => ids.includes(id),
    toggle,
    remove,
    count: ids.length,
  };
}
