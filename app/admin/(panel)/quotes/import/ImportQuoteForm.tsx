'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { parseQuoteDocument, type QuoteImportResult } from '@/lib/admin/import-actions';
import { saveQuote } from '@/lib/admin/quote-actions';
import { formatMoney } from '@/lib/quotes';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

type Parsed = Extract<QuoteImportResult, { ok: true }>;

export default function ImportQuoteForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [markup, setMarkup] = useState(20);
  const [busy, setBusy] = useState<'read' | 'create' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Parsed | null>(null);

  async function onRead(e: React.FormEvent) {
    e.preventDefault();
    setBusy('read');
    setError(null);
    setResult(null);
    const data = new FormData();
    if (file) data.set('file', file);
    if (text.trim()) data.set('text', text);
    const res = await parseQuoteDocument(data);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
  }

  async function onCreate() {
    if (!result) return;
    setBusy('create');
    setError(null);
    const { draft } = result;

    const saved = await saveQuote({
      title: draft.title || 'Untitled quote',
      tripId: null,
      schoolName: draft.school_name,
      schoolLogo: null,
      teacherName: draft.teacher_name,
      teacherEmail: draft.teacher_email,
      travelDates: draft.travel_dates,
      validity: null,
      pupils: draft.pupils || null,
      staff: draft.staff || null,
      notes: draft.notes,
      currency: draft.currency || 'AED',
      defaultMarkupPct: markup,
      itinerary: draft.itinerary,
      images: [],
      terms: draft.terms,
      lines: draft.lines.map((l) => ({
        description: l.description,
        qty: l.qty || 1,
        unitCost: l.unit_cost,
        markupPct: markup,
      })),
      status: 'draft',
    });
    if (!saved.ok) {
      setError(saved.error);
      setBusy(null);
      return;
    }
    router.push(`/admin/quotes/${saved.id}`);
    router.refresh();
  }

  const cur = result?.draft.currency || 'AED';
  const cost = result?.draft.lines.reduce((s, l) => s + (l.qty || 1) * l.unit_cost, 0) ?? 0;
  const sell = cost * (1 + markup / 100);
  const pupils = result?.draft.pupils ?? 0;

  return (
    <div className="max-w-3xl grid gap-6">
      <div>
        <h1 className="font-serif text-3xl">Import a quote from a document</h1>
        <p className="text-sm text-ink-soft mt-2">
          Upload a supplier costing sheet or a draft quotation and Claude will read the costings,
          itinerary and client details into a draft quote. Costs come through as supplier cost
          before markup — set your markup below and check the figures before publishing.
        </p>
      </div>

      {!configured && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          The Claude API key isn&apos;t set on this environment, so importing is unavailable.
        </p>
      )}

      <form onSubmit={onRead} className="border border-line rounded p-6 grid gap-4">
        <label className="grid gap-1.5">
          <span className={labelCls}>Costing document</span>
          <input
            type="file"
            accept=".docx,.txt,.md,.rtf"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-xs text-ink-soft">
            Word (.docx), plain text or Markdown. For a spreadsheet, copy the cells and paste below.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className={labelCls}>…or paste the costings</span>
          <textarea
            rows={6}
            className={inputCls}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the supplier costs and itinerary here…"
          />
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
            disabled={!configured || busy !== null || (!file && !text.trim())}
          >
            {busy === 'read' ? 'Reading the document…' : 'Read document'}
          </button>
          <Link href="/admin/quotes" className={smallBtn}>
            Cancel
          </Link>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {result && (
        <div className="border border-line rounded p-6 grid gap-5">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <span className={labelCls}>What Claude found</span>
            <span className="text-xs text-ink-soft">Nothing is saved until you confirm.</span>
          </div>

          <div>
            <h2 className="font-serif text-2xl">{result.draft.title || '(no title found)'}</h2>
            <p className="text-sm text-ink-soft mt-1">
              {[
                result.draft.school_name,
                result.draft.teacher_name,
                result.draft.travel_dates,
                pupils ? `${pupils} pupils` : null,
                result.draft.staff ? `${result.draft.staff} staff` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'No client details found'}
            </p>
          </div>

          {result.notes.length > 0 && (
            <ul className="text-sm text-ink-soft border border-line rounded p-4 grid gap-1">
              {result.notes.map((n, i) => (
                <li key={i}>· {n}</li>
              ))}
            </ul>
          )}

          {result.draft.lines.length > 0 && (
            <div className="grid gap-2">
              <span className={labelCls}>Costings ({result.draft.lines.length} lines)</span>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line">
                      <th className="py-2 pr-3 font-semibold">Item</th>
                      <th className="py-2 pr-3 font-semibold text-right">Qty</th>
                      <th className="py-2 pr-3 font-semibold text-right">Unit cost</th>
                      <th className="py-2 font-semibold text-right">Line cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.draft.lines.map((l, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3">{l.description}</td>
                        <td className="py-2 pr-3 text-right">{l.qty}</td>
                        <td className={`py-2 pr-3 text-right ${l.unit_cost ? '' : 'text-danger'}`}>
                          {l.unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right">
                          {((l.qty || 1) * l.unit_cost).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border border-line rounded p-4 grid gap-3 bg-ink/[.02]">
            <label className="flex items-center gap-3 flex-wrap">
              <span className={labelCls}>Markup on every line</span>
              <input
                type="number"
                step="0.5"
                min={0}
                className={`${inputCls} w-24`}
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
              />
              <span className="text-sm text-ink-soft">%</span>
            </label>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-soft">Supplier cost</div>
                <div className="font-semibold">{formatMoney(cur, cost)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-soft">Sell at {markup}%</div>
                <div className="font-semibold text-teal-deep">{formatMoney(cur, sell)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-soft">Per student</div>
                <div className="font-semibold">
                  {pupils ? formatMoney(cur, sell / pupils) : '— set pupils'}
                </div>
              </div>
            </div>
          </div>

          {result.draft.itinerary.length > 0 && (
            <div className="grid gap-2">
              <span className={labelCls}>Itinerary ({result.draft.itinerary.length} days)</span>
              {result.draft.itinerary.map((d, i) => (
                <div key={i} className="border-b border-line last:border-0 pb-2">
                  <div className="text-sm font-semibold">
                    <span className="text-teal-deep">{d.label}</span> — {d.title}
                  </div>
                  <p className="text-sm text-ink-soft mt-0.5">{d.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-center flex-wrap border-t border-line pt-4">
            <button
              onClick={onCreate}
              disabled={busy !== null}
              className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
            >
              {busy === 'create' ? 'Creating draft…' : 'Create draft quote'}
            </button>
            <button onClick={() => setResult(null)} className={smallBtn} disabled={busy !== null}>
              Discard
            </button>
            <span className="text-xs text-ink-soft">Opens in the quote builder for final checks.</span>
          </div>
        </div>
      )}
    </div>
  );
}
