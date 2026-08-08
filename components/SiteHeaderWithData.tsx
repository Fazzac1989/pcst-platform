import SiteHeader from '@/components/SiteHeader';
import { getSubjects } from '@/lib/data';

/** Server wrapper: feeds the subjects mega menu from the database. */
export default async function SiteHeaderWithData({
  variant = 'home',
}: {
  variant?: 'home' | 'trip';
}) {
  const subjects = await getSubjects();
  return (
    <SiteHeader
      variant={variant}
      subjects={subjects.map((s) => ({
        name: s.name,
        slug: s.slug,
        tripCount: s.tripCount,
        countries: s.countries,
      }))}
    />
  );
}
