import { redirect } from 'next/navigation';
import { getMemberDocuments } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

const KIND_META: Record<string, { label: string; icon: string }> = {
  flight: { label: 'Flights', icon: '✈️' },
  hotel: { label: 'Hotel vouchers', icon: '🏨' },
  ticket: { label: 'E-tickets', icon: '🎫' },
  map: { label: 'Maps', icon: '🗺️' },
  sightseeing: { label: 'Nearby sightseeing', icon: '📍' },
  other: { label: 'Other documents', icon: '📄' },
};
const KIND_ORDER = ['flight', 'hotel', 'ticket', 'map', 'sightseeing', 'other'];

export default async function DocumentsPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');

  const docs = await getMemberDocuments(session.member);
  const byKind = new Map<string, typeof docs>();
  for (const d of docs) {
    const list = byKind.get(d.kind) ?? [];
    list.push(d);
    byKind.set(d.kind, list);
  }

  return (
    <div>
      {KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
        <section className="papp-card" key={kind}>
          <h2>
            {KIND_META[kind].icon} {KIND_META[kind].label}
          </h2>
          <div className="papp-doclist">
            {byKind.get(kind)!.map((d) => (
              <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="papp-doc">
                <span className="papp-doc-title">
                  {d.title}
                  {d.memberName && <span className="papp-doc-owner"> · {d.memberName}</span>}
                </span>
                <span className="papp-doc-dl">↓</span>
              </a>
            ))}
          </div>
        </section>
      ))}
      {docs.length === 0 && (
        <section className="papp-card">
          <p className="papp-empty">
            No documents yet — flight details, hotel vouchers, maps and tickets will appear here
            before departure.
          </p>
        </section>
      )}
    </div>
  );
}
