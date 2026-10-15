'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Crest } from '@/components/Crest';
import { ROUNDS } from '@/lib/config';
import { LOCAL_CATEGORIES, availableCount } from '@/lib/data/questions';
import { ALL, COUNTRIES, UNIS, fold, school } from '@/lib/schools';
import { haptic, sfx } from '@/lib/sfx';
import type { School } from '@/lib/types';

type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  active: boolean;
  you: School | null;
  /** true when the player is on the way to the daily challenge */
  forDaily: boolean;
  selectedCategories: string[];
  difficulty: Difficulty;
  onSetCategories: (cats: string[]) => void;
  onSetDifficulty: (d: Difficulty) => void;
  onChoose: (s: School) => void;
  onGo: () => void;
  onMenu: () => void;
}

const LEVELS: { id: Difficulty; label: string; note: string }[] = [
  { id: 'easy', label: 'Easy', note: 'The rival buzzes late and often gets it wrong.' },
  { id: 'medium', label: 'Medium', note: 'A fair fight. The rival knows most answers.' },
  { id: 'hard', label: 'Hard', note: 'The rival buzzes fast and rarely misses.' },
];

function Row({ s, sub, add, picked, onChoose }: { s: School; sub: string; add?: boolean; picked: boolean; onChoose: (s: School) => void }) {
  return (
    <button type="button" className={'school' + (add ? ' add' : '')} aria-pressed={picked} onClick={() => { haptic(); onChoose(s); }}>
      <Crest school={s} />
      <span className="nm"><span>{add ? `Add "${s.name}"` : s.name}</span><small>{sub}</small></span>
      <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </button>
  );
}

/**
 * Two steps: pick a school (country list, then schools, with search across every country),
 * then set up the match (rival strength and topics). A returning player starts on the setup step.
 * The daily has no setup, so it only shows the school step.
 * Game.tsx remounts this each time the picker opens, so search, country and step start fresh.
 */
