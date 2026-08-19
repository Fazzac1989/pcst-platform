import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import Flipbook from '@/components/brochure/Flipbook';
import ReadingView from '@/components/brochure/ReadingView';
import PasswordGate from '@/components/brochure/PasswordGate';
import '../brochure.css';

/**
 * The public brochure.
 *
 * Rendered per request rather than statically: a brochure can be unlisted or
 * password protected, and those checks have to happen before any content is
 * sent. Published public brochures are cached at the edge instead.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { view?: string; pw?: string; page?: string };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const result = await loadBrochure(params.slug, { password: searchParams.pw });
  if (result.state !== 'ok') return { title: 'Brochure', robots: { index: false, follow: false } };

  const { brochure } = result.data;
  // Only a deliberately public brochure is indexable. A school's bespoke
  // proposal must never turn up in a search result.
  const indexable = brochure.visibility === 'public' && !brochure.hasPassword;

  return {
    title: brochure.seoTitle ?? `${brochure.title} — Premium Choice School Trips`,
    description: brochure.seoDescription ?? brochure.subtitle ?? undefined,
    robots: indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: brochure.title,
      description: brochure.subtitle ?? undefined,
      images: brochure.coverImage ? [{ url: brochure.coverImage }] : undefined,
    },
  };
}

export default async function BrochurePage({ params, searchParams }: Props) {
  const result = await loadBrochure(params.slug, { password: searchParams.pw });

  if (result.state === 'missing') notFound();
  if (result.state === 'draft') {
    return (
      <div className="bgate">
        <div style={{ textAlign: 'center' }}>
          <h1>Not published yet</h1>
          <p>This brochure is still a draft.</p>
        </div>
      </div>
    );
  }
  if (result.state === 'password') {
    return <PasswordGate title={result.title} wrong={Boolean(searchParams.pw)} />;
  }

  const { brochure, pages, trips, brochureQrSvg } = result.data;

  if (searchParams.view === 'read') {
    return <ReadingView brochure={brochure} pages={pages} trips={trips} slug={params.slug} />;
  }

  return (
    <>
      <Flipbook brochure={brochure} pages={pages} trips={trips} brochureQrSvg={brochureQrSvg} />
      {/* Always reachable, and the only route for a screen reader. */}
      <p style={{ textAlign: 'center', padding: '0 0 40px', background: '#0E1A21' }}>
        <a
          href={`/brochures/${params.slug}?view=read${searchParams.pw ? `&pw=${encodeURIComponent(searchParams.pw)}` : ''}`}
          style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, borderBottom: '1px solid currentColor' }}
        >
          Read as a standard page
        </a>
      </p>
    </>
  );
}
