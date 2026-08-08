import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { SiteFooterSimple } from '@/components/SiteFooter';
import { getPublishedTrips, getSubjects } from '@/lib/data';

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  const subjects = await getSubjects();
  return subjects.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const subjects = await getSubjects();
  const subject = subjects.find((s) => s.slug === params.slug);
  if (!subject) return {};
  return {
    title: `${subject.name} school trips`,
    description: `${subject.tripCount} curriculum-built ${subject.name} itineraries across ${subject.countries.join(', ')} — designed, priced and supported from Dubai.`,
  };
}

export default async function SubjectPage({ params }: Props) {
  const [subjects, allTrips] = await Promise.all([getSubjects(), getPublishedTrips()]);
  const subject = subjects.find((s) => s.slug === params.slug);
  if (!subject) notFound();

  const trips = allTrips.filter((t) => t.subjectSlug === subject.slug);
  const others = subjects.filter((s) => s.slug !== subject.slug);

  return (
    <>
      <SiteHeader variant="trip" />

      <div className="thero thero--index">
        <div className="bg">
          {subject.heroImage && (
            <Image
              src={subject.heroImage}
              alt=""
              fill
              priority
              quality={60}
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          )}
        </div>
        <div className="scrim"></div>
        <div className="wrap">
          <span className="eyebrow">Curriculum subject</span>
          <h1>{subject.name}</h1>
          <div className="tmeta">
            <div>
              <b>Itineraries</b>
              {subject.tripCount} ready to run
            </div>
            <div>
              <b>Countries</b>
              {subject.countries.join(' · ')}
            </div>
            <div>
              <b>Departs</b>
              Dubai
            </div>
          </div>
        </div>
      </div>

      <main className="trip-main">
        <section>
          <div className="wrap">
            <span className="eyebrow">Where {subject.name} comes alive</span>
            <h2 className="st serif">
              Choose your <i>destination</i>
            </h2>
            <div className="trip-grid">
              {trips.map((trip) => (
                <Link className="trip" href={`/trips/${trip.slug}`} key={trip.slug}>
                  {trip.heroImage && (
                    <Image
                      className="ph"
                      src={trip.heroImage}
                      alt=""
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  <div className="fade"></div>
                  <div className="meta">
                    <span className="tag">{trip.country}</span>
                    <h3>{trip.title}</h3>
                    <div className="dur">
                      {trip.durationDays} days / {trip.durationNights} nights
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="others">
          <div className="wrap">
            <span className="eyebrow">Keep exploring</span>
            <h2 className="st serif">
              More <i>subjects</i>
            </h2>
            <div className="olinks">
              {others.map((s) => (
                <Link href={`/subjects/${s.slug}`} key={s.slug}>
                  {s.name}
                </Link>
              ))}
              <Link href="/trips">← All trips</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooterSimple />
    </>
  );
}
