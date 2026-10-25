import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';
import DocKindPage from '../DocKindPage';

export const dynamic = 'force-dynamic';

/**
 * Excursion vouchers are handed over by the trip leader, so they are a
 * teachers' page; students and parents get the maps instead.
 */
export default async function VouchersPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  if (session.member.role !== 'teacher') redirect('/app/trip/maps');
  return (
    <DocKindPage
      title="Vouchers"
      kinds={['voucher', 'sightseeing', 'map']}
      sections={{
        voucher: '🎟️ Excursion vouchers',
        sightseeing: '📍 Nearby sightseeing',
        map: '🗺️ Maps',
      }}
      emptyText="Excursion vouchers and maps will appear here before departure."
    />
  );
}
