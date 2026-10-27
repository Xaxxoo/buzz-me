'use client';

import type { ReviewRound, Took } from '@/lib/engine';
import type { School } from '@/lib/types';

interface Props {
  active: boolean;
  rounds: ReviewRound[];
  mode: 'match' | 'daily';
  you: School | null;
  rival: School | null;
  onBack: () => void;
}

function TookBadge({ took, you, rival }: { took: Took; you: School | null; rival: School | null }) {
  if (took === 'you') return <span className="review-took took-you">{you?.short ?? 'You'}</span>;
  if (took === 'rival') return <span className="review-took took-rival">{rival?.short ?? 'Rival'}</span>;
  return <span className="review-took took-none">No one</span>;
}

function OptionItem({ text, correctAnswer, yourPick }: { text: string; correctAnswer: string; yourPick: string | null }) {
  const isCorrect = text === correctAnswer;
  const isWrongPick = text === yourPick && !isCorrect;
  const cls = isCorrect ? 'review-opt rv-right' : isWrongPick ? 'review-opt rv-wrong' : 'review-opt';
  return (
    <div className={cls}>
      <span>{text}</span>
      {isCorrect && <span className="rv-label">Correct</span>}
      {isWrongPick && <span className="rv-label">Your pick</span>}
    </div>
  );
}

function RoundCard({ r, you, rival }: { r: ReviewRound; you: School | null; rival: School | null }) {
  return (
    <div className="review-card">
      <div className="review-header">
        <span className="review-round">Q{r.round}</span>
        <span className="review-cat">{r.category}</span>
        <TookBadge took={r.took} you={you} rival={rival} />
      </div>
      <p className="review-qtext">{r.questionText}</p>
      {r.options.length > 0 ? (
        <div className="review-opts">
          {r.options.map((o, i) => (
            <OptionItem key={i} text={o} correctAnswer={r.correctAnswer} yourPick={r.yourPick} />
          ))}
        </div>
      ) : r.correctAnswer ? (
        <p className="review-fallback">Correct answer: <b>{r.correctAnswer}</b></p>
      ) : null}
      {r.bonus && (
        <div className="review-bonus">
          <div className="review-bonus-header">
            <span className="review-bonus-tag">Bonus for {r.bonus.forTeam === 'you' ? (you?.short ?? 'You') : (rival?.short ?? 'Rival')}</span>
            {r.bonus.correct === true && <span className="rv-label rv-right-label">Correct</span>}
            {r.bonus.correct === false && <span className="rv-label rv-wrong-label">Missed</span>}
          </div>
          <p className="review-qtext">{r.bonus.questionText}</p>
          {r.bonus.options.length > 0 ? (
            <div className="review-opts">
              {r.bonus.options.map((o, i) => (
                <OptionItem key={i} text={o} correctAnswer={r.bonus!.correctAnswer} yourPick={r.bonus!.yourPick} />
              ))}
            </div>
          ) : r.bonus.correctAnswer ? (
            <p className="review-fallback">Correct answer: <b>{r.bonus.correctAnswer}</b></p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function Review({ active, rounds, mode, you, rival, onBack }: Props) {
  return (
    <section className="screen review enter flex-auto min-h-0 flex flex-col gap-3" id="s-review" hidden={!active}>
      <div className="head flex items-center gap-3">
        <button className="back" type="button" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
        <h2>Review</h2>
      </div>
      <div className="review-list">
        {rounds.length === 0 && <p className="review-empty">No rounds to review.</p>}
        {rounds.map(r => (
          <RoundCard key={r.round} r={r} you={you} rival={mode === 'daily' ? null : rival} />
        ))}
      </div>
    </section>
  );
}
