import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { findInvite, recordInviteOpen } from '@/lib/brochure/invites';
import '@/components/slides/deck.css';
import '@/components/brochure/invite.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'A brochure for you',
  robots: { index: false, follow: false },
};

/**
 * The page a teacher lands on.
 *
 * Their name, their school's mark, a few words from us, and one button into
 * the brochure. The brochure is the same for everyone; this page is the part
 * that is theirs. It is deliberately short — the brochure is the thing.
 */
export default async function InvitePage({ params }: { params: { token: string } }) {
  const found = await findInvite(params.token);
  if (!found) notFound();
  const { invite, brochure } = found;

  if (brochure.status !== 'published') {
    return (
      <main className="inv">
        <div className="inv-card">
          <h1>Not quite ready</h1>
          <p className="inv-msg">This brochure is still being finished. Please try the link again shortly.</p>
        </div>
      </main>
    );
  }

  await recordInviteOpen(invite.id, headers().get('user-agent'));

  const firstName = invite.teacherName.trim().split(/\s+/)[0] || 'there';
  const via = `?via=${encodeURIComponent(invite.token)}`;
  const openHref = `/brochures/${encodeURIComponent(brochure.slug)}${via}`;
  const pdfHref = `/api/brochures/${encodeURIComponent(brochure.slug)}/pdf${via}`;
  const paragraphs = invite.message
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="inv">
      <div className="inv-card">
        <div className="inv-marks">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inv-pct" src="/images/logo-navy.png" alt="Premium Choice School Trips" />
          {invite.logoUrl && (
            <span className="inv-school">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={invite.logoUrl} alt={invite.schoolName ? `${invite.schoolName} logo` : 'School logo'} />
            </span>
          )}
        </div>

        <p className="inv-eyebrow">
          A brochure prepared for {invite.schoolName ? invite.schoolName : invite.teacherName}
        </p>
        <h1>Hello {firstName},</h1>

        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p className="inv-msg" key={i}>
              {p}
            </p>
          ))
        ) : (
          <p className="inv-msg">
            We have put together a selection of trips we think would suit your students. Have a
            look through, and we would be glad to talk any of them over.
          </p>
        )}

        <a className="inv-brochure" href={openHref}>
          {brochure.coverImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={brochure.coverImage} alt="" />
          ) : (
            <span className="inv-cover" aria-hidden="true" />
          )}
          <span className="inv-brochure-text">
            <span className="inv-brochure-kicker">The brochure</span>
            <strong>{brochure.title}</strong>
            {brochure.subtitle && <span>{brochure.subtitle}</span>}
            <span className="inv-brochure-meta">
              {brochure.tripIds.length} trip{brochure.tripIds.length === 1 ? '' : 's'}
            </span>
          </span>
        </a>

        <div className="inv-actions">
          <a className="inv-btn" href={openHref}>
            Open the brochure
          </a>
          <a className="inv-btn inv-btn--quiet" href={pdfHref}>
            Download as PDF
          </a>
        </div>

        <p className="inv-foot">
          Premium Choice School Trips · Dubai ·{' '}
          <a href="tel:+97144206965">+971 4 420 6965</a> ·{' '}
          <a href="mailto:info@premiumchoicetravel.com">info@premiumchoicetravel.com</a>
        </p>
      </div>
    </main>
  );
}
