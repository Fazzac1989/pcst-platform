import { redirect } from 'next/navigation';
import { getSchedule } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';
import { getRegisterMarks, getStudentEssentials } from '@/lib/app/register';
import ItineraryView from './ItineraryView';

export const dynamic = 'force-dynamic';

export default async function ItineraryPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { trip, member } = session;

  // Teachers take the daily register from here.
  const [schedule, register] = await Promise.all([
    getSchedule(trip.id),
    member.role === 'teacher'
      ? Promise.all([getStudentEssentials(trip.id), getRegisterMarks(trip.id)]).then(([students, marks]) => ({
          students: students.map((s) => ({ id: s.memberId, name: s.name, photoUrl: s.photoUrl })),
          marks,
        }))
      : Promise.resolve(null),
  ]);

  return (
    <ItineraryView
      schedule={schedule}
      legacyItinerary={schedule.length === 0 ? trip.itinerary : []}
      register={register}
    />
  );
}
