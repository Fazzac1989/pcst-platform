import { notFound } from 'next/navigation';
import ProposalDocument from '@/components/proposal/ProposalDocument';
import { getProposalByToken } from '@/lib/brochure/proposal-view-model';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your proposal',
  robots: { index: false, follow: false },
};

/**
 * The shareable link.
 *
 * The token is validated in the view model, which refuses drafts and expired
 * links, so a stale link and a wrong one both land on the same 404 rather than
 * telling the holder which they have.
 */
export default async function SharedProposalPage({ params }: { params: { token: string } }) {
  const vm = await getProposalByToken(params.token);
  if (!vm) notFound();

  return <ProposalDocument vm={vm} />;
}
