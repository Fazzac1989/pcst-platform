import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppSession } from '@/lib/app/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;

/** Photo upload for app members — authenticated by trip access code. */
export async function POST(request: NextRequest) {
  const session = await getAppSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Signed out — log in again.' }, { status: 401 });
  if (session.member.role !== 'student') {
    return NextResponse.json({ ok: false, error: 'Only students can post photos.' }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file received.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ ok: false, error: 'Only images can be posted.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'Image too large (max 8 MB).' }, { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `app-posts/${session.member.tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const db = createAdminClient();
  const { error } = await db.storage
    .from('trip-images')
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: '31536000',
    });
  if (error) {
    console.error('[app upload]', error.message);
    return NextResponse.json({ ok: false, error: 'Upload failed — try again.' }, { status: 500 });
  }

  const url = db.storage.from('trip-images').getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url });
}
