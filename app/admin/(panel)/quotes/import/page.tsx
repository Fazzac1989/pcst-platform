import ImportQuoteForm from './ImportQuoteForm';

export const dynamic = 'force-dynamic';

export default function ImportQuotePage() {
  return <ImportQuoteForm configured={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
