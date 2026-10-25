import { describe, expect, it } from 'vitest';
import { groupRooms, mapsUrl, parseHotels, roomFor, stayLabel } from '@/lib/app/accommodation';

const students = [
  { id: 1, fullName: 'Adam Kowalski', room: 'Room 1' },
  { id: 2, fullName: 'Aisha Patel', room: 'Room 2' },
  { id: 3, fullName: 'Chloé Dubois', room: 'Room 1' },
  { id: 4, fullName: 'Daniel Okafor', room: null },
];

describe('accommodation', () => {
  it('finds a student’s room and roommates by link, or by name', () => {
    expect(roomFor({ portalStudentId: 1, name: 'Someone else' }, students)).toEqual({ room: 'Room 1', roommates: ['Chloé Dubois'] });
    expect(roomFor({ portalStudentId: null, name: 'chloe  dubois' }, students)).toEqual({ room: 'Room 1', roommates: ['Adam Kowalski'] });
    expect(roomFor({ portalStudentId: null, name: 'Daniel Okafor' }, students)).toBeNull();
    expect(roomFor({ portalStudentId: null, name: 'Nobody' }, students)).toBeNull();
  });

  it('groups the rooming list with unassigned students last', () => {
    expect(groupRooms([...students, { id: 5, fullName: 'Zed', room: 'Room 10' }]).map((r) => r.room)).toEqual([
      'Room 1',
      'Room 2',
      'Room 10',
      'Not yet in a room',
    ]);
  });

  it('tidies stored hotels and labels the stay', () => {
    const [h] = parseHotels([{ name: ' Hotel Roma ', address: 'Via Nazionale 1', from: '2026-10-13', to: '2026-10-16', wifi: 1 }, { name: '' }]);
    expect(h).toMatchObject({ name: 'Hotel Roma', wifi: '', from: '2026-10-13' });
    expect(stayLabel(h)).toBe('Tue 13 Oct – Fri 16 Oct · 3 nights');
    expect(parseHotels('nope')).toEqual([]);
    expect(mapsUrl(h)).toContain('Hotel%20Roma%2C%20Via%20Nazionale%201');
  });
});
