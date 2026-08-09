import DocKindPage from '../DocKindPage';

export const dynamic = 'force-dynamic';

export default function FlightsPage() {
  return (
    <DocKindPage
      title="Flights & E-Tickets"
      kinds={['flight', 'ticket']}
      sections={{ flight: '✈️ Flight information', ticket: '🎫 E-Tickets' }}
      emptyText="Flight details and e-tickets will appear here before departure."
    />
  );
}
