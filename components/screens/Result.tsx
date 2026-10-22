'use client';

import { useState } from 'react';
import { Crest } from '@/components/Crest';
import { StatCells } from '@/components/screens/Stats';
import { DAILY, GAME_NAME } from '@/lib/config';
import { num, shareText, type DailyResult, type MatchResult } from '@/lib/engine';
import { useCountUp } from '@/lib/hooks';
import { encodeResult } from '@/lib/share';
import type { AuthStatus } from '@/lib/auth';

interface Props {
  active: boolean;
  result: MatchResult | DailyResult | null;
  resultKey: number;
  authStatus: AuthStatus;
  onAgain: () => void;
  onMenu: () => void;
  onSignup: () => void;
}

/* Remounted for every new result (key), so the scores count up from zero and the share menu resets. */
function Card({ result, authStatus, onAgain, onMenu, onSignup }: { result: MatchResult | DailyResult; authStatus: AuthStatus; onAgain: () => void; onMenu: () => void; onSignup: () => void }) {
  const daily = result.kind === 'daily';
  const mine = useCountUp(daily ? result.score : result.scoreYou, 900, 0);
  const theirs = useCountUp(daily ? 0 : result.scoreRival, 900, 0);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = shareText(result, GAME_NAME);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/share/${encodeResult(result)}`;
  const full = `${text}\n\n${shareUrl}`;

  const onShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, url: shareUrl });
        return;
      } catch { /* user cancelled or unsupported — fall through to menu */ }
    }
    setShareOpen(o => !o);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="share">
        <p className="share-name">{GAME_NAME}</p>
        <h2 id="verdict">{result.verdict}</h2>
        <div className="final grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <div className="f flex flex-col items-center gap-1 min-w-0">
            <span id="f-you-crest"><Crest school={result.you} /></span>
            <b id="f-you">{num(mine)}</b>
            <span id="f-you-name">{daily ? `out of ${DAILY * 20}, for ${result.you.name}` : result.you.name}</span>
          </div>
          {!daily && <>
            <span className="dash">&ndash;</span>
            <div className="f flex flex-col items-center gap-1 min-w-0" id="f-rival-box">
              <span id="f-rival-crest"><Crest school={result.rival} /></span>
              <b id="f-rival">{num(theirs)}</b>
              <span id="f-rival-name">{result.rival.name}</span>
            </div>
          </>}
        </div>
        {daily && <div className="marks flex justify-center gap-[5px]" id="marks">{result.marks.map((m, i) => <i key={i} className={m} />)}</div>}
        <StatCells id="stats" cells={result.cells} />
        {!daily && <p className="rate" id="rate">{result.rate}</p>}
        <p className="dare" id="dare">{result.dare}</p>
      </div>
      <div className="actions grid grid-cols-2 gap-2.5">
        <button className="btn" id="again" type="button" onClick={onAgain}>{daily ? 'Play a match' : 'Rematch'}</button>
        <button className="btn ghost" id="share" type="button" onClick={onShare}>Share</button>
        <button className="btn ghost" id="to-menu" type="button" onClick={onMenu}>Menu</button>
      </div>
      {shareOpen && (
        <div className="share-links flex justify-center gap-3 flex-wrap">
          <a className="btn ghost small" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">X / Twitter</a>
          <a className="btn ghost small" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="btn ghost small" href={`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}&u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          <button className="btn ghost small" type="button" onClick={copyToClipboard}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      {authStatus === 'guest' && (
        <button className="btn ghost save-cta" type="button" onClick={onSignup}>Create an account to save your progress</button>
      )}
    </>
  );
}

export function Result({ active, result, resultKey, authStatus, onAgain, onMenu, onSignup }: Props) {
  return (
    <section className={'screen result enter flex-auto min-h-0 flex flex-col gap-3 justify-center' + (result?.kind === 'daily' ? ' daily' : '')} id="s-result" hidden={!active}>
      {result && <Card key={resultKey} result={result} authStatus={authStatus} onAgain={onAgain} onMenu={onMenu} onSignup={onSignup} />}
    </section>
  );
}
