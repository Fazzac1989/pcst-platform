import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPortalTeacher } from '@/lib/portal/session';
import { studentsForTrip, tripForTeacher } from '@/lib/portal/planning';
import StudentWorkspace from './StudentWorkspace';

export const dynamic = 'force-dynamic';

export default async function PortalTripPage({ params }: { params: { id: string } }) {
  const teacher = await getPortalTeacher();
  if (!teacher) redirect('/portal/login');

  const tripId = Number(params.id);
  if (!Number.isInteger(tripId)) notFound();

  const trip = await tripForTeacher(tripId, teacher.id);
  if (!trip) notFound();

  const students = trip.dataPurgedAt ? [] : await studentsForTrip(tripId);

  return (
    <div>
      <Link href="/portal" className="pt-back">
        ← All trips
      </Link>

      {trip.dataPurgedAt ? (
        <div className="pt-card">
          <h1>{trip.title}</h1>
          <p className="pt-lede">
            This trip is complete and its student records were removed on{' '}
            {new Date(trip.dataPurgedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            , as agreed for passport and medical data. Nothing further is stored.
          </p>
        </div>
      ) : (
        <StudentWorkspace trip={trip} students={students} />
      )}
    </div>
  );
}
