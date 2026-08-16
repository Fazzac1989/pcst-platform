'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addCountry, addSubject, saveTrip } from '@/lib/admin/actions';
import { parseTripDocument, type ImportResult } from '@/lib/admin/import-actions';

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

type Parsed = Extract<ImportResult, { ok: true }>;

export default function ImportForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
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
    const res = await parseTripDocument(data);
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

    // Create the subject / country first if the document named a new one.
    let subjectId = result.subjectMatch.id;
    if (!subjectId && result.subjectMatch.name.trim()) {
      const r = await addSubject(result.subjectMatch.name.trim());
      if (!r.ok) {
        setError(`Could not create subject: ${r.error}`);
        setBusy(null);
        return;
      }
      subjectId = r.id ?? null;
    }
    let countryId = result.countryMatch.id;
    if (!countryId && result.countryMatch.name.trim()) {
      const r = await addCountry(result.countryMatch.name.trim(), null);
      if (!r.ok) {
        setError(`Could not create country: ${r.error}`);
        setBusy(null);
        return;
      }
      countryId = r.id ?? null;
    }

    const saved = await saveTrip({
      slug: slugify(draft.title) || `trip-${Date.now()}`,
      title: draft.title,
      subject_id: subjectId,
      country_id: countryId,
      city: draft.city,
      duration_days: draft.duration_days || 1,
      duration_nights: draft.duration_nights || 0,
      departs: draft.departs || 'Dubai',
      hero_image: null,
      hero_alt: '',
      gallery: [],
      overview: draft.overview,
      includes: draft.includes,
      itinerary: draft.itinerary,
      status: 'draft',
      featured: false,
    });
    if (!saved.ok) {
      setError(saved.error);
      setBusy(null);
      return;
    }
    router.push(`/admin/trips/${saved.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-3xl grid gap-6">
      <div>
        <h1 className="font-serif text-3xl">Import a trip from a document</h1>
        <p className="text-sm text-ink-soft mt-2">
          Upload a Word document describing the trip and Claude will read it into a draft —
          overview, day-by-day itinerary, what&apos;s included, duration and destination. Review
          it, add photos, then publish.
        </p>
      </div>

      {!configured && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/5 rounded p-4">
          The Claude API key isn&apos;t set on this environment, so importing is unavailable. Add
          <code className="mx-1">ANTHROPIC_API_KEY</code> and redeploy.
        </p>
      )}

      <form onSubmit={onRead} className="border border-line rounded p-6 grid gap-4">
        <label className="grid gap-1.5">
          <span className={labelCls}>Trip document</span>
          <input
            type="file"
            accept=".docx,.txt,.md,.rtf"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-xs text-ink-soft">
            Word (.docx), plain text or Markdown. Old .doc files need saving as .docx first.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className={labelCls}>…or paste the itinerary text</span>
          <textarea
            rows={6}
            className={inputCls}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the trip description and day-by-day itinerary here…"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
            disabled={!configured || busy !== null || (!file && !text.trim())}
          >
            {busy === 'read' ? 'Reading the document…' : 'Read document'}
          </button>
          <Link href="/admin/trips" className={smallBtn}>
            Cancel
          </Link>
        </div>
        {busy === 'read' && (
          <p className="text-xs text-ink-soft">
            This usually takes 20–40 seconds for a full itinerary.
          </p>
        )}
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
                result.subjectMatch.name || 'no subject',
                result.countryMatch.name || 'no country',
                result.draft.city,
                result.draft.duration_days
                  ? `${result.draft.duration_days} days / ${result.draft.duration_nights} nights`
                  : null,
                result.draft.departs ? `departs ${result.draft.departs}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap text-xs">
              {result.subjectMatch.id === null && result.subjectMatch.name && (
                <span className="bg-teal/10 text-teal-deep rounded px-2 py-1 font-semibold">
                  New subject &ldquo;{result.subjectMatch.name}&rdquo; will be created
                </span>
              )}
              {result.countryMatch.id === null && result.countryMatch.name && (
                <span className="bg-teal/10 text-teal-deep rounded px-2 py-1 font-semibold">
                  New country &ldquo;{result.countryMatch.name}&rdquo; will be created
                </span>
              )}
            </div>
          </div>

          {result.notes.length > 0 && (
            <ul className="text-sm text-ink-soft border border-line rounded p-4 grid gap-1">
              {result.notes.map((n, i) => (
                <li key={i}>· {n}</li>
              ))}
            </ul>
          )}

          {result.draft.overview.length > 0 && (
            <div className="grid gap-2">
              <span className={labelCls}>Overview ({result.draft.overview.length})</span>
              {result.draft.overview.map((p, i) => (
                <p key={i} className="text-sm text-ink-soft leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}

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

          {result.draft.includes.length > 0 && (
            <div className="grid gap-1">
              <span className={labelCls}>Included ({result.draft.includes.length})</span>
              <ul className="text-sm text-ink-soft grid gap-0.5">
                {result.draft.includes.map((item, i) => (
                  <li key={i}>✓ {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 items-center flex-wrap border-t border-line pt-4">
            <button
              onClick={onCreate}
              disabled={busy !== null}
              className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
            >
              {busy === 'create' ? 'Creating draft…' : 'Create draft trip'}
            </button>
            <button onClick={() => setResult(null)} className={smallBtn} disabled={busy !== null}>
              Discard
            </button>
            <span className="text-xs text-ink-soft">
              Opens in the editor so you can add photos before publishing.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
