import { describe, expect, it } from 'vitest';
import { sizedImage } from '@/lib/brochure/image-size';

const OBJECT =
  'https://jdqvbzjzbyfrgnsluaon.supabase.co/storage/v1/object/public/trip-images/legacy/japan/hero.jpg';

/**
 * The first brochure PDF came to 25MB because every picture was embedded at
 * full resolution. Asking Storage for the size actually shown is what keeps
 * the file small enough to email, so the rewrite is worth pinning down.
 */
describe('sizedImage', () => {
  it('rewrites a public storage URL to the resizing endpoint', () => {
    const out = sizedImage(OBJECT, 'hero')!;
    expect(out).toContain('/storage/v1/render/image/public/');
    expect(out).not.toContain('/storage/v1/object/public/');
    // The exact width is tuned against real PDF sizes, so assert a sane bound
    // rather than a number that changes whenever it is tuned.
    const width = Number(out.match(/width=(\d+)/)![1]);
    expect(width).toBeGreaterThanOrEqual(600);
    expect(width).toBeLessThanOrEqual(2000);
    expect(out).toContain('quality=72');
  });

  it('asks for a bigger picture for a full-bleed cover than for a thumbnail', () => {
    const cover = Number(sizedImage(OBJECT, 'cover')!.match(/width=(\d+)/)![1]);
    const hero = Number(sizedImage(OBJECT, 'hero')!.match(/width=(\d+)/)![1]);
    const thumb = Number(sizedImage(OBJECT, 'thumb')!.match(/width=(\d+)/)![1]);
    expect(cover).toBeGreaterThan(hero);
    expect(hero).toBeGreaterThan(thumb);
  });

  it('keeps the path, so it still points at the same file', () => {
    expect(sizedImage(OBJECT, 'hero')).toContain('trip-images/legacy/japan/hero.jpg');
  });

  it('leaves an external image alone — it has no such endpoint', () => {
    const external = 'https://images.unsplash.com/photo-123?w=800';
    expect(sizedImage(external, 'hero')).toBe(external);
  });

  it('leaves a URL that already carries parameters alone', () => {
    const withQuery = `${OBJECT}?v=2`;
    expect(sizedImage(withQuery, 'hero')).toBe(withQuery);
  });

  it('does not rewrite twice', () => {
    const once = sizedImage(OBJECT, 'hero')!;
    expect(sizedImage(once, 'thumb')).toBe(once);
  });

  it('passes nothing through as nothing, so a missing image stays missing', () => {
    expect(sizedImage(null, 'hero')).toBeNull();
    expect(sizedImage(undefined, 'hero')).toBeNull();
    expect(sizedImage('', 'hero')).toBeNull();
  });
});
