import ImportForm from './ImportForm';

export const dynamic = 'force-dynamic';

export default function ImportTripPage() {
  return <ImportForm configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
