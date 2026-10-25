import DocKindPage from '../DocKindPage';

export const dynamic = 'force-dynamic';

/** What students and parents need from the documents: where they're going. */
export default function MapsPage() {
  return (
    <DocKindPage
      title="Maps & sights"
      kinds={['map', 'sightseeing']}
      sections={{ map: '🗺️ Maps', sightseeing: '📍 Nearby sightseeing' }}
      emptyText="Maps and nearby sights will appear here before departure."
    />
  );
}
