/**
 * Learning challenges and the pre-arrival checklist: the pure rules shared by
 * the app's pages and its server actions. No `server-only`, so client
 * components can use the same shapes.
 */

export type Challenge = {
  id: number;
  date: string | null;
  title: string;
  fact: string;
  question: string;
  options: string[];
  answer: number;
  points: number;
  sortOrder: number;
};

export type ChallengeAnswer = {
  challengeId: number;
  memberId: number;
  choice: number;
  correct: boolean;
  points: number;
  answeredAt: string;
};

export type LeaderRow = {
  memberId: number;
  name: string;
  points: number;
  correct: number;
  answered: number;
  rank: number;
};

export type UnlockMode = 'daily' | 'all';

/** Today's date as the app counts it (YYYY-MM-DD). */
export const todayIso = (now: Date = new Date()) => now.toISOString().slice(0, 10);

/**
 * A challenge opens on its own day, so it is answered on location — unless
 * the trip is set to open them all at once (for a quiz before travel, or to try
 * the app out).
 */
export function isUnlocked(date: string | null, mode: UnlockMode, today: string): boolean {
  if (mode === 'all' || !date) return true;
  return date <= today;
}

/** "Aisha Patel" → "Aisha P.": enough for classmates, no more on a shared board. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * The overall leaderboard: most points first. Level on points, the student
 * with more right answers goes ahead; still level, whoever got there first
 * (the earlier final scoring answer) — so there is always one winner.
 */
export function leaderboard(students: { id: number; name: string }[], answers: ChallengeAnswer[]): LeaderRow[] {
  const rows = students.map((s) => {
    const mine = answers.filter((a) => a.memberId === s.id);
    const scoring = mine.filter((a) => a.points > 0).map((a) => a.answeredAt).sort();
    return {
      memberId: s.id,
      name: s.name,
      points: mine.reduce((n, a) => n + a.points, 0),
      correct: mine.filter((a) => a.correct).length,
      answered: mine.length,
      reachedAt: scoring[scoring.length - 1] ?? '9999',
    };
  });
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.correct - a.correct ||
      a.reachedAt.localeCompare(b.reachedAt) ||
      a.name.localeCompare(b.name)
  );
  return rows.map(({ reachedAt: _reachedAt, ...r }, i) => ({ ...r, rank: i + 1 }));
}

/** Points on offer across the whole trip. */
export const totalPoints = (challenges: Pick<Challenge, 'points'>[]) => challenges.reduce((n, c) => n + c.points, 0);

/** The answer is checked against the stored option, so the points can't be claimed by anything else. */
export function markAnswer(challenge: Pick<Challenge, 'answer' | 'options' | 'points'>, choice: number) {
  const valid = Number.isInteger(choice) && choice >= 0 && choice < challenge.options.length;
  const correct = valid && choice === challenge.answer;
  return { valid, correct, points: correct ? challenge.points : 0 };
}

// ─── Pre-arrival checklist ────────────────────────────────────────────

export type ChecklistItem = { id: number; title: string; detail: string; dueDate: string | null; sortOrder: number };
export type ChecklistTick = { itemId: number; studentId: number; tickedAt: string };

/** How far each student's family has got. */
export function checklistProgress(items: ChecklistItem[], ticks: ChecklistTick[], studentId: number) {
  const done = new Set(ticks.filter((t) => t.studentId === studentId).map((t) => t.itemId));
  const open = items.filter((i) => !done.has(i.id));
  return { done: items.length - open.length, total: items.length, open };
}
