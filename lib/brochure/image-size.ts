/**
 * Ask Supabase Storage for an image at the size it will actually be shown.
 *
 * A brochure PDF embeds every picture at whatever resolution the file happens
 * to be. The first render of the 2027 Collection came to 25MB — too big to
 * email to a school, which is the one thing it exists to do.
 *
 * Chromium's PDF export re-encodes every image losslessly rather than
 * carrying the JPEG through, so the file size follows pixel count almost
 * exactly: thirty-two photographs came to 43MB from 4.8MB of source. These
 * widths were measured against real renders, not guessed.
 *
 * Storage serves resized copies from a `render/image` path instead of
 * `object`. Anything that is not one of our public storage URLs is returned
 * untouched: an external image has no such endpoint, and a broken picture is
 * worse than a heavy one.
 */

const PUBLIC_OBJECT = '/storage/v1/object/public/';
const RENDER_IMAGE = '/storage/v1/render/image/public/';

export type ImageRole = 'cover' | 'hero' | 'thumb' | 'micro';

/** Widths chosen for print: the largest each role occupies on an A4 page, doubled. */
const WIDTHS: Record<ImageRole, number> = {
  cover: 1000,
  hero: 620,
  thumb: 420,
  /** A contents-page thumbnail, roughly 15mm across. */
  micro: 220,
};

export function sizedImage(url: string | null | undefined, role: ImageRole): string | null {
  if (!url) return null;
  if (!url.includes(PUBLIC_OBJECT)) return url;
  // Already transformed, or carrying its own parameters — leave it alone.
  if (url.includes(RENDER_IMAGE) || url.includes('?')) return url;

  return `${url.replace(PUBLIC_OBJECT, RENDER_IMAGE)}?width=${WIDTHS[role]}&quality=72`;
}
