/** Small display helpers for the teacher's register. Client-safe. */

/** Age in whole years on a given day. */
export function ageOn(dob: string, onDate: string): number | null {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = onDate.split('-').map(Number);
  if (!y || !ty) return null;
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

/** "AP" for Aisha Patel — shown when there's no photo. */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : ''))
    .join('')
    .toUpperCase();

/** A number a phone can dial: keeps digits and a leading +. */
export const telHref = (phone: string) => `tel:${phone.trim().replace(/(?!^\+)[^\d]/g, '')}`;

/** How the day's register stands. */
export function registerCount(studentIds: number[], marks: { studentId: number; status: 'present' | 'absent' }[]) {
  const byId = new Map(marks.map((m) => [m.studentId, m.status]));
  const present = studentIds.filter((id) => byId.get(id) === 'present').length;
  const absent = studentIds.filter((id) => byId.get(id) === 'absent').length;
  return { present, absent, unmarked: studentIds.length - present - absent };
}
