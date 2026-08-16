'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { addCountry, addSubject, deleteTrip, saveTrip, type TripPayload } from '@/lib/admin/actions';
import { createClient } from '@/lib/supabase/client';

type Option = { id: number; name: string };

export type EditorTrip = TripPayload & { id?: number };

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';
const labelCls = 'text-xs font-semibold uppercase tracking-widest text-teal-deep';
const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function TripEditor({
  trip,
  subjects: initialSubjects,
  countries: initialCountries,
}: {
  trip: EditorTrip | null;
  subjects: Option[];
  countries: Option[];
}) {
  const router = useRouter();
  const isNew = !trip?.id;

  const [subjects, setSubjects] = useState(initialSubjects);
  const [countries, setCountries] = useState(initialCountries);
  const [form, setForm] = useState<EditorTrip>(
    trip ?? {
      slug: '',
      title: '',
      subject_id: null,
      country_id: null,
      city: '',
      duration_days: 5,
      duration_nights: 4,
      departs: 'Dubai',
      hero_image: null,
      hero_alt: '',
      gallery: [],
      overview: [''],
      includes: [''],
      itinerary: [{ label: 'Day 1', title: '', description: '' }],
      status: 'draft',
      featured: false,
    }
  );
  const slugTouched = useRef(Boolean(trip?.slug));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof EditorTrip>(key: K, value: EditorTrip[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched.current ? f.slug : slugify(title),
    }));
  }

  async function inlineAdd(kind: 'subject' | 'country') {
    const name = window.prompt(`New ${kind} name:`)?.trim();
    if (!name) return;
    const result =
      kind === 'subject'
        ? await addSubject(name)
        : await addCountry(name, window.prompt('Region (Europe, Asia, Africa, Americas, Oceania, Middle East) — optional:')?.trim() || null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const option = { id: result.id!, name };
    if (kind === 'subject') {
      setSubjects((s) => [...s, option].sort((a, b) => a.name.localeCompare(b.name)));
      set('subject_id', option.id);
    } else {
      setCountries((c) => [...c, option].sort((a, b) => a.name.localeCompare(b.name)));
      set('country_id', option.id);
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${form.slug || 'trip'}-${Date.now()}-${Math.floor(Math.random() * 1e4)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, {
      cacheControl: '31536000',
      contentType: file.type,
    });
    if (upErr) throw new Error(upErr.message);
    return supabase.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
  }

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      set('hero_image', await uploadImage(file));
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function onGalleryUpload(files: File[]) {
    setUploading(true);
    setError(null);
    try {
      const room = 6 - form.gallery.length;
      const added: { url: string; alt: string }[] = [];
      for (const file of files.slice(0, room)) added.push({ url: await uploadImage(file), alt: '' });
      set('gallery', [...form.gallery, ...added].slice(0, 6));
      if (files.length > room) setError(`Gallery holds 6 photos — ${files.length - room} skipped.`);
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function submit(status: EditorTrip['status']) {
    setBusy(status);
    setError(null);
    const payload: TripPayload = {
      ...form,
      status,
      overview: form.overview.map((p) => p.trim()).filter(Boolean),
      includes: form.includes.map((p) => p.trim()).filter(Boolean),
      itinerary: form.itinerary.filter((d) => d.title.trim() || d.description.trim()),
    };
    if (!payload.title.trim() || !payload.slug.trim()) {
      setError('Title and slug are required.');
      setBusy(null);
      return;
    }
    const result = await saveTrip(payload);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push('/admin/trips');
    router.refresh();
  }

  async function onDelete() {
    if (!trip?.id) return;
    if (!window.confirm(`Delete "${form.title}" permanently? This cannot be undone.`)) return;
    setBusy('delete');
    const result = await deleteTrip(trip.id);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push('/admin/trips');
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl mb-8">{isNew ? 'New trip' : `Edit: ${form.title}`}</h1>

      <div className="grid gap-6">
        {/* basics */}
        <div className="grid gap-4 border border-line rounded p-6">
          <label className="grid gap-1.5">
            <span className={labelCls}>Title</span>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Geography Trip to Japan"
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelCls}>Slug</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-soft">/trips/</span>
              <input
                className={inputCls}
                value={form.slug}
                onChange={(e) => {
                  slugTouched.current = true;
                  set('slug', slugify(e.target.value));
                }}
              />
            </div>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className={labelCls}>Subject</span>
              <div className="flex gap-2">
                <select
                  className={inputCls}
                  value={form.subject_id ?? ''}
                  onChange={(e) => set('subject_id', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— select —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button type="button" className={smallBtn} onClick={() => inlineAdd('subject')}>
                  + New
                </button>
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Country</span>
              <div className="flex gap-2">
                <select
                  className={inputCls}
                  value={form.country_id ?? ''}
                  onChange={(e) => set('country_id', e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— select —</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" className={smallBtn} onClick={() => inlineAdd('country')}>
                  + New
                </button>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className={labelCls}>City / route</span>
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="Tokyo · Kyoto · Hiroshima"
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Departs</span>
              <input
                className={inputCls}
                value={form.departs}
                onChange={(e) => set('departs', e.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className={labelCls}>Duration — days</span>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={form.duration_days}
                onChange={(e) => set('duration_days', Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1.5">
              <span className={labelCls}>Duration — nights</span>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.duration_nights}
                onChange={(e) => set('duration_nights', Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        {/* hero image */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Hero image</span>
          {form.hero_image && (
            <div className="relative w-full aspect-[3/1] rounded overflow-hidden border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary source */}
              <img
                src={form.hero_image}
                alt="Hero preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex gap-3 items-center flex-wrap">
            <label className={`${smallBtn} cursor-pointer`}>
              {uploading ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            <input
              className={`${inputCls} flex-1 min-w-60`}
              value={form.hero_image ?? ''}
              onChange={(e) => set('hero_image', e.target.value || null)}
              placeholder="…or paste an image URL"
            />
          </div>
          <label className="grid gap-1.5">
            <span className={labelCls}>Alt text</span>
            <input
              className={inputCls}
              value={form.hero_alt ?? ''}
              onChange={(e) => set('hero_alt', e.target.value)}
              placeholder="Students on the Great Wall of China at sunrise"
            />
            <span className="text-xs text-ink-soft">
              Describe what is in the photo for screen readers and search engines. Skip
              &ldquo;photo of&rdquo; — just say what is happening.
            </span>
          </label>
        </div>

        {/* photo gallery */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Photo gallery ({form.gallery.length}/6) — shown under the hero on the trip page</span>
          {form.gallery.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {form.gallery.map((image, i) => (
                <div key={image.url} className="border border-line rounded overflow-hidden">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary source */}
                    <img src={image.url} alt={image.alt || `Gallery ${i + 1}`} className="w-full h-28 object-cover" />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button type="button" className="bg-white/90 rounded px-1.5 py-0.5 text-xs font-bold" onClick={() => set('gallery', move(form.gallery, i, i - 1))} aria-label="Move earlier">←</button>
                      <button type="button" className="bg-white/90 rounded px-1.5 py-0.5 text-xs font-bold" onClick={() => set('gallery', move(form.gallery, i, i + 1))} aria-label="Move later">→</button>
                      <button type="button" className="bg-white/90 rounded px-1.5 py-0.5 text-xs font-bold text-danger" onClick={() => set('gallery', form.gallery.filter((_, j) => j !== i))} aria-label="Remove photo">✕</button>
                    </div>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-white/90 rounded px-1.5 py-0.5 text-[10px] font-semibold text-teal-deep">Lead photo</span>
                    )}
                  </div>
                  <input
                    className={`${inputCls} border-0 border-t rounded-none text-xs ${image.alt.trim() ? '' : 'bg-danger/5'}`}
                    value={image.alt}
                    placeholder="Alt text — describe this photo"
                    onChange={(e) =>
                      set('gallery', form.gallery.map((g, j) => (j === i ? { ...g, alt: e.target.value } : g)))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          {form.gallery.some((g) => !g.alt.trim()) && (
            <p className="text-xs text-danger">
              Photos highlighted in red still need alt text — add it before publishing.
            </p>
          )}
          {form.gallery.length < 6 && (
            <label className={`${smallBtn} cursor-pointer justify-self-start`}>
              {uploading ? 'Uploading…' : '+ Add photos'}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) onGalleryUpload(files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          <p className="text-xs text-ink-soft">
            The first photo leads the mosaic. Use landscape shots where possible; six photos gives the cleanest layout.
          </p>
        </div>

        {/* overview */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Overview paragraphs</span>
          {form.overview.map((para, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea
                rows={3}
                className={inputCls}
                value={para}
                onChange={(e) =>
                  set('overview', form.overview.map((p, j) => (j === i ? e.target.value : p)))
                }
              />
              <button
                type="button"
                className={smallBtn}
                onClick={() => set('overview', form.overview.filter((_, j) => j !== i))}
                aria-label="Remove paragraph"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={`${smallBtn} justify-self-start`} onClick={() => set('overview', [...form.overview, ''])}>
            + Add paragraph
          </button>
        </div>

        {/* itinerary */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>Itinerary — day by day</span>
          {form.itinerary.map((day, i) => (
            <div key={i} className="border border-line rounded p-4 grid gap-3">
              <div className="flex gap-2">
                <input
                  className={`${inputCls} w-28`}
                  value={day.label}
                  placeholder="Day 1"
                  onChange={(e) =>
                    set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, label: e.target.value } : d)))
                  }
                />
                <input
                  className={inputCls}
                  value={day.title}
                  placeholder="Arrival in Tokyo"
                  onChange={(e) =>
                    set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, title: e.target.value } : d)))
                  }
                />
                <div className="flex gap-1">
                  <button type="button" className={smallBtn} onClick={() => set('itinerary', move(form.itinerary, i, i - 1))} aria-label="Move up">↑</button>
                  <button type="button" className={smallBtn} onClick={() => set('itinerary', move(form.itinerary, i, i + 1))} aria-label="Move down">↓</button>
                  <button type="button" className={smallBtn} onClick={() => set('itinerary', form.itinerary.filter((_, j) => j !== i))} aria-label="Remove day">✕</button>
                </div>
              </div>
              <textarea
                rows={2}
                className={inputCls}
                value={day.description}
                placeholder="What happens on this day…"
                onChange={(e) =>
                  set('itinerary', form.itinerary.map((d, j) => (j === i ? { ...d, description: e.target.value } : d)))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className={`${smallBtn} justify-self-start`}
            onClick={() =>
              set('itinerary', [
                ...form.itinerary,
                { label: `Day ${form.itinerary.length + 1}`, title: '', description: '' },
              ])
            }
          >
            + Add day
          </button>
        </div>

        {/* includes */}
        <div className="grid gap-3 border border-line rounded p-6">
          <span className={labelCls}>What&apos;s included</span>
          {form.includes.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputCls}
                value={item}
                onChange={(e) =>
                  set('includes', form.includes.map((p, j) => (j === i ? e.target.value : p)))
                }
              />
              <div className="flex gap-1">
                <button type="button" className={smallBtn} onClick={() => set('includes', move(form.includes, i, i - 1))} aria-label="Move up">↑</button>
                <button type="button" className={smallBtn} onClick={() => set('includes', move(form.includes, i, i + 1))} aria-label="Move down">↓</button>
                <button type="button" className={smallBtn} onClick={() => set('includes', form.includes.filter((_, j) => j !== i))} aria-label="Remove item">✕</button>
              </div>
            </div>
          ))}
          <button type="button" className={`${smallBtn} justify-self-start`} onClick={() => set('includes', [...form.includes, ''])}>
            + Add item
          </button>
        </div>

        {/* status + actions */}
        <div className="border border-line rounded p-6 grid gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <span className={labelCls}>Status</span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  form.status === 'published'
                    ? 'bg-teal/15 text-teal-deep'
                    : form.status === 'draft'
                      ? 'bg-ink/10 text-ink-soft'
                      : 'bg-danger/10 text-danger'
                }`}
              >
                {form.status}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="accent-[#19BAAB] w-4 h-4"
              />
              Featured on homepage
            </label>
            {form.status === 'published' && (
              <button
                type="button"
                onClick={() => submit('archived')}
                disabled={busy !== null}
                className="text-sm text-ink-soft hover:text-danger underline underline-offset-2 disabled:opacity-60"
              >
                {busy === 'archived' ? 'Archiving…' : 'Archive this trip'}
              </button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => submit('draft')}
              disabled={busy !== null}
              className="border border-ink text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-ink hover:text-white transition-colors disabled:opacity-60"
            >
              {busy === 'draft' ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              onClick={() => submit('published')}
              disabled={busy !== null}
              className="bg-teal text-ink font-semibold text-sm px-6 py-3 rounded-sm hover:bg-teal-hover transition-colors disabled:opacity-60"
            >
              {busy === 'published' ? 'Publishing…' : 'Publish'}
            </button>
            {!isNew && (
              <button
                onClick={onDelete}
                disabled={busy !== null}
                className="ml-auto text-danger text-sm font-semibold px-4 py-3 hover:underline disabled:opacity-60"
              >
                {busy === 'delete' ? 'Deleting…' : 'Delete trip'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
