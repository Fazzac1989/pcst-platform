import 'server-only';
import { randomInt } from 'node:crypto';

// No 0/O/1/I/L: codes are read off paper and typed on a phone.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * A personal access code, e.g. ROME27-P-7GK4QZ — the same shape the admin
 * issues. The code is the whole of a member's login, so its random part comes
 * from the operating system's secure generator.
 */
export function makeAppCode(prefix: string, role: 'teacher' | 'student' | 'parent'): string {
  const tag = { teacher: 'T', student: 'S', parent: 'P' }[role];
  let rand = '';
  for (let i = 0; i < 6; i++) rand += CODE_CHARS[randomInt(CODE_CHARS.length)];
  const clean = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'TRIP';
  return `${clean}-${tag}-${rand}`;
}
