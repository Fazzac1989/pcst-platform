import DocKindPage from '../DocKindPage';

export const dynamic = 'force-dynamic';

export default function AccommodationPage() {
  return (
    <DocKindPage
      title="Accommodation"
      kinds={['hotel']}
      sections={{ hotel: '🏨 Hotel information & rooming list' }}
      emptyText="Hotel details and the rooming list will appear here before departure."
    />
  );
}
