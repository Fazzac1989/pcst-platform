'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteMediaObject } from '@/lib/admin/actions';
import { createClient } from '@/lib/supabase/client';

type Item = { name: string; url: string; size: number; createdAt: string | null };

export default function MediaManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
      const path = `${Date.now()}-${clean}`;
      const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
      });
      if (upErr) throw new Error(upErr.message);
      router.refresh();
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(item: Item) {
    if (!window.confirm(`Delete ${item.name}? Any trip using it will lose its image.`)) return;
    const result = await deleteMediaObject(item.name);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl">Media</h1>
          <p className="text-sm text-ink-soft mt-1">
            trip-images bucket · {items.length} file{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <label className="bg-teal text-ink font-semibold text-sm px-5 py-2.5 rounded-sm hover:bg-teal-hover transition-colors cursor-pointer">
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
      </div>
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.name} className="border border-line rounded overflow-hidden">
            <div className="aspect-[4/3] bg-ink/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted admin thumbnails */}
              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 text-xs">
              <div className="truncate font-medium" title={item.name}>
                {item.name}
              </div>
              <div className="text-ink-soft mt-0.5">{(item.size / 1024).toFixed(0)} KB</div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => copy(item.url)} className="font-semibold text-teal-deep hover:underline">
                  {copied === item.url ? 'Copied!' : 'Copy URL'}
                </button>
                <button onClick={() => onDelete(item)} className="font-semibold text-ink-soft hover:text-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-ink-soft text-sm col-span-full py-10 text-center">
            No images yet — upload hero and gallery photography here.
          </p>
        )}
      </div>
    </div>
  );
}
