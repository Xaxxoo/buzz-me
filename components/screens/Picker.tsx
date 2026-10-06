'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Crest } from '@/components/Crest';
import { ALL, COUNTRIES, UNIS, fold, school } from '@/lib/schools';
import { sfx } from '@/lib/sfx';
import type { School } from '@/lib/types';

interface Props {
  active: boolean;
  you: School | null;
  /** true when the player is on the way to the daily challenge */
  forDaily: boolean;
  onChoose: (s: School) => void;
  onGo: () => void;
  onMenu: () => void;
}

function Row({ s, sub, add, picked, onChoose }: { s: School; sub: string; add?: boolean; picked: boolean; onChoose: (s: School) => void }) {
  return (
    <button type="button" className={'school' + (add ? ' add' : '')} aria-pressed={picked} onClick={() => onChoose(s)}>
      <Crest school={s} />
      <span className="nm"><span>{add ? `Add “${s.name}”` : s.name}</span><small>{sub}</small></span>
    </button>
  );
}

/**
 * Country list, then schools, with search across every country.
 * A school that is not listed can be typed in and played for anyway.
 * Game.tsx remounts this each time the picker opens, so search and country start fresh.
 */
export function Picker({ active, you, forDaily, onChoose, onGo, onMenu }: Props) {
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

  return (
    <section className="screen pick enter" id="s-pick" hidden={!active}>
      <div className="head">
        <h2 id="pick-title">{forDaily ? 'Pick your school for the daily' : 'Pick your school'}</h2>
        <button className="back" id="pick-back" type="button" onClick={onMenu}>Menu</button>
      </div>
      <input
        className="find" id="school-search" type="search" autoComplete="off" autoCapitalize="words" spellCheck={false}
        aria-label="Search universities" placeholder={`Search ${ALL.length} universities`}
        value={query} onChange={e => setQuery(e.target.value)}
      />
      {!searching && !country && (
        <p className="pick-note" id="pick-note">{ALL.length} universities in {COUNTRIES.length} countries. Pick a country, or search by name.</p>
      )}
      {!searching && country && (
        <div className="crumb" id="crumb">
          <button id="back" type="button" onClick={() => { sfx.tap(); setCountry(null); }}>All countries</button>
          <b id="crumb-name">{country}, {UNIS[country].length} {UNIS[country].length === 1 ? 'school' : 'schools'}</b>
        </div>
      )}
      <div className={'list' + (!searching && !country ? ' countries' : '')} id="list" ref={list}>{rows}</div>
      <button className="btn" id="go" type="button" disabled={!you} onClick={onGo}>{you ? 'Play for ' + you.short : 'Choose a school'}</button>
    </section>
  );
}
