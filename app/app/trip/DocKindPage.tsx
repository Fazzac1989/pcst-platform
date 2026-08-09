import { redirect } from 'next/navigation';
import { getMemberDocuments } from '@/lib/app/data';
import { getAppSession } from '@/lib/app/session';

/** Shared renderer for the document-filtered card pages (flights, accommodation, vouchers). */
export default async function DocKindPage({
  title,
  kinds,
  sections,
  emptyText,
}: {
  title: string;
  kinds: string[];
  sections: Record<string, string>;
  emptyText: string;
}) {
  const session = await getAppSession();
  if (!session) redirect('/app');

  const docs = (await getMemberDocuments(session.member)).filter((d) => kinds.includes(d.kind));

  return (
    <div>
      <h1 className="papp-page-title">{title}</h1>
      {kinds
        .filter((k) => docs.some((d) => d.kind === k))
        .map((kind) => (
          <section className="papp-card" key={kind}>
            <h2>{sections[kind]}</h2>
            <div className="papp-doclist">
              {docs
                .filter((d) => d.kind === kind)
                .map((d) => (
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
          <p className="papp-empty">{emptyText}</p>
        </section>
      )}
    </div>
  );
}
