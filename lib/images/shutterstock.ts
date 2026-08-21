import 'server-only';

/**
 * Candidate photography from Shutterstock — the primary image source now the
 * account's API subscription covers licensing. Candidates carry the image id
 * in `title` as "shutterstock:<id>"; approval licenses the image through the
 * API and stores a clean full-size copy with the rights metadata.
 */

import type { Candidate, SearchOptions } from './commons';

const API = 'https://api.shutterstock.com/v2';

const token = () => process.env.SHUTTERSTOCK_API_TOKEN;

export const isShutterstockCandidate = (c: Pick<Candidate, 'title'>) =>
  c.title.startsWith('shutterstock:');
export const shutterstockId = (c: Pick<Candidate, 'title'>) => c.title.slice('shutterstock:'.length);

/** Thrown when the API's hourly quota is spent, so callers can say so honestly. */
export class ShutterstockBusyError extends Error {
  constructor() {
    super('Shutterstock’s hourly search allowance is used up right now — try again in a few minutes.');
    this.name = 'ShutterstockBusyError';
  }
}

async function ssFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  // Interactive admin use: never queue for minutes — fail fast and honestly.
  if (res.status === 429) throw new ShutterstockBusyError();
  return res;
}

export async function searchShutterstock(
  query: string,
  { minWidth = 1600, landscapeOnly = false, limit = 24 }: SearchOptions = {}
): Promise<Candidate[]> {
  if (!token() || !query.trim()) return [];
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(50, limit)),
    sort: 'relevance',
    image_type: 'photo',
    safe: 'true',
    view: 'full',
  });
  if (landscapeOnly) params.set('orientation', 'horizontal');

  const res = await ssFetch(`${API}/images/search?${params}`);
  if (!res.ok) return [];
  const json: any = await res.json();

  return ((json.data ?? []) as any[])
    .map((r): Candidate | null => {
      const preview = r.assets?.huge_thumb?.url || r.assets?.preview?.url;
      if (!preview) return null;
      const width = r.assets?.huge_jpg?.width ?? r.assets?.preview?.width ?? 0;
      const height = r.assets?.huge_jpg?.height ?? r.assets?.preview?.height ?? 0;
      if (minWidth && width && width < minWidth) return null;
      return {
        title: `shutterstock:${r.id}`,
        url: preview,
        previewUrl: preview,
        width,
        height,
        ratio: width && height ? width / height : 1.5,
        mime: 'image/jpeg',
        licence: 'Shutterstock Standard License',
        photographer: r.contributor?.id ? `Shutterstock contributor ${r.contributor.id}` : null,
        description: r.description ? String(r.description).slice(0, 200) : null,
        sourceUrl: `https://www.shutterstock.com/image-photo/${r.id}`,
      };
    })
    .filter((c): c is Candidate => c !== null);
}

/** License an image on the account's plan and return the clean file. */
export async function licenseShutterstock(imageId: string): Promise<Buffer> {
  const lic = await ssFetch(`${API}/images/licenses`, {
    method: 'POST',
    body: JSON.stringify({ images: [{ image_id: imageId, size: 'huge' }] }),
  });
  if (!lic.ok) {
    throw new Error(`Shutterstock licensing failed (HTTP ${lic.status}) — check the plan's API download allowance.`);
  }
  const dl = (await lic.json()).data?.[0]?.download?.url;
  if (!dl) throw new Error('Shutterstock returned no download for that image.');
  const img = await fetch(dl);
  if (!img.ok) throw new Error(`Download failed (HTTP ${img.status}).`);
  return Buffer.from(await img.arrayBuffer());
}
