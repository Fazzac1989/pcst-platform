import { redirect } from 'next/navigation';
import { getChallengeAnswers, getChallenges, getSchedule, getTripRoster } from '@/lib/app/data';
import { isUnlocked, leaderboard, shortName, todayIso, totalPoints } from '@/lib/app/learning';
import { getAppSession } from '@/lib/app/session';
import ChallengeCard, { type ChallengeView } from './ChallengeCard';

export const dynamic = 'force-dynamic';

const dayLabel = (iso: string) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
const shortDay = (iso: string) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default async function LearningPage() {
  const session = await getAppSession();
  if (!session) redirect('/app');
  const { member, trip } = session;

  const [schedule, challenges, roster] = await Promise.all([getSchedule(trip.id), getChallenges(trip.id), getTripRoster(trip.id)]);
  const answers = await getChallengeAnswers(challenges.map((c) => c.id));
  const students = roster.filter((m) => m.role === 'student');
  const board = leaderboard(students, answers);
  const today = todayIso();

  // Whose answers this person sees: their own, their child's, or (teachers) everyone's tally.
  const subjectId = member.role === 'student' ? member.id : member.role === 'parent' ? member.parentOf : null;
  const myRow = board.find((r) => r.memberId === subjectId) ?? null;

  const views: (ChallengeView & { date: string | null })[] = challenges.map((c) => {
    const unlocked = isUnlocked(c.date, trip.challengesUnlock, today);
    const mineRow = answers.find((a) => a.challengeId === c.id && a.memberId === subjectId);
    const forThis = answers.filter((a) => a.challengeId === c.id);
    const showAnswer = member.role === 'teacher' || Boolean(mineRow);
    return {
      id: c.id,
      date: c.date,
      title: c.title,
      points: c.points,
      unlocked,
      unlocksOn: c.date ? shortDay(c.date) : null,
      // Nothing about a locked question leaves the server but its title.
      fact: unlocked ? c.fact : '',
      question: unlocked ? c.question : '',
      options: unlocked ? c.options : [],
      answer: unlocked && showAnswer ? c.answer : null,
      mine: mineRow ? { choice: mineRow.choice, correct: mineRow.correct, points: mineRow.points } : null,
      tally:
        member.role === 'teacher'
          ? { answered: forThis.length, correct: forThis.filter((a) => a.correct).length, of: students.length }
          : null,
    };
  });

  const dates = Array.from(new Set(views.map((v) => v.date ?? '')));
  const dayNumber = (iso: string) =>
    trip.startDate ? Math.round((Date.parse(iso) - Date.parse(trip.startDate)) / 86400000) + 1 : dates.indexOf(iso) + 1;

  const lessons = schedule.filter((s) => s.educationalContent);
  const lessonDates = Array.from(new Set(lessons.map((l) => l.date)));

  // Classmates see first names and an initial; teachers see everyone in full.
  const shown = member.role === 'teacher' ? board : board.slice(0, 10);
  const meOutside = myRow && !shown.some((r) => r.memberId === myRow.memberId);
  const nameFor = (name: string) => (member.role === 'teacher' ? name : shortName(name));

  return (
    <div>
      <h1 className="papp-page-title">Learning</h1>
      <p className="papp-note">
        Read the story behind each highlight, answer its question and climb the leaderboard.
      </p>

      {(myRow || trip.prize) && challenges.length > 0 && (
        <section className="papp-card papp-score">
          {myRow && (
            <div className="papp-score-row">
              <div>
                <div className="papp-score-pts">{myRow.points}</div>
                <div className="papp-score-label">points{member.role === 'parent' ? ` for ${shortName(students.find((s) => s.id === subjectId)?.name ?? '')}` : ''}</div>
              </div>
              <div>
                <div className="papp-score-pts">#{myRow.rank}</div>
                <div className="papp-score-label">of {board.length}</div>
              </div>
              <div>
                <div className="papp-score-pts">
                  {myRow.answered}/{challenges.length}
                </div>
                <div className="papp-score-label">answered</div>
              </div>
            </div>
          )}
          {trip.prize && (
            <p className="papp-prize">
              🏆 <strong>Prize:</strong> {trip.prize}
            </p>
          )}
          <p className="papp-score-foot">{totalPoints(challenges)} points to win across the trip.</p>
        </section>
      )}

      {dates.map((date) => (
        <section className="papp-card" key={date || 'any'}>
          <h2>{date ? `Day ${dayNumber(date)} · ${dayLabel(date)}` : 'Any time'}</h2>
          <div className="papp-chals">
            {views
              .filter((v) => (v.date ?? '') === date)
              .map((v) => (
                <ChallengeCard key={v.id} c={v} canAnswer={member.role === 'student'} />
              ))}
          </div>
        </section>
      ))}

      {challenges.length > 0 && (
        <section className="papp-card" id="leaderboard">
          <h2>🏆 Leaderboard</h2>
          <ol className="papp-board">
            {shown.map((r) => (
              <li key={r.memberId} className={r.memberId === subjectId ? 'me' : undefined}>
                <span className="papp-board-rank">{r.rank}</span>
                <span className="papp-board-name">{nameFor(r.name)}</span>
                {member.role === 'teacher' && (
                  <span className="papp-board-meta">
                    {r.correct}/{r.answered} right
                  </span>
                )}
                <span className="papp-board-pts">{r.points}</span>
              </li>
            ))}
            {meOutside && myRow && (
              <li className="me">
                <span className="papp-board-rank">{myRow.rank}</span>
                <span className="papp-board-name">{nameFor(myRow.name)}</span>
                <span className="papp-board-pts">{myRow.points}</span>
              </li>
            )}
          </ol>
          <p className="papp-note">Level on points? More right answers goes ahead, then whoever got there first.</p>
        </section>
      )}

      {challenges.length === 0 && (
        <section className="papp-card">
          <p className="papp-empty">
            Challenges and the leaderboard will appear here once your trip team adds them.
          </p>
        </section>
      )}

      {lessonDates.length > 0 && <h2 className="papp-section-title">Notes from the itinerary</h2>}
      {lessonDates.map((date) => (
        <section className="papp-card" key={date}>
          <h2>
            Day {trip.startDate ? dayNumber(date) : lessonDates.indexOf(date) + 1} · {dayLabel(date)}
          </h2>
          {lessons
            .filter((l) => l.date === date)
            .map((l) => (
              <div className="papp-lesson" key={l.id}>
                <h3>{l.title}</h3>
                <p>{l.educationalContent}</p>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
