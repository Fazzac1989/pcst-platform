import { redirect } from 'next/navigation';
import { getSchedule } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';
import ItineraryView from './ItineraryView';

export const dynamic = 'force-dynamic';

export default async function ItineraryPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { trip } = session;

  const schedule = await getSchedule(trip.id);

  return (
    <ItineraryView
      schedule={schedule}
      legacyItinerary={schedule.length === 0 ? trip.itinerary : []}
    />
  );
}
