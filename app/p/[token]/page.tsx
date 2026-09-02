import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ProposalSlides from '@/components/proposal/ProposalSlides';
import { buildEditorialSlides } from '@/lib/brochure/editorial';
import { findProposalByToken } from '@/lib/brochure/proposal-view-model';
import { recordProposalView } from '@/lib/brochure/proposal-tracking';

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
  const found = await findProposalByToken(params.token);
  if (!found) notFound();

  // Awaited rather than left dangling: work started and not awaited in a
  // serverless function can be cut off when the response is sent. It is a
  // couple of queries, and it must not throw — the proposal renders either way.
  await recordProposalView(found.brochure, headers().get('user-agent'));

  return <ProposalSlides
      vm={found.vm}
      shareToken={params.token}
      editorial={await buildEditorialSlides()}
    />;
}
