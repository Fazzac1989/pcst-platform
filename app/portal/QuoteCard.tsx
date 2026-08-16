'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { acceptQuote } from '@/lib/portal/actions';

export type PortalQuote = {
  id: number;
  ref: string;
  title: string;
  status: 'published' | 'accepted';
  token: string;
  travelDates: string | null;
  validity: string | null;
  pupils: number | null;
  staff: number | null;
  acceptedAt: string | null;
  total: string;
  perStudent: string | null;
};

export default function QuoteCard({ quote }: { quote: PortalQuote }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    setBusy(true);
    setError(null);
    const res = await acceptQuote(quote.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <article className={`pt-quote${quote.status === 'accepted' ? ' accepted' : ''}`}>
      <div className="pt-quote-top">
        <span className="pt-ref">{quote.ref}</span>
        {quote.status === 'accepted' && <span className="pt-badge">Accepted</span>}
      </div>
      <h3>{quote.title}</h3>

      <dl className="pt-quote-facts">
        {quote.travelDates && (
          <div>
            <dt>Dates</dt>
            <dd>{quote.travelDates}</dd>
          </div>
        )}
        {quote.pupils && (
          <div>
            <dt>Group</dt>
            <dd>
              {quote.pupils} students{quote.staff ? ` · ${quote.staff} staff` : ''}
            </dd>
          </div>
        )}
        <div>
          <dt>Total</dt>
          <dd className="pt-total">{quote.total}</dd>
        </div>
        {quote.perStudent && (
          <div>
            <dt>Per student</dt>
            <dd>{quote.perStudent}</dd>
          </div>
        )}
        {quote.status === 'published' && quote.validity && (
          <div>
            <dt>Valid until</dt>
            <dd>{new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          </div>
        )}
      </dl>

      {error && <p className="pt-error">{error}</p>}

      <div className="pt-quote-actions">
        <a className="btn btn-ink" href={`/quotes/${quote.token}`} target="_blank" rel="noreferrer">
          Read the full quote
        </a>
        {quote.status === 'published' &&
          (confirming ? (
            <>
              <button className="btn btn-brass" onClick={onAccept} disabled={busy}>
                {busy ? 'Accepting…' : 'Yes, accept it'}
              </button>
              <button className="pt-link-btn" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </button>
            </>
          ) : (
            <button className="btn btn-brass" onClick={() => setConfirming(true)}>
              Accept this quote
            </button>
          ))}
      </div>

      {confirming && quote.status === 'published' && (
        <p className="pt-hint">
          Accepting tells our team you&apos;d like to go ahead — nothing is charged and no payment
          is taken. We&apos;ll be in touch to confirm the details.
        </p>
      )}
      {quote.status === 'accepted' && quote.acceptedAt && (
        <p className="pt-hint">
          Accepted on{' '}
          {new Date(quote.acceptedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          . Our team will be in touch with next steps.
        </p>
      )}
    </article>
  );
}
