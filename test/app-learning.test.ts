import { describe, expect, it } from 'vitest';
import { checklistProgress, isUnlocked, leaderboard, markAnswer, shortName, totalPoints } from '@/lib/app/learning';

const ans = (challengeId: number, memberId: number, points: number, answeredAt: string) => ({
  challengeId,
  memberId,
  choice: 0,
  correct: points > 0,
  points,
  answeredAt,
});

describe('learning challenges', () => {
  it('opens a challenge on its day, or all at once when the trip says so', () => {
    expect(isUnlocked('2026-10-14', 'daily', '2026-10-13')).toBe(false);
    expect(isUnlocked('2026-10-14', 'daily', '2026-10-14')).toBe(true);
    expect(isUnlocked('2026-10-14', 'all', '2026-09-01')).toBe(true);
    expect(isUnlocked(null, 'daily', '2026-09-01')).toBe(true);
  });

  it('marks against the stored answer and rejects an option that does not exist', () => {
    const c = { answer: 2, options: ['a', 'b', 'c', 'd'], points: 15 };
    expect(markAnswer(c, 2)).toEqual({ valid: true, correct: true, points: 15 });
    expect(markAnswer(c, 1)).toEqual({ valid: true, correct: false, points: 0 });
    expect(markAnswer(c, 7).valid).toBe(false);
    expect(markAnswer(c, 1.5).valid).toBe(false);
  });

  it('ranks by points, then right answers, then who got there first', () => {
    const students = [
      { id: 1, name: 'Adam Kowalski' },
      { id: 2, name: 'Aisha Patel' },
      { id: 3, name: 'Chloe Dubois' },
      { id: 4, name: 'Zane Idle' },
    ];
    const answers = [
      ans(10, 1, 10, '2026-10-14T10:00:00Z'),
      ans(11, 1, 10, '2026-10-14T12:00:00Z'),
      ans(10, 2, 10, '2026-10-14T09:00:00Z'),
      ans(11, 2, 10, '2026-10-14T11:00:00Z'),
      ans(10, 3, 0, '2026-10-14T08:00:00Z'),
    ];
    const board = leaderboard(students, answers);
    // Adam and Aisha are level; Aisha reached 20 first.
    expect(board.map((r) => [r.name, r.points, r.rank])).toEqual([
      ['Aisha Patel', 20, 1],
      ['Adam Kowalski', 20, 2],
      ['Chloe Dubois', 0, 3],
      ['Zane Idle', 0, 4],
    ]);
    expect(board[2]).toMatchObject({ answered: 1, correct: 0 });
    expect(totalPoints([{ points: 10 }, { points: 15 }])).toBe(25);
  });

  it('shows classmates a first name and an initial', () => {
    expect(shortName('Aisha Patel')).toBe('Aisha P.');
    expect(shortName('Mary Jane van der Berg')).toBe('Mary B.');
    expect(shortName('Cher')).toBe('Cher');
  });
});

describe('pre-arrival checklist', () => {
  it('counts each family’s ticks and lists what is still open', () => {
    const items = [1, 2, 3].map((id) => ({ id, title: `Item ${id}`, detail: '', dueDate: null, sortOrder: id }));
    const ticks = [
      { itemId: 1, studentId: 7, tickedAt: '' },
      { itemId: 3, studentId: 7, tickedAt: '' },
      { itemId: 2, studentId: 8, tickedAt: '' },
    ];
    const p = checklistProgress(items, ticks, 7);
    expect(p.done).toBe(2);
    expect(p.total).toBe(3);
    expect(p.open.map((i) => i.id)).toEqual([2]);
  });
});
