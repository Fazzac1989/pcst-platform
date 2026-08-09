import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  return (
    <div>
      <h1 className="papp-page-title">Support</h1>

      {trip.contacts.length > 0 && (
        <section className="papp-card">
          <h2>📞 Key contacts</h2>
          <div className="papp-doclist">
            {trip.contacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone.replace(/\s/g, '')}`} className="papp-doc">
                <span className="papp-doc-title">{c.label}</span>
                <span className="papp-contact-phone">{c.phone}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {member.role === 'teacher' && trip.confirmations.length > 0 && (
        <section className="papp-card">
          <h2>🔖 Confirmation numbers</h2>
          <table className="papp-table">
            <tbody>
              {trip.confirmations.map((c, i) => (
                <tr key={i}>
                  <td>{c.label}</td>
                  <td className="papp-mono">{c.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="papp-card">
        <h2>💬 Message us</h2>
        <p className="papp-note" style={{ margin: '0 0 10px' }}>
          {member.role === 'teacher'
            ? 'Your direct line to the PCT team — we reply around the clock while you travel.'
            : member.role === 'parent'
              ? 'Send a message to your child — they will see it in their Messages tab.'
              : 'Message home any time — your family sees it instantly.'}
        </p>
        <Link href="/app/trip/messages" className="btn btn-brass" style={{ display: 'inline-block' }}>
          Open Messages
        </Link>
      </section>

      <section className="papp-card">
        <h2>📄 All documents</h2>
        <p className="papp-note" style={{ margin: '0 0 10px' }}>
          Every file for this trip in one place — flights, vouchers, maps and tickets.
        </p>
        <Link href="/app/trip/documents" className="btn btn-outline" style={{ display: 'inline-block' }}>
          Browse documents
        </Link>
      </section>
    </div>
  );
}
