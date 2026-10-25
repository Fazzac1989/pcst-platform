import { redirect } from 'next/navigation';
import { getMemberDocuments, getPortalStudentId, getRooming, getTripRoster } from '@/lib/app/data';
import { groupRooms, mapsUrl, roomFor, stayLabel } from '@/lib/app/accommodation';
import { getAppSession } from '@/lib/app/session';

export const dynamic = 'force-dynamic';

/**
 * Where the group is staying: each hotel with its dates, address, phone and
 * wifi; the student's own room and roommates (from the rooming list); and any
 * hotel documents. Teachers get the whole rooming list.
 */
export default async function AccommodationPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const [rooming, docs] = await Promise.all([getRooming(trip.id), getMemberDocuments(member)]);
  const hotelDocs = docs.filter((d) => d.kind === 'hotel');

  // Whose room to show: the student's own, or a parent's child's.
  let mine: ReturnType<typeof roomFor> = null;
  let whose = '';
  if (member.role === 'student' || (member.role === 'parent' && member.parentOf)) {
    const studentId = member.role === 'student' ? member.id : member.parentOf!;
    const name = member.role === 'student' ? member.name : (await getTripRoster(trip.id)).find((m) => m.id === studentId)?.name ?? '';
    whose = name.split(/\s+/)[0];
    mine = roomFor({ portalStudentId: await getPortalStudentId(studentId), name }, rooming);
  }
  const rooms = member.role === 'teacher' ? groupRooms(rooming) : [];

  return (
    <div>
      <h1 className="papp-page-title">Accommodation</h1>

      {mine && (
        <section className="papp-card papp-myroom">
          <div className="papp-myroom-label">{member.role === 'parent' ? `${whose}’s room` : 'Your room'}</div>
          <div className="papp-myroom-name">{mine.room}</div>
          {mine.roommates.length > 0 ? (
            <p>
              Sharing with <strong>{mine.roommates.join(', ')}</strong>
            </p>
          ) : (
            <p>No roommates listed yet.</p>
          )}
          <p className="papp-note">The hotel gives out the actual room numbers at check-in.</p>
        </section>
      )}

      {trip.hotels.map((h, i) => (
        <section className="papp-card papp-hotel" key={i}>
          {trip.hotels.length > 1 && h.from && <div className="papp-hotel-stay">{stayLabel(h)}</div>}
          <h2>🏨 {h.name}</h2>
          {trip.hotels.length === 1 && h.from && <p className="papp-hotel-dates">{stayLabel(h)}</p>}
          {h.address && (
            <a href={mapsUrl(h)} target="_blank" rel="noreferrer" className="papp-hotel-row">
              <span>📍 {h.address}</span>
              <span className="papp-doc-dl">Map →</span>
            </a>
          )}
          {h.phone && (
            <a href={`tel:${h.phone.replace(/[^\d+]/g, '')}`} className="papp-hotel-row">
              <span>📞 {h.phone}</span>
              <span className="papp-doc-dl">Call</span>
            </a>
          )}
          {h.wifi && (
            <div className="papp-hotel-row">
              <span>📶 Wi-Fi: {h.wifi}</span>
            </div>
          )}
          {h.notes && <p className="papp-hotel-notes">{h.notes}</p>}
        </section>
      ))}

      {member.role === 'teacher' && rooms.length > 0 && (
        <section className="papp-card">
          <h2>🛏️ Rooming list</h2>
          <div className="papp-rooms">
            {rooms.map((r) => (
              <div key={r.room} className={`papp-room${r.room === 'Not yet in a room' ? ' none' : ''}`}>
                <div className="papp-room-head">
                  <strong>{r.room}</strong>
                  <span>{r.names.length}</span>
                </div>
                {r.names.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {hotelDocs.length > 0 && (
        <section className="papp-card">
          <h2>Documents</h2>
          <div className="papp-doclist">
            {hotelDocs.map((d) => (
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
      )}

      {!mine && trip.hotels.length === 0 && hotelDocs.length === 0 && rooms.length === 0 && (
        <section className="papp-card">
          <p className="papp-empty">Where you’re staying, and who you’re sharing with, will appear here before departure.</p>
        </section>
      )}
    </div>
  );
}
