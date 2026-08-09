import DocKindPage from '../DocKindPage';

export const dynamic = 'force-dynamic';

export default function VouchersPage() {
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
