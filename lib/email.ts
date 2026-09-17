import 'server-only';

/**
 * Transactional email via the Resend REST API. If RESEND_API_KEY is not
 * configured, sends are skipped (bookings are still stored) and we log
 * server-side so nothing user-facing breaks.
 */

const TYPE_LABELS: Record<string, string> = {
  we_visit: 'a visit to your school',
  you_visit: 'a meeting at our Dubai office',
  online: 'an online meeting',
};

export function appointmentTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to);
    return false;
  }
  const from =
    process.env.RESEND_FROM ?? 'Premium Choice School Trips <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error('[email] Resend error', res.status, await res.text());
    return false;
  }
  return true;
}

type AppointmentDetails = {
  name: string;
  school: string;
  email: string;
  appointmentType: string;
  tripTitle?: string | null;
};

export async function sendAppointmentConfirmation(d: AppointmentDetails): Promise<boolean> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const logo = `${site}/images/logo-navy.png`;
  const regarding = d.tripTitle ? ` regarding <strong>${d.tripTitle}</strong>` : '';
  const html = `
  <div style="margin:0;padding:32px 16px;background:#f4f5f6;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(22,36,46,.14);border-radius:4px;overflow:hidden;">
      <div style="padding:32px 40px 24px;border-bottom:3px solid #19BAAB;">
        <img src="${logo}" alt="Premium Choice School Trips" width="240" style="display:block;max-width:240px;height:auto;" />
      </div>
      <div style="padding:32px 40px;color:#16242E;">
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:normal;line-height:1.3;">
          Thank you, ${d.name} — <em style="color:#12897E;">we've received your request.</em>
        </h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#425964;">
          You've asked for ${TYPE_LABELS[d.appointmentType] ?? 'an appointment'}${regarding},
          for <strong>${d.school}</strong>.
        </p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#425964;">
          Our Dubai team will come back to you within <strong>24 hours</strong> to arrange a
          time that suits you.
        </p>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.65;color:#425964;">
          Warm regards,<br/>
          <strong style="color:#16242E;">The Premium Choice School Trips team</strong>
        </p>
      </div>
      <div style="padding:20px 40px;background:#16242E;color:rgba(244,243,238,.72);font-size:12.5px;line-height:1.7;">
        Premium Choice Travel · Dubai, United Arab Emirates<br/>
        <a href="tel:+97144206965" style="color:#19BAAB;text-decoration:none;">+971 4 420 6965</a> ·
        <a href="mailto:info@premiumchoicetravel.com" style="color:#19BAAB;text-decoration:none;">info@premiumchoicetravel.com</a>
      </div>
    </div>
  </div>`;
  return sendEmail(
    d.email,
    "We've received your appointment request — Premium Choice School Trips",
    html
  );
}

export async function sendQuoteShareEmail(d: {
  to: string;
  teacherName: string | null;
  schoolName: string | null;
  quoteTitle: string;
  ref: string;
  link: string;
}): Promise<boolean> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const logo = `${site}/images/logo-navy.png`;
  const greeting = d.teacherName ? `Dear ${d.teacherName}` : 'Hello';
  const html = `
  <div style="margin:0;padding:32px 16px;background:#f4f5f6;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(22,36,46,.14);border-radius:4px;overflow:hidden;">
      <div style="padding:32px 40px 24px;border-bottom:3px solid #19BAAB;">
        <img src="${logo}" alt="Premium Choice School Trips" width="240" style="display:block;max-width:240px;height:auto;" />
      </div>
      <div style="padding:32px 40px;color:#16242E;">
        <h1 style="margin:0 0 16px;font-size:23px;font-weight:normal;line-height:1.3;">
          ${greeting} — <em style="color:#12897E;">your personalised quote is ready.</em>
        </h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#425964;">
          We've prepared <strong>${d.quoteTitle}</strong> (${d.ref})${d.schoolName ? ` for <strong>${d.schoolName}</strong>` : ''}.
          You can view it online, download the PDF itinerary, and send us questions or change
          requests directly on the page.
        </p>
        <p style="margin:26px 0;">
          <a href="${d.link}" style="display:inline-block;background:#19BAAB;color:#16242E;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:.04em;padding:14px 28px;border-radius:2px;text-decoration:none;">
            View your quote →
          </a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#425964;">
          Or copy this link: <a href="${d.link}" style="color:#12897E;">${d.link}</a>
        </p>
      </div>
      <div style="padding:20px 40px;background:#16242E;color:rgba(244,243,238,.72);font-size:12.5px;line-height:1.7;">
        Premium Choice Travel · Dubai, United Arab Emirates<br/>
        <a href="tel:+97144206965" style="color:#19BAAB;text-decoration:none;">+971 4 420 6965</a> ·
        <a href="mailto:info@premiumchoicetravel.com" style="color:#19BAAB;text-decoration:none;">info@premiumchoicetravel.com</a>
      </div>
    </div>
  </div>`;
  return sendEmail(d.to, `Your school trip quote ${d.ref} — Premium Choice School Trips`, html);
}

