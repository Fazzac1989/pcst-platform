import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadBrochure } from '@/lib/brochure/data';
import BrochureReport from '@/components/brochure/BrochureReport';
import PasswordGate from '@/components/brochure/PasswordGate';
import '@/components/brochure/gate.css';

/**
 * The public brochure.
 *
 * Rendered per request rather than statically: a brochure can be unlisted or
 * password protected, and those checks have to happen before any content is
 * sent. Published public brochures are cached at the edge instead.
 *
 * It reads as a report — cover, contents, a spread per trip — rather than as a
 * flipbook. One tree serves screen, print and PDF, so the download and the page
 * cannot drift apart, and there is no separate accessible view to keep in step
 * because the document itself is the accessible one.
 */
export const dynamic = 'force-dynamic';

type Props = {
  params: { slug: string };
  searchParams: { pw?: string };
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

  // The password travels with the PDF request, since that route has to load the
  // brochure the same way this page did.
  const pdfHref = `/api/brochures/${encodeURIComponent(params.slug)}/pdf${
    searchParams.pw ? `?pw=${encodeURIComponent(searchParams.pw)}` : ''
  }`;

  return (
    <BrochureReport
      brochure={brochure}
      pages={pages}
      trips={trips}
      brochureQrSvg={brochureQrSvg}
      pdfHref={pdfHref}
    />
  );
}
