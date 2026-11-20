/**
 * The photographs beside the proposal's overview. The proposal already has
 * them — each day's photos and the signature experiences — so the overview
 * shows a selection rather than asking for more to be chosen: the first photo
 * of each day, so the set spans the trip, then the experiences, then the
 * rest. Never the hero (it is right above) or the school's logo.
 */
export function overviewPhotos(
  vm: {
    heroImage: string | null;
    images: Record<number, { url: string; alt: string }>;
    days: { imageIds: number[] }[];
    content: { schoolLogoImageId: number | null; signatureExperiences: { imageId: number | null }[] };
  },
  max = 5,
): { url: string; alt: string }[] {
  const ids: number[] = [
    ...vm.days.map((d) => d.imageIds[0]),
    ...vm.content.signatureExperiences.map((e) => e.imageId),
    ...vm.days.flatMap((d) => d.imageIds.slice(1)),
  ].filter((id): id is number => typeof id === 'number');

  const out: { url: string; alt: string }[] = [];
  const seen = new Set<string>(vm.heroImage ? [vm.heroImage] : []);
  for (const id of ids) {
    if (id === vm.content.schoolLogoImageId) continue;
    const img = vm.images[id];
    if (!img || seen.has(img.url)) continue;
    seen.add(img.url);
    out.push({ url: img.url, alt: img.alt });
    if (out.length === max) break;
  }
  return out;
}
