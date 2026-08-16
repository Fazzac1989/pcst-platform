'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchCountryFacts, saveCountryFacts } from '@/lib/admin/country-facts';

const inputCls =
  'border border-line rounded px-2.5 py-1.5 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors disabled:opacity-50';

export type FactsRow = {
  id: number;
  name: string;
  capital: string;
  currency: string;
  languages: string;
  timezone: string;
  population: string;
  best_time: string;
  avg_temp_c: number | null;
  updatedAt: string | null;
};

const FIELDS = [
  ['capital', 'Capital'],
  ['languages', 'Language'],
  ['currency', 'Currency'],
  ['timezone', 'Time zone'],
  ['population', 'Population'],
  ['best_time', 'Best months'],
] as const;

export default function CountryFactsManager({
  rows: initial,
  configured,
}: {
  rows: FactsRow[];
  configured: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const isEmpty = (r: FactsRow) => !r.capital && !r.currency && !r.languages && !r.timezone;
  const missing = rows.filter(isEmpty);

  const patch = (id: number, key: keyof FactsRow, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  async function onFetch(id: number) {
    setBusy(id);
    setError(null);
    setDone(null);
    const res = await fetchCountryFacts(id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    setDone('Facts fetched — review them below, then edit anything that looks off.');
  }

  async function onFetchAllMissing() {
    setBusy('all');
    setError(null);
    setDone(null);
    let ok = 0;
    const failed: string[] = [];
    for (const row of missing) {
      const res = await fetchCountryFacts(row.id);
      if (res.ok) ok++;
      else failed.push(row.name);
    }
    setBusy(null);
    router.refresh();
    setDone(
      `Fetched ${ok} of ${missing.length}.` +
        (failed.length ? ` Skipped (not countries, or failed): ${failed.join(', ')}.` : '')
    );
  }

  async function onSave(row: FactsRow) {
    setBusy(row.id);
    setError(null);
    const res = await saveCountryFacts(row.id, {
      capital: row.capital,
      currency: row.currency,
      languages: row.languages,
      timezone: row.timezone,
      population: row.population,
      best_time: row.best_time,
      avg_temp_c: row.avg_temp_c,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(null);
    setDone('Saved.');
    router.refresh();
  }

  return (
    <div className="mt-12 border-t border-line pt-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <div>
          <h2 className="font-serif text-2xl">Country facts</h2>
          <p className="text-sm text-ink-soft mt-1">
            Shown beside the overview on every trip page. Claude drafts them and the average
            temperature is measured from Open-Meteo records — always review before relying on them.
          </p>
        </div>
        {missing.length > 0 && configured && (
          <button className={smallBtn} disabled={busy !== null} onClick={onFetchAllMissing}>
            {busy === 'all' ? `Fetching ${missing.length}…` : `Fetch all ${missing.length} missing`}
          </button>
        )}
      </div>

      {!configured && (
        <p className="text-sm text-danger mb-4">
          The Claude API key isn&apos;t set here, so facts can only be entered by hand.
        </p>
      )}
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      {done && <p className="text-sm text-teal-deep font-semibold mb-3">{done}</p>}

      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.id} className="border border-line rounded">
            <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
              <span className="font-medium text-sm flex-1 min-w-[140px]">{row.name}</span>
              <span className="text-xs text-ink-soft flex-1 min-w-[200px] truncate">
                {isEmpty(row) ? (
                  <em>No facts yet</em>
                ) : (
                  [row.capital, row.currency, row.avg_temp_c !== null ? `${row.avg_temp_c}°C` : null]
                    .filter(Boolean)
                    .join(' · ')
                )}
              </span>
              <button className={smallBtn} onClick={() => setOpen(open === row.id ? null : row.id)}>
                {open === row.id ? 'Close' : 'Edit'}
              </button>
              {configured && (
                <button className={smallBtn} disabled={busy !== null} onClick={() => onFetch(row.id)}>
                  {busy === row.id ? 'Fetching…' : isEmpty(row) ? 'Fetch' : 'Refetch'}
                </button>
              )}
            </div>

            {open === row.id && (
              <div className="border-t border-line p-4 grid gap-3">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {FIELDS.map(([key, label]) => (
                    <label key={key} className="grid gap-1">
                      <span className={labelCls}>{label}</span>
                      <input
                        className={inputCls}
                        value={row[key]}
                        onChange={(e) => patch(row.id, key, e.target.value)}
                      />
                    </label>
                  ))}
                  <label className="grid gap-1">
                    <span className={labelCls}>Average temp °C</span>
                    <input
                      className={inputCls}
                      type="number"
                      step="0.1"
                      value={row.avg_temp_c ?? ''}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, avg_temp_c: e.target.value === '' ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                    />
                  </label>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    className="bg-teal text-ink font-semibold text-sm px-5 py-2 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
                    disabled={busy !== null}
                    onClick={() => onSave(row)}
                  >
                    {busy === row.id ? 'Saving…' : 'Save facts'}
                  </button>
                  <span className="text-xs text-ink-soft">
                    Leave a field empty to hide that row on the trip page.
                    {row.updatedAt &&
                      ` Last updated ${new Date(row.updatedAt).toLocaleDateString('en-GB')}.`}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
