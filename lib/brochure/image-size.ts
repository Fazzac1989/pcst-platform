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
 * sizes were measured against real renders, not guessed.
 *
 * Storage serves resized copies from a `render/image` path instead of
 * `object`. Anything that is not one of our public storage URLs is returned
 * untouched: an external image has no such endpoint, and a broken picture is
 * worse than a heavy one.
 */

const PUBLIC_OBJECT = '/storage/v1/object/public/';
const RENDER_IMAGE = '/storage/v1/render/image/public/';

export type ImageRole = 'cover' | 'hero' | 'thumb' | 'micro';

/**
 * The box each role fills on an A4 page, doubled — a height as well as a
 * width.
 *
 * Width alone was not enough. A tall source photograph came back as tall as
 * it liked: contents thumbnails 15mm across arrived at 220x1450, and a
 * thirty-seven trip brochure carried 56 megapixels into a 76MB PDF, which
 * Storage refused to keep. Every one of these images is displayed cropped to
 * a fixed box, so cropping here shows exactly what the page already showed.
 */
const BOXES: Record<ImageRole, { width: number; height: number }> = {
  /** The full-bleed cover, 16:9. */
  cover: { width: 1000, height: 580 },
  /** A trip's picture: 16:9 or 4:3 depending on the page, so 3:2 covers both. */
  hero: { width: 620, height: 420 },
  thumb: { width: 420, height: 300 },
  /** A contents-page thumbnail, roughly 15mm across. */
  micro: { width: 220, height: 150 },
};

export function sizedImage(url: string | null | undefined, role: ImageRole): string | null {
  if (!url) return null;
  if (!url.includes(PUBLIC_OBJECT)) return url;
  // Already transformed, or carrying its own parameters — leave it alone.
  if (url.includes(RENDER_IMAGE) || url.includes('?')) return url;

  const { width, height } = BOXES[role];
  const base = url.replace(PUBLIC_OBJECT, RENDER_IMAGE);
  return `${base}?width=${width}&height=${height}&resize=cover&quality=72`;
}
