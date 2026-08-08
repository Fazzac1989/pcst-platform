'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  addAdminQuoteMessage,
  deleteQuote,
  loadTripForQuote,
  saveQuote,
  shareQuoteByEmail,
  type QuotePayload,
} from '@/lib/admin/quote-actions';
import { createClient } from '@/lib/supabase/client';

type Line = { description: string; qty: number; unitCost: number; markupPct: number };
type Day = { label: string; title: string; description: string };
type Message = { id: number; sender: string; author: string | null; body: string; createdAt: string };

export type EditorQuote = QuotePayload & {
  id?: number;
  ref?: string;
  publicToken?: string;
  messages?: Message[];
};

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

const money = (currency: string, n: number) =>
  `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function QuoteEditor({
  quote,
  trips,
  defaultTerms,
}: {
  quote: EditorQuote | null;
  trips: { id: number; title: string }[];
  defaultTerms: string[];
}) {
  const router = useRouter();
  const isNew = !quote?.id;

  const [form, setForm] = useState<EditorQuote>(
    quote ?? {
      title: '',
      tripId: null,
      schoolName: '',
      schoolLogo: null,
      teacherName: '',
      teacherEmail: '',
      travelDates: '',
      validity: null,
      pupils: 20,
      staff: 2,
      notes: '',
      currency: 'AED',
      defaultMarkupPct: 15,
      itinerary: [],
      images: [],
      terms: defaultTerms,
      lines: [{ description: '', qty: 1, unitCost: 0, markupPct: 15 }],
      status: 'draft',
    }
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState(form.teacherEmail ?? '');
  const [shareState, setShareState] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const set = <K extends keyof EditorQuote>(key: K, value: EditorQuote[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const total = form.lines.reduce((s, l) => s + l.qty * l.unitCost * (1 + l.markupPct / 100), 0);
  const totalCost = form.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const pps = form.pupils && form.pupils > 0 ? total / form.pupils : null;

  async function prefillFromTrip(tripId: number) {
    set('tripId', tripId);
    const result = await loadTripForQuote(tripId);
    if (!result.ok) return setError(result.error);
    setForm((f) => ({
      ...f,
      tripId,
      title: f.title || result.title,
      itinerary: f.itinerary.length ? f.itinerary : result.itinerary,
      images: f.images.length ? f.images : result.heroImage ? [result.heroImage] : [],
    }));
  }

  async function upload(file: File, kind: 'logo' | 'image') {
    setUploading(kind);
    setError(null);
    try {
      const supabase = createClient();
      const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `${kind === 'logo' ? 'quote-logos' : 'quote-images'}/${Date.now()}-${clean}`;
      const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
      if (kind === 'logo') set('schoolLogo', url);
      else set('images', [...form.images, url]);
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function submit(status: 'draft' | 'published') {
    if (!form.title.trim()) return setError('Give the quote a title.');
    setBusy(status);
    setError(null);
    const payload: QuotePayload = {
      ...form,
      status,
      lines: form.lines.filter((l) => l.description.trim()),
      itinerary: form.itinerary.filter((d) => d.description.trim() || d.title.trim()),
      terms: form.terms.map((t) => t.trim()).filter(Boolean),
    };
    const result = await saveQuote(payload);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    if (isNew) {
      router.replace(`/admin/quotes/${result.id}`);
    }
    router.refresh();
    setForm((f) => ({ ...f, id: result.id, status, publicToken: result.token ?? f.publicToken }));
    setBusy(null);
  }

  async function onDelete() {
    if (!form.id) return;
    if (!window.confirm(`Delete quote "${form.title}"? This cannot be undone.`)) return;
    setBusy('delete');
    const result = await deleteQuote(form.id);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push('/admin/quotes');
    router.refresh();
  }

  async function onShare() {
    if (!form.id) return;
    setShareState('sending');
    const result = await shareQuoteByEmail(form.id, shareEmail);
    setShareState(result.ok ? 'sent' : `error:${'error' in result ? result.error : ''}`);
  }

  async function onReply() {
    if (!form.id || !reply.trim()) return;
    const result = await addAdminQuoteMessage(form.id, reply);
    if (result.ok) {
      setReply('');
      router.refresh();
    } else setError(result.error);
  }

  const publicLink = form.publicToken ? `/quotes/${form.publicToken}` : null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <h1 className="font-serif text-3xl">
          {isNew ? 'New quote' : `${form.ref ?? 'Quote'} — ${form.title}`}
        </h1>
        {form.status === 'published' && publicLink && (
          <div className="flex gap-3 text-sm">
            <a href={publicLink} target="_blank" className="text-teal-deep font-semibold hover:underline">
              View online ↗
            </a>
            <a
              href={`/api/quotes/pdf?token=${form.publicToken}`}
              target="_blank"
              className="text-teal-deep font-semibold hover:underline"
            >
              Download PDF ↓
            </a>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* basics + personalisation */}
        <div className="grid gap-4 border border-line rounded p-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 col-span-2">
              <span className={labelCls}>Quote title</span>
              <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Geography Trip to Iceland — Al Noor School" />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Base on trip (prefills itinerary)</span>
              <select
                className={inputCls}
                value={form.tripId ?? ''}
                onChange={(e) => e.target.value && prefillFromTrip(Number(e.target.value))}
              >
                <option value="">— none / custom —</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Travel dates</span>
              <input className={inputCls} value={form.travelDates} onChange={(e) => set('travelDates', e.target.value)} placeholder="12–19 October 2026" />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>School name</span>
              <input className={inputCls} value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Teacher name</span>
              <input className={inputCls} value={form.teacherName} onChange={(e) => set('teacherName', e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Students</span>
              <input type="number" min={1} className={inputCls} value={form.pupils ?? ''} onChange={(e) => set('pupils', e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Staff (free places)</span>
              <input type="number" min={0} className={inputCls} value={form.staff ?? ''} onChange={(e) => set('staff', e.target.value ? Number(e.target.value) : null)} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Valid until</span>
              <input type="date" className={inputCls} value={form.validity ?? ''} onChange={(e) => set('validity', e.target.value || null)} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Currency</span>
              <select className={inputCls} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {['AED', 'USD', 'GBP', 'EUR'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-2">
            <span className={labelCls}>School logo (appears on the PDF and online quote)</span>
            <div className="flex items-center gap-3">
              {form.schoolLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.schoolLogo} alt="School logo" className="h-12 w-auto border border-line rounded p-1" />
              )}
              <label className={`${smallBtn} cursor-pointer`}>
                {uploading === 'logo' ? 'Uploading…' : form.schoolLogo ? 'Replace logo' : 'Upload logo'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, 'logo'); e.target.value = ''; }} />
              </label>
              {form.schoolLogo && (
                <button className={smallBtn} onClick={() => set('schoolLogo', null)}>Remove</button>
              )}
            </div>
          </div>
        </div>

        {/* itinerary */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Daily itinerary</span>
          {form.itinerary.map((day, i) => (
            <div key={i} className="border border-line rounded p-4 grid gap-3">
              <div className="flex gap-2">
                <input className={`${inputCls} w-28`} value={day.label} placeholder="Day 1" onChange={(e) => set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, label: e.target.value } : d)))} />
                <input className={inputCls} value={day.title} placeholder="Headline (optional)" onChange={(e) => set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, title: e.target.value } : d)))} />
                <div className="flex gap-1">
                  <button className={smallBtn} onClick={() => set('itinerary', move(form.itinerary, i, i - 1))}>↑</button>
                  <button className={smallBtn} onClick={() => set('itinerary', move(form.itinerary, i, i + 1))}>↓</button>
                  <button className={smallBtn} onClick={() => set('itinerary', form.itinerary.filter((_, j) => j !== i))}>✕</button>
                </div>
              </div>
              <textarea rows={2} className={inputCls} value={day.description} onChange={(e) => set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, description: e.target.value } : d)))} />
            </div>
          ))}
          <button className={`${smallBtn} justify-self-start`} onClick={() => set('itinerary', [...form.itinerary, { label: `Day ${form.itinerary.length + 1}`, title: '', description: '' }])}>
            + Add day
          </button>
        </div>

        {/* images */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Images (first is the cover)</span>
          <div className="flex gap-3 flex-wrap">
            {form.images.map((url, i) => (
              <div key={i} className="relative w-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-36 h-24 object-cover rounded border border-line" />
                <div className="flex gap-1 mt-1">
                  <button className={smallBtn} onClick={() => set('images', move(form.images, i, i - 1))}>↑</button>
                  <button className={smallBtn} onClick={() => set('images', move(form.images, i, i + 1))}>↓</button>
                  <button className={smallBtn} onClick={() => set('images', form.images.filter((_, j) => j !== i))}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <label className={`${smallBtn} cursor-pointer`}>
              {uploading === 'image' ? 'Uploading…' : '+ Upload image'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, 'image'); e.target.value = ''; }} />
            </label>
          </div>
        </div>

        {/* costings */}
        <div className="grid gap-3 border border-line rounded p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <span className={labelCls}>Supplier costings &amp; markups</span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs text-ink-soft">Default markup % for new lines</span>
              <input type="number" min={0} className={`${inputCls} w-20`} value={form.defaultMarkupPct} onChange={(e) => set('defaultMarkupPct', Number(e.target.value))} />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-soft border-b border-line">
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 font-semibold w-16">Qty</th>
                  <th className="py-2 pr-3 font-semibold w-28">Unit cost</th>
                  <th className="py-2 pr-3 font-semibold w-24">Markup %</th>
                  <th className="py-2 pr-3 font-semibold w-28 text-right">Sell unit</th>
                  <th className="py-2 pr-3 font-semibold w-28 text-right">Line total</th>
                  <th className="py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((l, i) => {
                  const sell = l.unitCost * (1 + l.markupPct / 100);
                  return (
                    <tr key={i} className="border-b border-line last:border-0 align-top">
                      <td className="py-2 pr-3"><input className={inputCls} value={l.description} placeholder="Return flights (per student)" onChange={(e) => set('lines', form.lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /></td>
                      <td className="py-2 pr-3"><input type="number" min={0} className={inputCls} value={l.qty} onChange={(e) => set('lines', form.lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} /></td>
                      <td className="py-2 pr-3"><input type="number" min={0} step="0.01" className={inputCls} value={l.unitCost} onChange={(e) => set('lines', form.lines.map((x, j) => (j === i ? { ...x, unitCost: Number(e.target.value) } : x)))} /></td>
                      <td className="py-2 pr-3"><input type="number" step="0.5" className={inputCls} value={l.markupPct} onChange={(e) => set('lines', form.lines.map((x, j) => (j === i ? { ...x, markupPct: Number(e.target.value) } : x)))} /></td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap">{money(form.currency, sell)}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap font-medium">{money(form.currency, l.qty * sell)}</td>
                      <td className="py-2 text-right">
                        <button className={smallBtn} onClick={() => set('lines', form.lines.filter((_, j) => j !== i))}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className={`${smallBtn} justify-self-start`} onClick={() => set('lines', [...form.lines, { description: '', qty: 1, unitCost: 0, markupPct: form.defaultMarkupPct }])}>
            + Add line
          </button>
          <div className="grid gap-1 justify-end text-sm border-t border-line pt-4">
            <div className="text-ink-soft text-xs text-right">Supplier cost: {money(form.currency, totalCost)} · Margin: {money(form.currency, total - totalCost)}</div>
            <div className="text-right font-semibold">Sell total: {money(form.currency, total)}</div>
            <div className="text-right font-serif text-xl text-teal-deep">
              {pps !== null ? `${money(form.currency, pps)} per student` : 'Set student count for per-student price'}
            </div>
          </div>
        </div>

        {/* terms */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Terms &amp; conditions (this quote)</span>
          {form.terms.map((t, i) => (
            <div key={i} className="flex gap-2">
              <textarea rows={2} className={inputCls} value={t} onChange={(e) => set('terms', form.terms.map((x, j) => (j === i ? e.target.value : x)))} />
              <button className={smallBtn} onClick={() => set('terms', form.terms.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className={`${smallBtn} justify-self-start`} onClick={() => set('terms', [...form.terms, ''])}>
            + Add term
          </button>
        </div>

        {/* actions */}
        <div className="border border-line rounded p-6 grid gap-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 flex-wrap items-center">
            <button onClick={() => submit('draft')} disabled={busy !== null} className="border border-ink text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-60">
              {busy === 'draft' ? 'Saving…' : 'Save as draft'}
            </button>
            <button onClick={() => submit('published')} disabled={busy !== null} className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60">
              {busy === 'published' ? 'Publishing…' : form.status === 'published' ? 'Update & republish' : 'Publish'}
            </button>
            {!isNew && (
              <button onClick={onDelete} disabled={busy !== null} className="ml-auto text-danger text-sm font-semibold px-4 py-3 hover:underline disabled:opacity-60">
                Delete quote
              </button>
            )}
          </div>
          {form.status === 'published' && (
            <div className="border-t border-line pt-4 grid gap-2">
              <span className={labelCls}>Share with the teacher</span>
              <div className="flex gap-2 flex-wrap">
                <input type="email" className={`${inputCls} w-72`} placeholder="teacher@school.ae" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
                <button onClick={onShare} disabled={shareState === 'sending'} className="bg-teal text-ink font-semibold text-sm px-5 py-2 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60">
                  {shareState === 'sending' ? 'Sending…' : 'Email quote link'}
                </button>
              </div>
              {shareState === 'sent' && <p className="text-sm text-teal-deep font-semibold">Sent ✓</p>}
              {shareState?.startsWith('error:') && <p className="text-sm text-danger">{shareState.slice(6)}</p>}
            </div>
          )}
        </div>

        {/* messages */}
        {!isNew && (
          <div className="border border-line rounded p-6 grid gap-4">
            <span className={labelCls}>Messages with the teacher</span>
            <div className="grid gap-3">
              {(form.messages ?? []).map((m) => (
                <div key={m.id} className={`rounded p-3 text-sm max-w-lg ${m.sender === 'admin' ? 'bg-teal/10 justify-self-end' : 'bg-ink/5'}`}>
                  <div className="text-xs text-ink-soft mb-1">
                    {m.sender === 'admin' ? 'You' : m.author || 'Teacher'} ·{' '}
                    {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {m.body}
                </div>
              ))}
              {(form.messages ?? []).length === 0 && (
                <p className="text-sm text-ink-soft">No messages yet — the teacher can write to you from the online quote page.</p>
              )}
            </div>
            <div className="flex gap-2">
              <textarea rows={2} className={inputCls} placeholder="Reply to the teacher…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button onClick={onReply} className="bg-teal text-ink font-semibold text-sm px-5 rounded-sm hover:bg-teal-hover transition-colors self-stretch">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
