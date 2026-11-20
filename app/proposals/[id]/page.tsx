import { notFound } from 'next/navigation';
import ProposalDocument from '@/components/proposal/ProposalDocument';
import ProposalSlides from '@/components/proposal/ProposalSlides';
import { buildEditorialSlides } from '@/lib/brochure/editorial';
import { getProposalById } from '@/lib/brochure/proposal-view-model';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const vm = await getProposalById(Number(params.id));
  return {
    title: vm ? `${vm.content.title} ${vm.content.titleEmphasis}`.trim() : 'Proposal',
    // A proposal is written for one school and priced for them; it has no
    // business in a search index.
    robots: { index: false, follow: false },
  };
}

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { view?: string; preview?: string };
}) {
  const id = Number(params.id);
  // The staff preview arrives with a signed pass (middleware checked it). The
  // PDF button carries it on, or the download is refused for want of a login.
  const preview = searchParams.preview || undefined;
  if (!Number.isFinite(id)) notFound();

  const vm = await getProposalById(id);
  if (!vm) notFound();

  if (searchParams.view === 'deck') {
    return <ProposalSlides vm={vm} previewToken={preview} editorial={await buildEditorialSlides()} mode="deck" />;
  }
  return <ProposalDocument vm={vm} previewToken={preview} />;
}
