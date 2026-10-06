'use client';

import { useEffect, useRef, useState } from 'react';
import { Crest } from '@/components/Crest';
import { StatCells } from '@/components/screens/Stats';
import { DAILY, GAME_NAME } from '@/lib/config';
import { num, shareText, type DailyResult, type MatchResult } from '@/lib/engine';
import { useCountUp } from '@/lib/hooks';

interface Props {
  active: boolean;
  result: MatchResult | DailyResult | null;
  resultKey: number;
  onAgain: () => void;
  onMenu: () => void;
}

/* Remounted for every new result (key), so the scores count up from zero and the copy button resets. */
function Card({ result, onAgain, onMenu }: { result: MatchResult | DailyResult; onAgain: () => void; onMenu: () => void }) {
  const daily = result.kind === 'daily';
  const mine = useCountUp(daily ? result.score : result.scoreYou, 900, 0);
  const theirs = useCountUp(daily ? 0 : result.scoreRival, 900, 0);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle');
  const fallback = useRef<HTMLParagraphElement>(null);
  const text = shareText(result, GAME_NAME);

  /* Where the clipboard is refused, show the text selected so it can be copied by hand. */
  useEffect(() => {
    if (copy !== 'manual' || !fallback.current) return;
    const range = document.createRange();
    range.selectNodeContents(fallback.current);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [copy]);

  const onCopy = () => {
    try {
      navigator.clipboard.writeText(text).then(
        () => { setCopy('copied'); setTimeout(() => setCopy(c => (c === 'copied' ? 'idle' : c)), 1600); },
        () => setCopy('manual'),
      );
    } catch {
      setCopy('manual');
    }
  };

  return (
    <>
      <div className="share">
        <p className="share-name">{GAME_NAME}</p>
        <h2 id="verdict">{result.verdict}</h2>
        <div className="final">
          <div className="f">
            <span id="f-you-crest"><Crest school={result.you} /></span>
            <b id="f-you">{num(mine)}</b>
            <span id="f-you-name">{daily ? `out of ${DAILY * 20}, for ${result.you.name}` : result.you.name}</span>
          </div>
          {!daily && <>
            <span className="dash">&ndash;</span>
            <div className="f" id="f-rival-box">
              <span id="f-rival-crest"><Crest school={result.rival} /></span>
              <b id="f-rival">{num(theirs)}</b>
              <span id="f-rival-name">{result.rival.name}</span>
            </div>
          </>}
        </div>
        {daily && <div className="marks" id="marks">{result.marks.map((m, i) => <i key={i} className={m} />)}</div>}
        <StatCells id="stats" cells={result.cells} />
        {!daily && <p className="rate" id="rate">{result.rate}</p>}
        <p className="dare" id="dare">{result.dare}</p>
      </div>
      <div className="actions">
        <button className="btn" id="again" type="button" onClick={onAgain}>{daily ? 'Play a match' : 'Rematch'}</button>
        <button className="btn ghost" id="copy" type="button" onClick={onCopy}>
          {copy === 'copied' ? 'Copied' : copy === 'manual' ? 'Select and copy below' : 'Copy result'}
        </button>
        <button className="btn ghost" id="to-menu" type="button" onClick={onMenu}>Menu</button>
      </div>
      {copy === 'manual' && <p className="copyfallback" id="copyfallback" ref={fallback}>{text}</p>}
    </>
  );
}

export function Result({ active, result, resultKey, onAgain, onMenu }: Props) {
  return (
    <section className={'screen result enter' + (result?.kind === 'daily' ? ' daily' : '')} id="s-result" hidden={!active}>
      {result && <Card key={resultKey} result={result} onAgain={onAgain} onMenu={onMenu} />}
    </section>
  );
}
