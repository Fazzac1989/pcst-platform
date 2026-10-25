'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { answerChallenge } from '@/lib/app/actions';

export type ChallengeView = {
  id: number;
  title: string;
  points: number;
  unlocked: boolean;
  unlocksOn: string | null; // "Tue 14 Oct", for a locked one
  fact: string;
  question: string;
  options: string[];
  /** The right option — only sent once it can't give anything away. */
  answer: number | null;
  /** This student's (or their child's) answer, if given. */
  mine: { choice: number; correct: boolean; points: number } | null;
  /** For teachers: how the group did. */
  tally: { answered: number; correct: number; of: number } | null;
};

/**
 * One line of the learning checklist: closed it shows a tick, a lock or the
 * points on offer; open it shows what to learn and the question.
 */
export default function ChallengeCard({ c, canAnswer }: { c: ChallengeView; canAnswer: boolean }) {
  const router = useRouter();
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ choice: number; correct: boolean; points: number; answer: number } | null>(null);

  const mine = result ?? (c.mine && { ...c.mine, answer: c.answer ?? -1 });
  const answer = result?.answer ?? c.answer;
  const status = !c.unlocked ? 'locked' : mine ? (mine.correct ? 'right' : 'wrong') : 'open';

  async function submit() {
    if (choice === null) return;
    setBusy(true);
    setError(null);
    const r = await answerChallenge(c.id, choice);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setResult({ choice, correct: r.correct, points: r.points, answer: r.answer });
    router.refresh();
  }

  return (
    <details className={`papp-chal ${status}`}>
      <summary>
        <span className="papp-chal-mark" aria-hidden="true">
          {status === 'locked' ? '🔒' : status === 'right' ? '✓' : status === 'wrong' ? '✗' : ''}
        </span>
        <span className="papp-chal-title">
          {c.title}
          {status === 'locked' && c.unlocksOn && <small>Opens {c.unlocksOn}</small>}
          {c.tally && (
            <small>
              {c.tally.answered} of {c.tally.of} answered · {c.tally.correct} right
            </small>
          )}
        </span>
        <span className="papp-chal-pts">{mine ? `+${mine.points}` : `${c.points} pts`}</span>
      </summary>

      {status === 'locked' ? (
        <p className="papp-chal-fact">This one opens on its day, so you can answer it on the spot.</p>
      ) : (
        <div className="papp-chal-body">
          {c.fact && <p className="papp-chal-fact">{c.fact}</p>}
          <p className="papp-chal-q">{c.question}</p>
          <div className="papp-chal-opts" role="radiogroup" aria-label={c.question}>
            {c.options.map((o, i) => {
              const picked = mine ? mine.choice === i : choice === i;
              const isAnswer = answer === i;
              const cls = mine || answer !== null ? (isAnswer ? 'right' : picked ? 'wrong' : '') : picked ? 'picked' : '';
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  className={`papp-chal-opt ${cls}`}
                  disabled={!canAnswer || Boolean(mine) || busy}
                  onClick={() => setChoice(i)}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {canAnswer && !mine && (
            <button className="btn btn-brass papp-chal-go" disabled={choice === null || busy} onClick={submit}>
              {busy ? 'Checking…' : 'Lock in my answer'}
            </button>
          )}
          {mine && (
            <p className={`papp-chal-result ${mine.correct ? 'right' : 'wrong'}`}>
              {mine.correct ? `Correct — ${mine.points} points!` : 'Not this time — the right answer is highlighted.'}
            </p>
          )}
          {canAnswer && !mine && <p className="papp-note">One try only, so read the story first.</p>}
          {error && <p className="papp-error">{error}</p>}
        </div>
      )}
    </details>
  );
}
