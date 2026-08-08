'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createAppPost } from '@/lib/app/actions';

/** Downscale to max 1600px JPEG so phone photos upload quickly. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function PostForm() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const blob = await compressImage(file);
        const form = new FormData();
        form.append('file', blob, 'photo.jpg');
        const res = await fetch('/api/app/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? 'Upload failed.');
        imageUrl = data.url;
      }
      const result = await createAppPost(imageUrl, caption);
      if (!result.ok) throw new Error(result.error);
      setCaption('');
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="papp-card papp-postform" onSubmit={onSubmit}>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Preview" className="papp-preview" />
      )}
      <div className="papp-postform-row">
        <label className="papp-filebtn">
          📷 {file ? 'Change photo' : 'Add photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <input
          className="papp-caption"
          placeholder="Say something about your day…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
        />
      </div>
      {error && <p className="papp-error">{error}</p>}
      <button className="btn btn-brass" disabled={busy || (!file && !caption.trim())}>
        {busy ? 'Posting…' : 'Share with the group'}
      </button>
    </form>
  );
}
