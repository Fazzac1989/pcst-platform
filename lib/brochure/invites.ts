import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapBrochure, type Brochure } from '@/lib/brochure/schema';

/**
 * A brochure's personal front door for one teacher.
 *
 * The invite carries who it is for, their school's logo, a message from us
 * and a token. The page at /b/<token> shows those and a button into the
 * brochure; the token, passed along as ?via=, also opens a brochure that is
 * password protected, so a teacher is never asked for a password.
 */

export type Invite = {
  id: number;
  token: string;
  teacherName: string;
  schoolName: string;
  message: string;
  logoUrl: string | null;
  openCount: number;
};

const BUCKET = 'brochure-images';

/** A token too short to be one of ours is not worth a database round trip. */
export function isPlausibleInviteToken(token: string | null | undefined): boolean {
  return Boolean(token && /^[a-f0-9]{40,64}$/.test(token));
}

/** Everything the landing page needs, or null when the link is not one of ours. */
export async function findInvite(
  token: string,
): Promise<{ invite: Invite; brochure: Brochure } | null> {
  if (!isPlausibleInviteToken(token)) return null;
  const db = createAdminClient();
  const { data: row, error } = await db
    .from('brochure_invites')
    .select('*, brochures(*)')
    .eq('token', token)
    .maybeSingle();
  // Before the migration has run the table does not exist; that is a 404, not a crash.
  if (error || !row || !row.brochures) return null;

  let logoUrl: string | null = null;
  if (row.logo_image_id) {
    const { data: img } = await db
      .from('brochure_images')
      .select('storage_path')
      .eq('id', row.logo_image_id)
      .maybeSingle();
    if (img) logoUrl = db.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl;
  }

  return {
    invite: {
      id: row.id,
      token: row.token,
      teacherName: row.teacher_name ?? '',
      schoolName: row.school_name ?? '',
      message: row.message ?? '',
      logoUrl,
      openCount: row.open_count ?? 0,
    },
    brochure: mapBrochure(row.brochures),
  };
}

/** Does this token belong to an invite for this brochure? */
export async function inviteAllows(token: string | null | undefined, brochureId: number): Promise<boolean> {
  if (!isPlausibleInviteToken(token)) return false;
  const db = createAdminClient();
  const { data, error } = await db
    .from('brochure_invites')
    .select('id')
    .eq('token', token!)
    .eq('brochure_id', brochureId)
    .maybeSingle();
  return !error && Boolean(data);
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|linkedin|embedly|quora|outbrain|pinterest|vkshare|w3c_validator|headlesschrome/i;

/**
 * Count an opening. Link previewers open every link they are shown, and a
 * teacher's mail client is one of them, so those are left out.
 */
export async function recordInviteOpen(id: number, userAgent: string | null): Promise<void> {
  if (!userAgent || BOT.test(userAgent)) return;
  const db = createAdminClient();
  const { data } = await db.from('brochure_invites').select('open_count, first_opened_at').eq('id', id).maybeSingle();
  if (!data) return;
  const now = new Date().toISOString();
  await db
    .from('brochure_invites')
    .update({
      open_count: (data.open_count ?? 0) + 1,
      first_opened_at: data.first_opened_at ?? now,
      last_opened_at: now,
    })
    .eq('id', id);
}
