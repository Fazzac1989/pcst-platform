import SiteHeader from '@/components/SiteHeader';
import { getAllSubjects, getCountries } from '@/lib/data';

/** Server wrapper: feeds the subjects + countries mega menus from the database. */
export default async function SiteHeaderWithData({
  variant = 'home',
}: {
  variant?: 'home' | 'trip';
}) {
  const [subjects, countries] = await Promise.all([getAllSubjects(), getCountries()]);
  return (
    <SiteHeader
      variant={variant}
      subjects={subjects.map((s) => ({
        name: s.name,
        slug: s.slug,
        tripCount: s.tripCount,
        countries: s.countries,
      }))}
      countries={countries.map((c) => ({
        name: c.name,
        slug: c.slug,
        tripCount: c.tripCount,
      }))}
    />
  );
}
