import { DAILY, OPEN_MS, ROUNDS } from './config';
import { confetti } from './confetti';
import { QUESTIONS } from './data/questions';
import {
  bumpStreak, dailySet, defaultSave, liveStreak, loadSave, nextIn, niceDate, record, today, writeSave,
  type Mark, type Save,
} from './save';
import { pickRival, school } from './schools';
import { setMuted, sfx } from './sfx';
import type { QA, Question, School, Team } from './types';

/*
 * The game engine. It owns every timer and all match state, and publishes an immutable
 * snapshot that React renders from (see components/Game.tsx, which subscribes with
 * useSyncExternalStore). Nothing in here touches React.
 *
 * To make the rival a real player, replace rivalPlan/rivalBuzz/rivalSteal with events
 * from a room server and keep the rest.
 */

export type Screen = 's-title' | 's-pick' | 's-vs' | 's-match' | 's-result' | 's-stats';
export type Took = 'you' | 'rival' | 'none';

export interface WordView { text: string; late: boolean; delay?: number }
export interface OptionView { text: string; mark: '' | 'right' | 'wrong' | 'struck'; disabled: boolean }
export interface AskView { key: number; secs: number; paused: boolean; options: OptionView[] }
export interface RivalView { small: string; big: string | null; mark: '' | 'right' | 'wrong' }

export interface MatchResult {
  kind: 'match';
  you: School; rival: School;
  scoreYou: number; scoreRival: number;
  verdict: string; cells: [string, string][]; rate: string; dare: string;
}
export interface DailyResult {
  kind: 'daily';
  you: School;
  date: string; score: number; marks: Mark[]; streak: number;
  verdict: string; cells: [string, string][]; dare: string;
}

