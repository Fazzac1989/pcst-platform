'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createAppPost } from '@/lib/app/actions';
import { createClient } from '@/lib/supabase/client';

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
        const supabase = createClient();
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `app-posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('trip-images').upload(path, file, {
          contentType: file.type,
        });
        if (upErr) throw new Error(upErr.message);
        imageUrl = supabase.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
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
