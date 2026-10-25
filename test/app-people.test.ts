import { describe, expect, it } from 'vitest';
import { ageOn, initials, registerCount, telHref } from '@/lib/app/people';

describe('teacher register helpers', () => {
  it('works out age on the day of travel', () => {
    expect(ageOn('2012-10-20', '2026-10-13')).toBe(13);
    expect(ageOn('2012-10-13', '2026-10-13')).toBe(14);
  });

  it('makes a dialable number and initials', () => {
    expect(telHref('+971 (50) 123-4567')).toBe('tel:+971501234567');
    expect(telHref('050 123 4567')).toBe('tel:0501234567');
    expect(initials('Mary Jane van der Berg')).toBe('MB');
    expect(initials('Cher')).toBe('C');
  });

  it('counts the day’s register', () => {
    expect(
      registerCount([1, 2, 3, 4], [
        { studentId: 1, status: 'present' },
        { studentId: 2, status: 'absent' },
        { studentId: 9, status: 'present' },
      ])
    ).toEqual({ present: 1, absent: 1, unmarked: 2 });
  });
});