export interface GameState {
  hydrated: boolean;
  screen: Screen;
  muted: boolean;
  you: School | null;
  rival: School | null;
  mode: 'match' | 'daily';
  /** set when the player opened the picker on the way to the daily */
  pending: 'daily' | null;
  /** bumps each time the picker opens, so it can reset its search */
  pickKey: number;
  /** bumps when a new match or daily starts, so the scoreboard resets cleanly */
  boardKey: number;
  total: number;
  qi: number;
  scoreYou: number;
  scoreRival: number;
  took: (Took | undefined)[];
  dayLabel: string;
  /* question card */
  tag: string;
  bonusCard: boolean;
  words: WordView[];
  answer: string | null;
  stamp: { key: number; text: string; team: Team } | null;
  status: string;
  /* thumb zone */
  zone: 'buzz' | 'opts' | 'rival' | 'none';
  buzzLive: boolean;
  window: { key: number; secs: number };
  ask: AskView | null;
  rivalView: RivalView | null;
  seat: { key: number; team: Team; idx: number } | null;
  flash: { key: number; team: Team } | null;
  result: MatchResult | DailyResult | null;
  resultKey: number;
  save: Save;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(src: T[]): T[] => {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (n: number | null) => (n == null ? 'None' : Math.round(n * 100) + '% in');
export const num = (n: number) => (n < 0 ? '−' : '') + Math.abs(Math.round(n));

const initial = (): GameState => ({
  hydrated: false, screen: 's-title', muted: false,
  you: null, rival: null, mode: 'match', pending: null, pickKey: 0, boardKey: 0,
  total: ROUNDS, qi: 0, scoreYou: 0, scoreRival: 0, took: [], dayLabel: '',
  tag: '', bonusCard: false, words: [], answer: null, stamp: null, status: '',
  zone: 'buzz', buzzLive: false, window: { key: 0, secs: 0 }, ask: null, rivalView: null, seat: null, flash: null,
  result: null, resultKey: 0,
  save: defaultSave(),
});

export class GameEngine {
  private state: GameState = initial();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private keys = 0;

  /* working state for the question in play; none of it is rendered directly */
  private save: Save = defaultSave();
  private qs: Question[] = [];
  private q: Question | null = null;
  private all: string[] = [];
  private ri = 0;
  private full = false;
  private early = false;
  private heard = 1;
  private phase: 'idle' | 'reading' | 'open' | 'answer' | 'rival' | 'bonus' | 'done' = 'idle';
  private rivalPlan: { idx: number; late: number | null } | null = null;
  private tally = { won: 0, bonus: 0, best: null as number | null };
  private marks: Mark[] = [];
  private day = '';
  private asking: { qa: QA; done: (ok: boolean, text: string | null) => void; over: boolean } | null = null;

  /* ---------- store plumbing ---------- */
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getSnapshot = () => this.state;

  private set(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l());
  }
  private key() { return ++this.keys; }
  /** Timers scheduled with later() die when the phase changes (cut). */
  private later(fn: () => void, ms: number) { const e = this.epoch; setTimeout(() => { if (e === this.epoch) fn(); }, ms); }
  private cut() { this.epoch++; }
  private commit() {
    writeSave(this.save);
    this.set({ save: { ...this.save, cats: { ...this.save.cats }, streak: { ...this.save.streak } } });
  }

  /* ---------- small view helpers ---------- */
  private status(t: string) { this.set({ status: t }); }
  private stamp(text: string, team: Team) {
    const key = this.key();
    this.set({ stamp: { key, text, team } });
    setTimeout(() => { if (this.state.stamp?.key === key) this.set({ stamp: null }); }, 1900);
  }
  private seat(team: Team) {
    const key = this.key();
    this.set({ seat: { key, team, idx: team === 'you' ? 0 : Math.floor(Math.random() * 4) } });
    setTimeout(() => { if (this.state.seat?.key === key) this.set({ seat: null }); }, 2400);
  }
  private flash(team: Team) { this.set({ flash: { key: this.key(), team } }); }
  private meter(secs: number) { this.set({ window: { key: this.key(), secs } }); }
  private score(team: Team, d: number) {
    if (!d) return;
    if (team === 'you') this.set({ scoreYou: this.state.scoreYou + d });
    else this.set({ scoreRival: this.state.scoreRival + d });
  }
  private took(v: Took) { const t = this.state.took.slice(); t[this.state.qi] = v; this.set({ took: t }); }
  private addWord(text: string, late = false, delay?: number) { this.set({ words: [...this.state.words, { text, late, delay }] }); }
  private fillRest() {
    if (this.ri >= this.all.length) return;
    const rest = this.all.slice(this.ri).map(text => ({ text, late: true }));
    this.ri = this.all.length;
    this.set({ words: [...this.state.words, ...rest] });
  }
  private showAnswer(qa: QA) { this.set({ answer: qa.o[0] }); }
  private rivalPanel(small: string, big: string | null = null, mark: RivalView['mark'] = '') {
    this.set({ zone: 'rival', ask: null, rivalView: { small, big, mark } });
  }
  private colors(extra: string[] = []) { const y = this.state.you!; return [y.a, y.b, '#FFFDF4', ...extra]; }
  private cheer(n: number) { confetti.burstFrom(document.getElementById('opts'), n, this.colors(['#E8322C'])); }

  /* ---------- answering ---------- */
  private ask(qa: QA, opts: { secs: number; struck?: string; done: (ok: boolean, text: string | null) => void }) {
    this.asking = { qa, done: opts.done, over: false };
    this.set({
      zone: 'opts', rivalView: null,
      ask: {
        key: this.key(), secs: opts.secs, paused: false,
        options: shuffle(qa.o).map(text => ({ text, mark: text === opts.struck ? 'struck' : '', disabled: text === opts.struck })),
      },
    });
    for (let s = 3; s >= 1; s--) this.later(() => sfx.tick(), (opts.secs - s) * 1000);
    this.later(() => this.answer(null), opts.secs * 1000);
  }
  /** The player picked an option, or ran out of time (null). */
  answer(text: string | null) {
    const a = this.asking, view = this.state.ask;
    if (!a || a.over || !view) return;
    if (text !== null && view.options.find(o => o.text === text)?.disabled) return;
    a.over = true;
    this.cut();
    const ok = text === a.qa.o[0];
    this.set({ ask: { ...view, paused: true, options: view.options.map(o => ({ ...o, disabled: true, mark: o.text === text ? (ok ? 'right' : 'wrong') : o.mark })) } });
    a.done(ok, text);
  }
  answerIndex(i: number) { const o = this.state.ask?.options[i]; if (o) this.answer(o.text); }
  private markRight(qa: QA) {
    const view = this.state.ask;
    if (view) this.set({ ask: { ...view, options: view.options.map(o => (o.text === qa.o[0] ? { ...o, mark: 'right' } : o)) } });
  }

  /* ---------- navigation ---------- */
  /** Runs once in the browser, after the first render, so server and client markup match. */
  hydrate() {
    if (this.state.hydrated) return;
    this.save = loadSave();
    this.set({ hydrated: true, you: this.keptSchool() });
    this.commit();
  }
  /** The school the player last confirmed, if any. */
  private keptSchool() {
    const kept = this.save.school;
    return kept ? school(String(kept.name).slice(0, 60), String(kept.country || 'Your school')) : null;
  }
  toggleMute() { const muted = !this.state.muted; setMuted(muted); this.set({ muted }); sfx.tap(); }
  /** Back to the menu. A school that was tapped in the picker but never confirmed is dropped. */
  menu() { this.cut(); this.phase = 'idle'; sfx.tap(); this.set({ screen: 's-title', pending: null, you: this.keptSchool() }); }
  showStats() { sfx.tap(); this.set({ screen: 's-stats' }); }
  openPicker(pending: 'daily' | null = null) { this.set({ screen: 's-pick', pending, pickKey: this.state.pickKey + 1 }); }
  play() { sfx.buzz(); this.openPicker(null); }
  choose(s: School) { sfx.tap(); this.set({ you: s }); }
  /** The picker's main button. */
  go() {
    const you = this.state.you;
    if (!you) return;
    sfx.tap();
    this.save.school = { name: you.name, country: you.country };
    this.commit();
    if (this.state.pending === 'daily') { this.set({ pending: null }); this.startDaily(); } else this.startMatch();
  }
  rematch() { sfx.tap(); this.startMatch(); }
  daily() { sfx.tap(); this.startDaily(); }

  /* ---------- match flow ---------- */
  private resetBoard(mode: 'match' | 'daily', total: number, rival: School | null) {
    this.tally = { won: 0, bonus: 0, best: null };
    this.marks = [];
    this.set({
      boardKey: this.key(), mode, rival, total, qi: 0, scoreYou: 0, scoreRival: 0, took: [],
      tag: '', bonusCard: false, words: [], answer: null, stamp: null, status: '',
      zone: 'buzz', buzzLive: false, ask: null, rivalView: null, seat: null,
    });
  }

  startMatch() {
    const you = this.state.you;
    if (!you) return this.openPicker(null);
    this.cut();
    this.qs = shuffle(QUESTIONS).slice(0, ROUNDS);
    this.resetBoard('match', this.qs.length, pickRival(you));
    this.set({ screen: 's-vs' });
    sfx.slam(); setTimeout(() => sfx.slam(), 180);
    this.later(() => { this.set({ screen: 's-match' }); this.nextQuestion(); }, calm() ? 1400 : 2600);
  }

  startDaily() {
    if (!this.state.you) return this.openPicker('daily');
    if (this.save.daily && this.save.daily.date === today()) return this.showDailyResult(false);
    this.cut();
    this.day = today();
    this.qs = dailySet(this.day);
    this.resetBoard('daily', this.qs.length, null);
    this.set({ screen: 's-match', dayLabel: niceDate(this.day) });
    this.nextQuestion();
  }

  private nextQuestion() {
    this.cut();
    const qi = this.state.qi;
    if (qi >= this.qs.length) return this.finish();
    const q = (this.q = this.qs[qi]);
    this.all = q.t.split(' ');
    this.ri = 0; this.full = false; this.early = false; this.phase = 'reading';
    const daily = this.state.mode === 'daily';
    this.set({
      tag: q.c, bonusCard: false, words: [], answer: null, stamp: null,
      zone: 'buzz', buzzLive: true, ask: null, rivalView: null, window: { key: this.key(), secs: 0 },
      status: daily
        ? `Question ${qi + 1} of ${this.qs.length}. The earlier you buzz, the more it’s worth.`
        : `Toss-up ${qi + 1} of ${this.qs.length}. Buzz as soon as you know it.`,
    });
    /* The rival knows about three in four, and commits somewhere between 60% of the question and a few seconds after it. */
    const at = rand(0.6, 1.22);
    this.rivalPlan = daily || Math.random() >= 0.72 ? null
      : { idx: at <= 1 ? Math.max(6, Math.ceil(at * this.all.length)) : Infinity, late: at > 1 ? 500 + ((at - 1) / 0.22) * 3400 : null };
    this.later(() => this.readTick(), 800);
  }

  /** Reveals the next word of the question. */
  private readTick() {
    const w = this.all[this.ri++];
    this.addWord(w);
    sfx.word();
    this.full = this.ri >= this.all.length;
    if (this.rivalPlan && this.ri >= this.rivalPlan.idx) return this.later(() => this.rivalBuzz(), 200);
    if (this.full) return this.openWindow();
    this.later(() => this.readTick(), 150 + w.length * 22 + (/[,.]$/.test(w) ? 240 : 0));
  }

  private openWindow() {
    this.phase = 'open';
    this.meter(OPEN_MS / 1000);
    this.status('That’s the whole question. Buzz now for 10.');
    if (this.rivalPlan && this.rivalPlan.late != null) this.later(() => this.rivalBuzz(), this.rivalPlan.late);
    this.later(() => {
      this.cut();
      this.phase = 'idle';
      const daily = this.state.mode === 'daily';
      if (daily) this.marks.push('skip');
      this.took('none');
      this.set({ buzzLive: false, window: { key: this.key(), secs: 0 }, answer: this.q!.o[0], status: daily ? 'No buzz. No points.' : 'Nobody buzzed.' });
      sfx.theirs();
      this.later(() => this.advance(), 2000);
    }, OPEN_MS);
  }

  private advance() { this.set({ qi: this.state.qi + 1 }); this.nextQuestion(); }

  /** The player hit the buzzer. */
  buzz() {
    if (this.phase !== 'reading' && this.phase !== 'open') return;
    const you = this.state.you!;
    this.cut();
    this.early = !this.full;
    this.heard = this.ri / this.all.length;
    this.phase = 'answer';
    const daily = this.state.mode === 'daily';
    sfx.buzz();
    this.flash('you'); this.stamp(you.short + ' buzzed', 'you'); this.seat('you');
    this.set({
      buzzLive: false, window: { key: this.key(), secs: 0 },
      status: daily
        ? `Buzzed ${Math.round(this.heard * 100)}% in. Worth ${10 + Math.round((1 - this.heard) * 10)} if you’re right` + (this.early ? ', −5 if not.' : '.')
        : this.early ? 'Early buzz. 15 if you’re right, −5 if not.' : 'Your buzzer. 10 points if you’re right.',
    });
    this.later(() => this.ask(this.q!, { secs: 6, done: daily ? this.dailyAnswer : this.tossResult }), 700);
  }

  private tossResult = (ok: boolean, text: string | null) => {
    const q = this.q!, rival = this.state.rival!;
    record(this.save, q.c, ok); this.commit();
    if (ok) {
      const pts = this.early ? 15 : 10;
      this.score('you', pts); this.took('you'); this.tally.won++;
      if (this.early) this.tally.best = Math.min(this.tally.best ?? 1, this.heard);
      sfx.right(); this.cheer(46);
      this.fillRest(); this.showAnswer(q);
      this.status(this.early ? 'Right, and early. +15.' : 'Right. +10.');
      this.later(() => this.bonus('you'), 1500);
    } else {
      if (this.early) this.score('you', -5);
      sfx.wrong();
      this.status((text === null ? 'Out of time.' : 'Not that one.') + (this.early ? ' −5.' : '') + ` ${rival.short} can steal.`);
      this.later(() => this.rivalSteal(), 1300);
    }
  };

  private rivalSteal() {
    const q = this.q!, rival = this.state.rival!;
    this.phase = 'rival';
    this.fillRest(); this.seat('rival');
    this.rivalPanel(rival.short + ' hears the full question');
    this.later(() => {
      if (Math.random() < 0.5) {
        this.score('rival', 10); this.took('rival');
        this.rivalPanel(rival.short + ' answers', q.o[0], 'right');
        this.showAnswer(q); sfx.theirs(); this.status(`${rival.short} steals it. +10 to them.`);
        this.later(() => this.bonus('rival'), 1700);
      } else {
        this.took('none');
        this.rivalPanel(rival.short + ' passes', 'No answer');
        this.showAnswer(q); this.status(`${rival.short} couldn’t take it either.`);
        this.later(() => this.advance(), 2000);
      }
    }, 1600);
  }

  private rivalBuzz() {
    if (this.phase !== 'reading' && this.phase !== 'open') return;
    const q = this.q!, rival = this.state.rival!;
    this.cut();
    const early = !this.full;
    this.phase = 'rival';
    sfx.rbuzz();
    this.flash('rival'); this.stamp(rival.short + ' buzzed', 'rival'); this.seat('rival');
    this.set({ buzzLive: false, window: { key: this.key(), secs: 0 }, status: `${rival.short} buzzed${early ? ' early' : ''}.` });
    this.rivalPanel(rival.short + ' got there first');
    this.later(() => {
      if (Math.random() < 0.74) {
        const pts = early ? 15 : 10;
        this.score('rival', pts); this.took('rival');
        this.rivalPanel(rival.short + ' answers', q.o[0], 'right');
        this.fillRest(); this.showAnswer(q); sfx.theirs(); this.status(`${rival.short} is right. +${pts} to them.`);
        this.later(() => this.bonus('rival'), 1800);
      } else {
        const miss = pick(q.o.slice(1));
        if (early) this.score('rival', -5);
        this.rivalPanel(rival.short + ' answers', miss, 'wrong'); sfx.tap();
        this.status(`${rival.short} is wrong${early ? ' and loses 5' : ''}. Your steal.`);
        this.later(() => {
          this.fillRest(); this.phase = 'answer'; this.early = false;
          this.stamp('Steal for 10', 'you');
          this.ask(q, { secs: 6, struck: miss, done: this.stealResult });
        }, 1600);
      }
    }, 1600);
  }

  private stealResult = (ok: boolean, text: string | null) => {
    const q = this.q!;
    record(this.save, q.c, ok); this.commit();
    if (ok) {
      this.score('you', 10); this.took('you'); this.tally.won++;
      sfx.right(); this.cheer(46);
      this.showAnswer(q); this.status('Stolen. +10.');
      this.later(() => this.bonus('you'), 1500);
    } else {
      this.took('none'); this.markRight(q); sfx.wrong(); this.showAnswer(q);
      this.status(text === null ? 'Out of time. No points.' : 'Not that one. No points.');
      this.later(() => this.advance(), 2000);
    }
  };

  private bonus(team: Team) {
    this.cut();
    this.phase = 'bonus';
    const q = this.q!, b = q.b, name = (team === 'you' ? this.state.you! : this.state.rival!).short;
    this.set({
      bonusCard: true, tag: 'Bonus for ' + name, answer: null,
      words: b.t.split(' ').map((text, i) => ({ text, late: false, delay: i * 25 })),
    });
    if (team === 'you') {
      this.set({ zone: 'none', ask: null, rivalView: null, status: 'Bonus question. 10 points, no buzzer.' });
      this.later(() => this.ask(b, {
        secs: 8,
        done: (ok, text) => {
          record(this.save, q.c, ok); this.commit();
          if (ok) { this.score('you', 10); this.tally.bonus++; sfx.right(); this.cheer(30); this.status('Bonus taken. +10.'); }
          else { this.markRight(b); sfx.wrong(); this.status(text === null ? 'Out of time on the bonus.' : 'Bonus missed.'); }
          this.showAnswer(b);
          this.later(() => this.advance(), 1800);
        },
      }), 800);
    } else {
      this.rivalPanel(name + ' takes the bonus');
      this.status(`Bonus question for ${name}.`);
      this.later(() => {
        if (Math.random() < 0.55) { this.score('rival', 10); this.rivalPanel(name + ' answers', b.o[0], 'right'); sfx.theirs(); this.status(`${name} takes the bonus. +10 to them.`); }
        else { this.rivalPanel(name + ' answers', pick(b.o.slice(1)), 'wrong'); sfx.tap(); this.status(`${name} misses the bonus.`); }
        this.showAnswer(b);
        this.later(() => this.advance(), 2000);
      }, 1800);
    }
  }

  /* ---------- daily challenge ---------- */
  private dailyAnswer = (ok: boolean, text: string | null) => {
    const q = this.q!;
    record(this.save, q.c, ok); this.commit();
    if (ok) {
      const pts = 10 + Math.round((1 - this.heard) * 10);
      this.score('you', pts); this.took('you'); this.marks.push('right'); this.tally.won++;
      if (this.early) this.tally.best = Math.min(this.tally.best ?? 1, this.heard);
      sfx.right(); this.cheer(40); this.status(`Right. +${pts}.`);
    } else {
      if (this.early) this.score('you', -5);
      this.took('none'); this.marks.push('wrong'); this.markRight(q); sfx.wrong();
      this.status((text === null ? 'Out of time.' : 'Not that one.') + (this.early ? ' −5.' : ' No points.'));
    }
    this.fillRest(); this.showAnswer(q);
    this.later(() => this.advance(), 1700);
  };

  private showDailyResult(fresh: boolean) {
    const d = this.save.daily!, you = this.state.you!, n = liveStreak(this.save);
    this.set({
      screen: 's-result', resultKey: this.key(),
      result: {
        kind: 'daily', you, date: d.date, score: d.score, marks: d.marks, streak: n,
        verdict: 'Daily challenge, ' + niceDate(d.date),
        cells: [['Right', `${d.right}/${DAILY}`], ['Streak', n === 1 ? '1 day' : n + ' days'], ['Earliest buzz', pct(d.best)]],
        dare: (fresh ? (d.froze ? 'Your free miss for the week kept the streak alive. ' : '') : 'You’ve played today’s set. ') + `Next set in ${nextIn()}.`,
      },
    });
    if (!fresh) return;
    if (d.score >= DAILY * 10) { sfx.win(); confetti.rain(this.colors(['#E8322C']), 4); } else sfx.theirs();
  }

  /* ---------- results ---------- */
  private finish() {
    this.cut();
    this.phase = 'done';
    const { scoreYou, scoreRival } = this.state, you = this.state.you!;
    if (this.state.mode === 'daily') {
      const froze = bumpStreak(this.save);
      this.save.daily = { date: this.day, score: scoreYou, marks: this.marks, right: this.tally.won, best: this.tally.best, froze };
      this.save.bestDaily = this.save.bestDaily == null ? scoreYou : Math.max(this.save.bestDaily, scoreYou);
      this.commit();
      return this.showDailyResult(true);
    }
    const rival = this.state.rival!, d = scoreYou - scoreRival;
    /* Elo against a fixed 1000-rated bot. */
    const expected = 1 / (1 + Math.pow(10, (1000 - this.save.rating) / 400));
    const delta = Math.round(32 * ((d > 0 ? 1 : d < 0 ? 0 : 0.5) - expected));
    this.save.rating += delta; this.save.played++;
    if (d > 0) this.save.won++; else if (d < 0) this.save.lost++; else this.save.drawn++;
    this.commit();
    this.set({
      screen: 's-result', resultKey: this.key(),
      result: {
        kind: 'match', you, rival, scoreYou, scoreRival,
        verdict: d > 0 ? `${you.short} beat ${rival.short}` : d < 0 ? `${rival.short} beat ${you.short}` : `${you.short} and ${rival.short} drew`,
        cells: [['Toss-ups', `${this.tally.won}/${this.qs.length}`], ['Bonuses', String(this.tally.bonus)], ['Earliest buzz', pct(this.tally.best)]],
        rate: `Your rating: ${this.save.rating}, ${delta < 0 ? 'down' : 'up'} ${Math.abs(delta)}.`,
        dare: d > 0 ? 'Can your school beat us?' : d < 0 ? 'Rematch and take it back.' : 'One more to settle it.',
      },
    });
    if (d > 0) { sfx.win(); confetti.rain(this.colors(['#E8322C', '#1B1464'])); }
    else if (d < 0) sfx.lose();
    else sfx.theirs();
  }
}

/** The text copied from the result card. */
export function shareText(r: MatchResult | DailyResult, name: string) {
  if (r.kind === 'daily') {
    const sq: Record<Mark, string> = { right: '\u{1F7E9}', wrong: '\u{1F7E5}', skip: '⬜' };
    return `${name} daily ${niceDate(r.date)}, playing for ${r.you.short}\n${r.marks.map(m => sq[m]).join('')} ${num(r.score)}/${DAILY * 20}\n`
      + (r.streak > 1 ? `${r.streak}-day streak. ` : '') + 'Can your school beat that?';
  }
  const d = r.scoreYou - r.scoreRival, line = `${r.you.short} ${num(r.scoreYou)}, ${r.rival.short} ${num(r.scoreRival)}`;
  return d > 0 ? `${name}: ${line}. We took ${r.rival.name} on the buzzer. Can your school beat us?`
    : d < 0 ? `${name}: ${line}. ${r.rival.name} got us this time. Can your school do better?`
    : `${name}: ${line}. Dead level with ${r.rival.name}. Can your school break the tie?`;
}
