import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendProposalViewedNotification } from '@/lib/email';

/**
 * Who has opened a proposal, and when.
 *
 * `proposal_events` is the record: it is append-only, so two people opening the
 * link at once cannot lose a view the way a read-then-increment counter would.
 * `brochures.view_count` is kept in step as a convenience for anything reading
 * the row directly, but it is derived from the events rather than incremented.
 */

/**
 * Link previewers are not readers.
 *
 * Sending a proposal by email means it gets fetched by Outlook, WhatsApp, Slack
 * and whatever scanner sits in front of the school's mail. Counting those would
 * tell you a proposal had been read before anyone had looked at it — worse than
 * no number at all, because it is the number a follow-up call is based on.
 */
const BOT_PATTERNS = [
  'bot',
  'crawler',
  'spider',
  'preview',
  'facebookexternalhit',
  'whatsapp',
  'slackbot',
  'telegrambot',
  'discordbot',
  'twitterbot',
  'linkedinbot',
  'skypeuripreview',
  'bingpreview',
  'googlebot',
  'applebot',
  'petalbot',
  'yandex',
  'curl/',
  'wget/',
  'python-requests',
  'node-fetch',
  'headlesschrome',
  'monitoring',
  'pingdom',
  'uptimerobot',
  // Microsoft's link scanners, which open every URL in a mail sent to a school.
  'microsoftpreview',
  'office',
  'outlook',
  'ms-office',
];

export function looksLikeBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // No user agent at all is not a person in a browser.
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

/**
 * Our own PDF renderer opens the page in headless Chromium on every build.
 * Those loads are already recorded as `pdf_downloaded`, so counting them again
 * as views would double every download.
 */
export function isOwnRenderer(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && userAgent.toLowerCase().includes('headlesschrome'));
}

export type ViewOutcome =
  | { counted: false; reason: 'bot' | 'renderer' | 'error' }
  | { counted: true; firstView: boolean; views: number };

export async function recordProposalView(
  brochure: { id: number; status?: string | null; first_viewed_at?: string | null; prepared_for?: string | null; title?: string | null },
  userAgent: string | null | undefined,
): Promise<ViewOutcome> {
  if (isOwnRenderer(userAgent)) return { counted: false, reason: 'renderer' };
  if (looksLikeBot(userAgent)) return { counted: false, reason: 'bot' };

  const db = createAdminClient();

  try {
    const firstView = !brochure.first_viewed_at;

    await db.from('proposal_events').insert({
      brochure_id: brochure.id,
      event: 'viewed',
      metadata: { firstView },
    });

    // Derived rather than incremented, so concurrent opens converge.
    const { count } = await db
      .from('proposal_events')
      .select('id', { count: 'exact', head: true })
      .eq('brochure_id', brochure.id)
      .eq('event', 'viewed');

    const update: Record<string, unknown> = { view_count: count ?? 1 };
    if (firstView) update.first_viewed_at = new Date().toISOString();
    // A proposal that has been read is no longer merely sent. Anything further
    // along — accepted, say — is left alone.
    if (brochure.status === 'sent') update.status = 'viewed';

    await db.from('brochures').update(update).eq('id', brochure.id);

    if (firstView) {
      // Worth knowing the moment it happens; a proposal is usually followed up
      // by a phone call, and this is the cue for it.
      await sendProposalViewedNotification({
        title: brochure.title ?? 'Untitled proposal',
        school: brochure.prepared_for ?? null,
        id: brochure.id,
      }).catch(() => false);
    }

    return { counted: true, firstView, views: count ?? 1 };
  } catch (e: any) {
    // A proposal must still render if tracking fails. Losing a view is a
    // nuisance; showing a school an error page is not acceptable.
    console.error('[proposal-tracking]', e?.message);
    return { counted: false, reason: 'error' };
  }
}