export function Picker({ active, you, forDaily, selectedCategories, difficulty, onSetCategories, onSetDifficulty, onChoose, onGo, onMenu }: Props) {
  const [step, setStep] = useState<'school' | 'setup'>(() => (you && !forDaily ? 'setup' : 'school'));
  const [country, setCountry] = useState<string | null>(() => (you && UNIS[you.country] ? you.country : null));
  const [query, setQuery] = useState('');
  const list = useRef<HTMLDivElement>(null);

  const raw = query.trim().replace(/\s+/g, ' ');
  const q = fold(raw);
  const searching = q.length >= 2;
  const hits = useMemo(() => (searching ? ALL.filter(u => u.key.includes(q)) : []), [q, searching]);
  const canAdd = searching && raw.length >= 3 && !hits.some(u => fold(u.name) === q);

  useEffect(() => { list.current?.scrollTo(0, 0); }, [country, q]);

  const row = (s: School, sub: string, add = false) => (
    <Row key={(add ? 'add:' : '') + s.id} s={s} sub={sub} add={add} picked={you?.id === s.id} onChoose={onChoose} />
  );

  let rows: React.ReactNode;
  if (searching) {
    rows = <>
      {hits.slice(0, 60).map(u => row(school(u.name, u.country), u.country))}
      {canAdd && row(school(raw.slice(0, 60), country || 'Your school'), hits.length ? 'Not listed? Play for it anyway' : 'Not in the list yet. Play for it anyway', true)}
      {!canAdd && hits.length === 0 && <p className="empty">No school matches that yet. Keep typing to add yours.</p>}
    </>;
  } else if (country) {
    const names = UNIS[country];
    rows = <>
      {you && you.country === country && !names.includes(you.name) && row(you, 'Added by you')}
      {names.map(n => { const s = school(n, country); return row(s, s.short); })}
    </>;
  } else {
    rows = COUNTRIES.map(c => (
      <button key={c} type="button" className="country" onClick={() => { sfx.tap(); setCountry(c); }}>
        <span>{c}</span><b>{UNIS[c].length}</b>
      </button>
    ));
  }

  const toggleCat = (cat: string) => {
    sfx.tap();
    haptic();
    if (selectedCategories.includes(cat)) {
      onSetCategories(selectedCategories.filter(c => c !== cat));
    } else {
      onSetCategories([...selectedCategories, cat]);
    }
  };

  const poolSize = availableCount(selectedCategories);
  const tooFew = selectedCategories.length > 0 && poolSize < ROUNDS;
  const level = LEVELS.findIndex(l => l.id === difficulty);

  const next = () => {
    if (!you) return;
    if (forDaily) { onGo(); return; }
    sfx.tap();
    setStep('setup');
  };

  if (step === 'setup' && you) {
    return (
      <section className="screen pick setup step enter flex-auto min-h-0 flex flex-col gap-4" id="s-pick" hidden={!active}>
        <div className="head shrink-0 flex items-center justify-between gap-2.5">
          <h2>Match setup</h2>
          <button className="back" type="button" onClick={onMenu}>Menu</button>
        </div>

        <div className="setup-body flex-auto min-h-0 overflow-y-auto flex flex-col gap-5">
          <div className="you-card">
            <Crest school={you} />
            <span className="nm"><small>Playing for</small><b>{you.name}</b></span>
            <button type="button" className="back" onClick={() => { sfx.tap(); setStep('school'); }}>Change</button>
          </div>

          <div className="field">
            <p className="label" id="lvl-label">Rival strength</p>
            <div className="diff-bar" role="radiogroup" aria-labelledby="lvl-label" style={{ '--i': Math.max(level, 0) } as CSSProperties}>
              {LEVELS.map(l => (
                <button
                  key={l.id} type="button" role="radio" aria-checked={difficulty === l.id}
                  className={'diff-btn' + (difficulty === l.id ? ' active' : '')}
                  onClick={() => { sfx.tap(); haptic(); onSetDifficulty(l.id); }}
                >{l.label}</button>
              ))}
            </div>
            <p className="hint">{LEVELS[Math.max(level, 0)].note}</p>
          </div>

          <div className="field">
            <p className="label">Topics</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Topics">
              <button
                type="button" className="cat-chip"
                aria-pressed={selectedCategories.length === 0}
                onClick={() => { sfx.tap(); onSetCategories([]); }}
              >Everything</button>
              {LOCAL_CATEGORIES.map(cat => (
                <button
                  key={cat} type="button" className="cat-chip"
                  aria-pressed={selectedCategories.includes(cat)}
                  onClick={() => toggleCat(cat)}
                >{cat}</button>
              ))}
            </div>
            <p className={'hint' + (tooFew ? ' warn' : '')} aria-live="polite">
              {selectedCategories.length === 0
                ? `Questions from every topic, ${ROUNDS} toss-ups.`
                : `${poolSize} question${poolSize !== 1 ? 's' : ''} available${tooFew ? `. Add a topic, a match needs ${ROUNDS}.` : '.'}`}
            </p>
          </div>
        </div>

        <button className="btn go" id="go" type="button" disabled={tooFew} onClick={onGo}>Start match</button>
      </section>
    );
  }

  return (
    <section className={'screen pick step enter flex-auto min-h-0 flex flex-col gap-3'} id="s-pick" hidden={!active}>
      <div className="head shrink-0 flex items-center justify-between gap-2.5">
        <h2 id="pick-title">{forDaily ? 'School for the daily' : 'Pick your school'}</h2>
        <button className="back" id="pick-back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <div className="find-wrap shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
        <input
          className="find" id="school-search" type="search" autoComplete="off" autoCapitalize="words" enterKeyHint="search" spellCheck={false}
          aria-label="Search universities" placeholder={`Search ${ALL.length} universities`}
          value={query} onChange={e => setQuery(e.target.value)}
        />
      </div>
      {!searching && !country && (
        <p className="pick-note" id="pick-note">{COUNTRIES.length} countries. Choose yours, or search by name.</p>
      )}
      {!searching && country && (
        <div className="crumb shrink-0 flex items-center gap-2.5 min-w-0" id="crumb">
          <button id="back" type="button" onClick={() => { sfx.tap(); setCountry(null); }} aria-label="All countries">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            Countries
          </button>
          <b id="crumb-name">{country}<span>{UNIS[country].length} {UNIS[country].length === 1 ? 'school' : 'schools'}</span></b>
        </div>
      )}
      <div className={'list' + (!searching && !country ? ' countries' : '')} id="list" ref={list}>{rows}</div>

      <button className="btn go" id="go" type="button" disabled={!you} onClick={next}>
        {!you ? 'Choose a school' : forDaily ? `Start the daily for ${you.short}` : `Continue as ${you.short}`}
      </button>
    </section>
  );
}
