'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateCityPageContent, generateCountryPageContent } from '@/lib/admin/page-content';

const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors disabled:opacity-50';

export type ContentRow = {
  id: number;
  name: string;
  slug: string;
  hasContent: boolean;
  /** Single-city cities its published trips visit, with their own content state. */
  cities: { name: string; slug: string; hasContent: boolean }[];
};

/**
 * The page-content counterpart to the facts panel above it: one button drafts
 * the editorial sections of the country page, one per city drafts that city's
 * page, and "everything missing" walks the lot. Content is written straight to
 * the row, so a regenerate replaces what is there — the pages re-render on the
 * next visit either way.
 */
export default function PageContentManager({
  rows,
  configured,
}: {
  rows: ContentRow[];
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const missing = rows.flatMap((r) => [
    ...(!r.hasContent ? [{ key: `country-${r.id}`, label: r.name, run: () => generateCountryPageContent(r.id) }] : []),
    ...r.cities
      .filter((c) => !c.hasContent)
      .map((c) => ({
        key: `city-${r.id}-${c.slug}`,
        label: `${c.name} (${r.name})`,
        run: () => generateCityPageContent(r.id, c.name),
      })),
  ]);

  async function runOne(key: string, label: string, run: () => Promise<{ ok: boolean } & any>) {
    setBusy(key);
    setError(null);
    setDone(null);
    const res = await run();
    setBusy(null);
    if (!res.ok) {
      setError(`${label}: ${res.error}`);
      return;
    }
    router.refresh();
    setDone(`${label} drafted — read it on the live page and edit the row if anything is off.`);
  }

  async function runAllMissing() {
    setBusy('all');
    setError(null);
    setDone(null);
    let ok = 0;
    const failed: string[] = [];
    for (const item of missing) {
      const res = await item.run();
      if (res.ok) ok++;
      else failed.push(item.label);
    }
    setBusy(null);
    router.refresh();
    setDone(`Drafted ${ok} of ${missing.length}.` + (failed.length ? ` Failed: ${failed.join(', ')}.` : ''));
  }

  return (
    <div className="mt-12 border-t border-line pt-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <div>
          <h2 className="font-serif text-2xl">Page content</h2>
          <p className="text-sm text-ink-soft mt-1">
            The editorial sections of each country page and its city pages — why here, curriculum
            links, when to travel, useful phrases. Claude drafts them from the trips you sell there;
            a page appears once the country has a published trip. Always read before relying on it.
          </p>
        </div>
        {missing.length > 0 && configured && (
          <button className={smallBtn} disabled={busy !== null} onClick={runAllMissing}>
            {busy === 'all' ? `Drafting ${missing.length}…` : `Draft all ${missing.length} missing`}
          </button>
        )}
      </div>

      {!configured && (
        <p className="text-sm text-danger mb-4">
          The Claude API key isn&apos;t set here, so page content can only be written in the database.
        </p>
      )}
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      {done && <p className="text-sm text-teal-deep font-semibold mb-3">{done}</p>}

      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.id} className="border border-line rounded px-4 py-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-sm flex-1 min-w-[140px]">{row.name}</span>
              <span className="text-xs text-ink-soft">
                {row.hasContent ? 'Country page written' : <em>No country content yet</em>}
              </span>
              {configured && (
                <button
                  className={smallBtn}
                  disabled={busy !== null}
                  onClick={() =>
                    runOne(`country-${row.id}`, row.name, () => generateCountryPageContent(row.id))
                  }
                >
                  {busy === `country-${row.id}` ? 'Drafting…' : row.hasContent ? 'Redraft' : 'Draft'}
                </button>
              )}
            </div>
            {row.cities.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-line/60">
                <span className="text-xs text-ink-soft mr-1">Cities:</span>
                {row.cities.map((c) => (
                  <span key={c.slug} className="inline-flex items-center gap-1.5 text-xs border border-line rounded px-2 py-1">
                    {c.name}
                    <span className={c.hasContent ? 'text-teal-deep' : 'text-ink-soft'}>
                      {c.hasContent ? '✓' : '—'}
                    </span>
                    {configured && (
                      <button
                        className="font-semibold text-teal-deep hover:underline disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() =>
                          runOne(`city-${row.id}-${c.slug}`, c.name, () =>
                            generateCityPageContent(row.id, c.name)
                          )
                        }
                      >
                        {busy === `city-${row.id}-${c.slug}` ? '…' : c.hasContent ? 'redraft' : 'draft'}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