/** Tells the team a teacher has accepted a quote. Nothing is invoiced. */
export async function sendQuoteAcceptedNotification(d: {
  ref: string;
  quoteTitle: string;
  teacherName: string;
  schoolName: string;
  teacherEmail: string;
}): Promise<boolean> {
  const notify = process.env.APPOINTMENT_NOTIFY_EMAIL;
  if (!notify) return false;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#16242E;line-height:1.6;">
    <h2 style="margin:0 0 12px;">Quote ${d.ref} accepted</h2>
    <p><strong>${d.teacherName}</strong> at <strong>${d.schoolName}</strong> has accepted
    <strong>${d.quoteTitle}</strong>.</p>
    <p>Reply to them at <a href="mailto:${d.teacherEmail}">${d.teacherEmail}</a>, or open the quote
    in the admin: <a href="${site}/admin/quotes">${site}/admin/quotes</a></p>
    <p style="color:#425964;">No payment has been taken — this is a notification only.</p>
  </div>`;
  return sendEmail(notify, `Quote ${d.ref} accepted — ${d.schoolName}`, html);
}

export async function sendAppointmentNotification(d: AppointmentDetails): Promise<boolean> {
  const notify = process.env.APPOINTMENT_NOTIFY_EMAIL;
  if (!notify) return false;
  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#16242E;line-height:1.6;">
    <h2 style="margin:0 0 12px;">New appointment request</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td style="color:#425964;">Name</td><td><strong>${d.name}</strong></td></tr>
      <tr><td style="color:#425964;">School</td><td>${d.school}</td></tr>
      <tr><td style="color:#425964;">Email</td><td><a href="mailto:${d.email}">${d.email}</a></td></tr>
      <tr><td style="color:#425964;">Type</td><td>${TYPE_LABELS[d.appointmentType] ?? d.appointmentType}</td></tr>
      ${d.tripTitle ? `<tr><td style="color:#425964;">Trip</td><td>${d.tripTitle}</td></tr>` : ''}
    </table>
    <p style="color:#425964;">The 24-hour reply clock is running — full details in the admin panel under Appointments.</p>
  </div>`;
  return sendEmail(notify, `New appointment request — ${d.name}, ${d.school}`, html);
}

/**
 * The team's cue to pick up the phone.
 *
 * A proposal is usually followed up by a call, and the useful moment for that
 * is when the school has actually opened it rather than when it was sent.
 * Silent when PROPOSAL_NOTIFY_EMAIL is unset, like the other notifications.
 */
export async function sendProposalViewedNotification(d: {
  title: string;
  school: string | null;
  id: number;
}): Promise<boolean> {
  const notify = process.env.PROPOSAL_NOTIFY_EMAIL ?? process.env.APPOINTMENT_NOTIFY_EMAIL;
  if (!notify) return false;

  const admin = process.env.PCT_ADMIN_URL ?? 'https://premium-choice-travel.vercel.app';
  const html = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#16242E;line-height:1.6;">
    <h2 style="margin:0 0 12px;">A proposal has been opened</h2>
    <table cellpadding="6" style="border-collapse:collapse;">
      <tr><td style="color:#425964;">Proposal</td><td><strong>${d.title}</strong></td></tr>
      ${d.school ? `<tr><td style="color:#425964;">School</td><td>${d.school}</td></tr>` : ''}
    </table>
    <p style="color:#425964;">
      This is the first time it has been opened.
      <a href="${admin}/admin/school-trips/proposals/${d.id}" style="color:#12897E;">Open it in the admin panel</a>.
    </p>
  </div>`;

  return sendEmail(
    notify,
    `Proposal opened — ${d.school ? `${d.school}, ` : ''}${d.title}`,
    html
  );
}
