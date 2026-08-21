'use client';

/* eslint-disable @next/next/no-img-element -- remote candidate previews */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  approveImage,
  deleteImage,
  searchImages,
  shortlistForTrip,
  updateImage,
  type Shortlist,
} from '@/lib/admin/image-actions';
import type { Candidate } from '@/lib/images/commons';

const smallBtn =
  'text-xs font-semibold px-2.5 py-1.5 rounded border border-line text-ink-soft hover:border-teal hover:text-teal-deep transition-colors disabled:opacity-50';
const inputCls =
  'border border-line rounded px-3 py-2 text-sm text-ink outline-none focus:border-teal bg-white w-full';

export type CuratorImage = {
  id: number;
  role: string;
  url: string;
  altText: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  photographer: string | null;
  licence: string | null;
  sourceUrl: string | null;
  sortOrder: number;
};
export type CuratorTrip = {
  id: number;
  slug: string;
  title: string;
  subject: string | null;
  country: string | null;
  legacyHero: string | null;
  images: CuratorImage[];
};

export default function ImageCurator({
  trips,
  initialTripId,
}: {
  trips: CuratorTrip[];
  initialTripId: number | null;
}) {
  const router = useRouter();
  const [tripId, setTripId] = useState<number | null>(initialTripId ?? trips[0]?.id ?? null);
  const [shortlists, setShortlists] = useState<Shortlist[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null);

  const trip = trips.find((t) => t.id === tripId) ?? null;
  const hero = trip?.images.find((i) => i.role === 'hero') ?? null;
  const gallery = trip?.images.filter((i) => i.role === 'gallery') ?? [];
  const done = Boolean(hero) && gallery.length >= 6;

  async function loadShortlists() {
    if (!tripId) return;
    setBusy('shortlist');
    setError(null);
    setShortlists(null);
    const res = await shortlistForTrip(tripId);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setShortlists(res.shortlists);
  }

  async function approve(c: Candidate, role: string, label: string, sortOrder: number) {
    if (!tripId) return;
    setBusy(c.sourceUrl);
    setError(null);
    const res = await approveImage({
      tripId,
      role: role as 'hero' | 'gallery',
      label,
      candidate: c,
      sortOrder,
    });
    setBusy(null);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setBusy('search');
    setError(null);
    const res = await searchImages(query);
    setBusy(null);
    if (!res.ok) setError(res.error);
    else setSearchResults(res.candidates);
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Photography</h1>
        <p className="text-sm text-ink-soft mt-1">
          Shortlists come from Wikimedia Commons, filtered to freely licensed images above the
          minimum resolution. Nothing is published until you approve it; approving downloads a
          hosted copy and records the photographer and licence.
        </p>
      </div>

      <div className="flex gap-3 items-end flex-wrap mb-6">
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">Trip</span>
          <select
            className={`${inputCls} min-w-[320px]`}
            value={tripId ?? ''}
            onChange={(e) => {
              setTripId(Number(e.target.value));
              setShortlists(null);
              setSearchResults(null);
            }}
          >
            {trips.map((t) => {
              const h = t.images.some((i) => i.role === 'hero');
              const g = t.images.filter((i) => i.role === 'gallery').length;
              return (
                <option key={t.id} value={t.id}>
                  {h && g >= 6 ? '✓ ' : `${g}/6 `}
                  {t.title}
                </option>
              );
            })}
          </select>
        </label>
        <button className={smallBtn} onClick={loadShortlists} disabled={busy !== null || !tripId}>
          {busy === 'shortlist' ? 'Finding candidates…' : 'Build shortlists'}
        </button>
        {trip && (
          <a className={smallBtn} href={`/trips/${trip.slug}`} target="_blank" rel="noreferrer">
            View the page
          </a>
        )}
        <span className={`text-sm font-semibold ${done ? 'text-teal-deep' : 'text-ink-soft'}`}>
          {hero ? 1 : 0} hero · {gallery.length}/6 gallery {done && '— complete'}
        </span>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {/* what is already approved */}
      {trip && trip.images.length > 0 && (
        <div className="border border-line rounded p-5 mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">
            Approved for {trip.title}
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {trip.images.map((img) => (
              <ApprovedCard key={img.id} image={img} onChanged={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      {/* shortlists */}
      {shortlists?.map((list, i) => {
        const alreadyFilled =
          list.role === 'hero' ? Boolean(hero) : gallery.length > i - 1 && gallery.length >= 6;
        return (
          <section key={`${list.role}-${i}`} className="mb-8">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
              <h2 className="font-serif text-xl">
                {i + 1}. {list.label}
              </h2>
              <span className="text-xs text-ink-soft">
                searched “{list.query}” · {list.candidates.length} candidates
                {alreadyFilled && ' · slot already filled'}
              </span>
            </div>
            {list.candidates.length === 0 ? (
              <p className="text-sm text-ink-soft border border-line rounded p-4">
                Nothing suitable found. Use the manual search below with a more specific term.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {list.candidates.map((c) => (
                  <CandidateCard
                    key={c.sourceUrl}
                    candidate={c}
                    busy={busy === c.sourceUrl}
                    disabled={busy !== null}
                    onApprove={() => approve(c, list.role, list.label, i)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* manual search */}
      <div className="border-t border-line pt-6">
        <form onSubmit={runSearch} className="flex gap-2 items-end flex-wrap mb-4">
          <label className="grid gap-1 flex-1 min-w-[260px]">
            <span className="text-xs font-semibold uppercase tracking-widest text-teal-deep">
              Search Shutterstock yourself
            </span>
            <input
              className={inputCls}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pompeii forum ruins"
            />
          </label>
          <button className={smallBtn} disabled={busy !== null}>
            {busy === 'search' ? 'Searching…' : 'Search'}
          </button>
        </form>
        {searchResults && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {searchResults.map((c) => (
              <CandidateCard
                key={c.sourceUrl}
                candidate={c}
                busy={busy === c.sourceUrl}
                disabled={busy !== null}
                onApprove={() => approve(c, hero ? 'gallery' : 'hero', 'Manual selection', gallery.length)}
              />
            ))}
            {searchResults.length === 0 && (
              <p className="text-sm text-ink-soft col-span-full">No freely licensed matches.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  busy,
  disabled,
  onApprove,
}: {
  candidate: Candidate;
  busy: boolean;
  disabled: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="border border-line rounded overflow-hidden flex flex-col">
      <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="block bg-ink/5">
        <img src={candidate.previewUrl} alt="" className="w-full h-32 object-cover" loading="lazy" />
      </a>
      <div className="p-2 text-xs flex-1 flex flex-col gap-1">
        <div className="text-ink-soft">
          {candidate.width}×{candidate.height} · {candidate.licence}
        </div>
        <div className="truncate" title={candidate.photographer ?? ''}>
          {candidate.photographer ?? 'Unknown photographer'}
        </div>
        <button className={`${smallBtn} mt-auto`} onClick={onApprove} disabled={disabled}>
          {busy ? 'Saving…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

function ApprovedCard({ image, onChanged }: { image: CuratorImage; onChanged: () => void }) {
  const [alt, setAlt] = useState(image.altText);
  const [busy, setBusy] = useState(false);

  return (
    <div className="border border-line rounded overflow-hidden">
      <img src={image.url} alt={image.altText} className="w-full h-28 object-cover" loading="lazy" />
      <div className="p-2 grid gap-1 text-xs">
        <div className="flex justify-between text-ink-soft">
          <span className="font-semibold uppercase tracking-wider">{image.role}</span>
          <span>
            {image.width}×{image.height}
          </span>
        </div>
        <input
          className={`border border-line rounded px-2 py-1 text-xs ${alt.trim() ? '' : 'bg-danger/5'}`}
          value={alt}
          placeholder="Alt text"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={async () => {
            if (alt === image.altText) return;
            setBusy(true);
            await updateImage(image.id, { altText: alt });
            setBusy(false);
            onChanged();
          }}
        />
        <div className="text-ink-soft truncate" title={`${image.photographer} — ${image.licence}`}>
          {image.photographer ?? '—'} · {image.licence ?? '—'}
        </div>
        <button
          className="text-danger font-semibold text-left"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('Remove this image?')) return;
            setBusy(true);
            await deleteImage(image.id);
            setBusy(false);
            onChanged();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
