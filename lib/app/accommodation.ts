/**
 * The Accommodation tab's pure helpers: hotel shapes, the stay label and the
 * rooming lookup. No `server-only`, so it can be tested and shared.
 */

export type Hotel = {
  name: string;
  address: string;
  phone: string;
  from: string | null; // check-in date
  to: string | null; // check-out date
  wifi: string;
  notes: string;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Hotels as stored on the trip, tidied; rows without a name are dropped. */
export function parseHotels(raw: unknown): Hotel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h: any) => ({
      name: str(h?.name),
      address: str(h?.address),
      phone: str(h?.phone),
      from: date(h?.from),
      to: date(h?.to),
      wifi: str(h?.wifi),
      notes: str(h?.notes),
    }))
    .filter((h) => h.name);
}

const fmt = (iso: string, withMonth = true) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-GB', withMonth ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' });

/** "Tue 13 Oct – Fri 16 Oct · 3 nights" */
export function stayLabel(h: Pick<Hotel, 'from' | 'to'>): string {
  if (!h.from) return '';
  if (!h.to || h.to <= h.from) return `From ${fmt(h.from)}`;
  const nights = Math.round((Date.parse(h.to) - Date.parse(h.from)) / 86400000);
  return `${fmt(h.from)} – ${fmt(h.to)} · ${nights} night${nights === 1 ? '' : 's'}`;
}

/** A map search for the address — opens the maps app on a phone. */
export const mapsUrl = (h: Pick<Hotel, 'name' | 'address'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([h.name, h.address].filter(Boolean).join(', '))}`;

export const nameKey = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export type RoomingStudent = { id: number; fullName: string; room: string | null };

/** The rooming list grouped by room, rooms in order and unassigned students last. */
export function groupRooms(students: RoomingStudent[]): { room: string; names: string[] }[] {
  const map = new Map<string, string[]>();
  for (const s of students) {
    const key = s.room?.trim() || '';
    map.set(key, [...(map.get(key) ?? []), s.fullName]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'en', { numeric: true })))
    .map(([room, names]) => ({ room: room || 'Not yet in a room', names: names.sort() }));
}

/**
 * A student's room and who they share it with. The app member is matched to
 * their record in the teacher portal by link, or failing that by name.
 */
export function roomFor(
  member: { portalStudentId: number | null; name: string },
  students: RoomingStudent[]
): { room: string; roommates: string[] } | null {
  const me =
    students.find((s) => member.portalStudentId !== null && s.id === member.portalStudentId) ??
    students.find((s) => nameKey(s.fullName) === nameKey(member.name));
  const room = me?.room?.trim();
  if (!me || !room) return null;
  return {
    room,
    roommates: students.filter((s) => s.id !== me.id && s.room?.trim() === room).map((s) => s.fullName).sort(),
  };
}
