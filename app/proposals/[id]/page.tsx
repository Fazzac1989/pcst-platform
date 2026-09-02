import { notFound } from 'next/navigation';
import ProposalSlides from '@/components/proposal/ProposalSlides';
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

export default async function ProposalPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const vm = await getProposalById(id);
  if (!vm) notFound();

  return <ProposalSlides vm={vm} />;
}
