import type { AuthClient } from './auth';
import { type DbQuestion, mapQuestion } from './api';
import { DAILY, OPEN_MS, ROUNDS } from './config';
import { confetti } from './confetti';
import {
  bumpStreak, defaultSave, isTutorialDone, liveStreak, loadSave, loadServerSave, markTutorialDone, nextIn, niceDate, record, syncSave, today, writeSave,
  type Mark, type Save,
} from './save';
import { pickRival, school } from './schools';
import { setMuted, sfx } from './sfx';
import type { QA, Question, School, Team, TeamData, LobbyState, NotificationData, ChallengeData, ChallengeLobbyState, UniversityProfileData } from './types';

/*
 * The game engine. It owns every timer and all match state, and publishes an immutable
 * snapshot that React renders from (see components/Game.tsx, which subscribes with
 * useSyncExternalStore). Nothing in here touches React.
 *
 * To make the rival a real player, replace rivalPlan/rivalBuzz/rivalSteal with events
 * from a room server and keep the rest.
 */

export type Screen = 's-title' | 's-pick' | 's-vs' | 's-match' | 's-result' | 's-stats' | 's-login' | 's-signup' | 's-leaderboard' | 's-team' | 's-challenges' | 's-uni-profile';
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
  /* categories & difficulty */
  selectedCategories: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  /* online */
  matchMode: 'local' | 'online';
  matchId: string | null;
  finding: boolean;
  findElapsed: number;
  botOffer: boolean;
  opponentName: string | null;
  /* teams */
  teamView: 'list' | 'create' | 'lobby';
  myTeams: TeamData[];
  activeTeam: TeamData | null;
  lobby: LobbyState | null;
  teamFinding: boolean;
  /* notifications */
  notifications: NotificationData[];
  unreadCount: number;
  /* challenges */
  challengeView: 'board' | 'create' | 'detail' | 'lobby';
  challenges: ChallengeData[];
  activeChallenge: ChallengeData | null;
  challengeLobby: ChallengeLobbyState | null;
  /* private match */
  privateCode: string | null;
  privateWaiting: boolean;
  /* direct player challenge */
  onlinePlayers: { id: string; username: string; rating: number }[];
  incomingChallenge: { fromUserId: string; fromUsername: string; fromRating: number } | null;
  challengeSent: boolean;
  /* devices */
  devices: { id: string; device_name: string; last_seen: string; created_at: string }[];
  /* spectating */
  spectating: boolean;
  spectateMatchId: string | null;
  /* university profile */
  universityProfile: UniversityProfileData | null;
  /* connectivity */
  online: boolean;
  reconnecting: boolean;
  /* question loading */
  questionsLoading: boolean;
  questionsError: string | null;
  /* tutorial */
  tutorialStep: number;
  tutorialTip: string;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(src: T[]): T[] => {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const TUTORIAL_Q: Question = {
  t: 'What is the name of the largest ocean on Earth?',
  c: 'Geography',
  o: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
  b: { t: 'What is the capital city of Japan?', o: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya'] },
};
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
  selectedCategories: [], difficulty: 'medium',
  matchMode: 'local', matchId: null, finding: false, findElapsed: 0, botOffer: false, opponentName: null,
  teamView: 'list', myTeams: [], activeTeam: null, lobby: null, teamFinding: false,
  notifications: [], unreadCount: 0,
  challengeView: 'board', challenges: [], activeChallenge: null, challengeLobby: null,
  privateCode: null, privateWaiting: false,
  onlinePlayers: [], incomingChallenge: null, challengeSent: false,
  devices: [],
  spectating: false, spectateMatchId: null,
  universityProfile: null,
  online: true,
  reconnecting: false,
  questionsLoading: false,
  questionsError: null,
  tutorialStep: 0,
  tutorialTip: '',
});

export class GameEngine {
  private state: GameState = initial();
  private listeners = new Set<() => void>();
  private epoch = 0;
  private keys = 0;
  auth: AuthClient | null = null;
  /** Cached DB categories for name→slug mapping (populated by Game.tsx). */
  dbCategories: { name: string; slug: string }[] = [];

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
  private mySide: 'a' | 'b' = 'a';
  private findTimer: ReturnType<typeof setInterval> | null = null;
  private tutorialPaused = false;

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
    const snap = { ...this.save, cats: { ...this.save.cats }, streak: { ...this.save.streak } };
    this.set({ save: snap });
    if (this.auth?.getSnapshot().status === 'authenticated') syncSave(this.auth.api, snap);
  }

  /* ---------- small view helpers ---------- */
  private status(t: string) { this.set({ status: t }); }
  private stamp(text: string, team: Team) {
    const key = this.key();
    this.set({ stamp: { key, text, team } });
    setTimeout(() => { if (this.state.stamp?.key === key) this.set({ stamp: null }); }, calm() ? 800 : 1900);
  }
  private seat(team: Team) {
    const key = this.key();
    this.set({ seat: { key, team, idx: team === 'you' ? 0 : Math.floor(Math.random() * 4) } });
    setTimeout(() => { if (this.state.seat?.key === key) this.set({ seat: null }); }, calm() ? 1000 : 2400);
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
  private colors(extra: string[] = []) { const y = this.state.you!; return [y.a, y.b, '#f0ebe3', '#c6f432', ...extra]; }
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
  async hydrate() {
    if (this.state.hydrated) return;
    this.save = loadSave();
    // If authenticated, try loading from server
    if (this.auth?.getSnapshot().status === 'authenticated') {
      const remote = await loadServerSave(this.auth.api);
      if (remote) { this.save = remote; writeSave(remote); }
    }
    this.set({ hydrated: true, you: this.keptSchool() });
    this.commit();
  }
  /** The school the player last confirmed, if any. */
  private keptSchool() {
    const kept = this.save.school;
    return kept ? school(String(kept.name).slice(0, 60), String(kept.country || 'Your school')) : null;
  }
  toggleMute() { const muted = !this.state.muted; setMuted(muted); this.set({ muted }); sfx.tap(); }
  setCategories(cats: string[]) { this.set({ selectedCategories: cats }); }
  setDifficulty(d: 'easy' | 'medium' | 'hard') { this.set({ difficulty: d }); }
  dismissQuestionsError() { this.set({ questionsError: null }); }

  private botParams() {
    const p = {
      easy:   { buzzChance: 0.55, knowChance: 0.55, speedMin: 0.75, speedMax: 1.40, stealChance: 0.30, bonusChance: 0.35 },
      medium: { buzzChance: 0.72, knowChance: 0.74, speedMin: 0.60, speedMax: 1.22, stealChance: 0.50, bonusChance: 0.55 },
      hard:   { buzzChance: 0.85, knowChance: 0.88, speedMin: 0.45, speedMax: 0.95, stealChance: 0.65, bonusChance: 0.70 },
    };
    return p[this.state.difficulty];
  }

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
  rematch() { sfx.tap(); this.state.matchMode === 'online' ? this.findQuickMatch() : this.startMatch(); }
  daily() { sfx.tap(); this.startDaily(); }
  showLogin() { sfx.tap(); this.set({ screen: 's-login' }); }
  showSignup() { sfx.tap(); this.set({ screen: 's-signup' }); }
  showLeaderboard() { sfx.tap(); this.set({ screen: 's-leaderboard' }); }

  /* ---------- online matchmaking ---------- */
  findQuickMatch() {
    this.cut();
    this.phase = 'idle';
    this.set({ screen: 's-match', finding: true, findElapsed: 0, botOffer: false, matchMode: 'online', matchId: null, opponentName: null, status: 'Finding opponent\u2026', zone: 'none', buzzLive: false, tag: '', words: [], answer: null, bonusCard: false });
    this.findTimer = setInterval(() => { this.set({ findElapsed: this.state.findElapsed + 1 }); }, 1000);
  }
  cancelFind() {
    if (this.findTimer) { clearInterval(this.findTimer); this.findTimer = null; }
    this.set({ finding: false });
    this.menu();
  }

  /* ---------- devices ---------- */
  setDevices(devices: { id: string; device_name: string; last_seen: string; created_at: string }[]) {
    this.set({ devices });
  }
  removeDevice(sessionId: string) {
    this.set({ devices: this.state.devices.filter(d => d.id !== sessionId) });
  }

  /* ---------- direct player challenge ---------- */
  onOnlinePlayers(data: { players: { id: string; username: string; rating: number }[] }) {
    this.set({ onlinePlayers: data.players });
  }
  sendPlayerChallenge() {
    this.set({ challengeSent: true });
    this.status('Challenge sent. Waiting for response\u2026');
  }
  onChallengeReceived(data: { from_user_id: string; from_username: string; from_rating: number }) {
    this.set({
      incomingChallenge: { fromUserId: data.from_user_id, fromUsername: data.from_username, fromRating: data.from_rating },
    });
  }
  onChallengeDeclined(_data: { target_user_id: string }) {
    this.set({ challengeSent: false });
    this.status('Challenge declined.');
  }
  onChallengeCancelled() {
    this.set({ incomingChallenge: null });
  }
  dismissChallenge() {
    this.set({ incomingChallenge: null });
  }
  acceptedChallenge() {
    // Match will arrive via match:found
    this.set({ incomingChallenge: null, finding: true, matchMode: 'online', status: 'Starting match\u2026' });
  }

  /* ---------- private (friendly) match ---------- */
  startPrivateMatch() {
    this.cut();
    this.phase = 'idle';
    this.set({ screen: 's-match', privateWaiting: true, privateCode: null, finding: false, matchMode: 'online', matchId: null, opponentName: null, status: 'Creating private room\u2026', zone: 'none', buzzLive: false, tag: '', words: [], answer: null, bonusCard: false });
  }
  onPrivateCreated(data: { code: string }) {
    this.set({ privateCode: data.code, status: `Room code: ${data.code}. Share it with your opponent.` });
  }
  onPrivateExpired(_data: { code: string }) {
    if (this.state.privateWaiting) {
      this.set({ privateWaiting: false, privateCode: null });
      this.status('Room code expired.');
      this.menu();
    }
  }
  joinPrivateMatch() {
    this.cut();
    this.phase = 'idle';
    this.set({ screen: 's-match', finding: true, matchMode: 'online', matchId: null, opponentName: null, status: 'Joining private room\u2026', zone: 'none', buzzLive: false, tag: '', words: [], answer: null, bonusCard: false });
  }
  cancelPrivateMatch() {
    this.set({ privateWaiting: false, privateCode: null });
    this.menu();
  }

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

  async startMatch() {
    const you = this.state.you;
    if (!you) return this.openPicker(null);
    if (this.auth?.getSnapshot().status !== 'authenticated') {
      return this.set({ screen: 's-login' });
    }
    this.cut();
    this.set({ questionsLoading: true, questionsError: null });
    try {
      const cats = this.state.selectedCategories;
      const catSlugs = cats.length ? this.catNamesToSlugs(cats) : [];
      const params = new URLSearchParams({ count: String(ROUNDS) });
      if (catSlugs.length) params.set('categories', catSlugs.join(','));
      const raw = await this.auth!.api.get<DbQuestion[]>(`/questions/random?${params}`);
      this.qs = raw.map(mapQuestion);
    } catch {
      this.set({ questionsLoading: false, questionsError: 'Failed to load questions. Check your connection and try again.' });
      return;
    }
    this.set({ questionsLoading: false });
    this.resetBoard('match', this.qs.length, pickRival(you));
    this.set({ screen: 's-vs' });
    sfx.slam(); setTimeout(() => sfx.slam(), 180);
    this.later(() => {
      this.set({ screen: 's-match' });
      if (this.shouldTutorial()) this.startTutorial();
      else this.nextQuestion();
    }, calm() ? 1400 : 2600);
  }

  async startDaily() {
    if (!this.state.you) return this.openPicker('daily');
    if (this.save.daily && this.save.daily.date === today()) return this.showDailyResult(false);
    if (this.auth?.getSnapshot().status !== 'authenticated') {
      return this.set({ screen: 's-login' });
    }
    this.cut();
    this.set({ questionsLoading: true, questionsError: null });
    try {
      const raw = await this.auth!.api.get<DbQuestion[]>('/questions/daily');
      this.qs = raw.map(mapQuestion);
    } catch {
      this.set({ questionsLoading: false, questionsError: 'Failed to load daily questions. Check your connection and try again.' });
      return;
    }
    this.set({ questionsLoading: false });
    this.day = today();
    this.resetBoard('daily', this.qs.length, null);
    this.set({ screen: 's-match', dayLabel: niceDate(this.day) });
    this.nextQuestion();
  }

  /** Map category display names to slugs using the dbCategories cache. */
  private catNamesToSlugs(names: string[]): string[] {
    if (!this.dbCategories.length) return [];
    return names
      .map(n => this.dbCategories.find(c => c.name === n)?.slug)
      .filter((s): s is string => !!s);
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
        ? `Question ${qi + 1} of ${this.qs.length}. The earlier you buzz, the more it's worth.`
        : `Toss-up ${qi + 1} of ${this.qs.length}. Buzz as soon as you know it.`,
    });
    /* The rival decides whether to buzz, based on difficulty. Suppressed during tutorial. */
    const bp = this.botParams();
    const at = rand(bp.speedMin, bp.speedMax);
    this.rivalPlan = daily || this.state.tutorialStep > 0 || Math.random() >= bp.buzzChance ? null
      : { idx: at <= 1 ? Math.max(6, Math.ceil(at * this.all.length)) : Infinity, late: at > 1 ? 500 + ((at - 1) / (bp.speedMax - 1)) * 3400 : null };
    this.later(() => this.readTick(), 800);
  }

  /** Reveals the next word of the question. */
  private readTick() {
    if (this.tutorialPaused) return;
    const w = this.all[this.ri++];
    this.addWord(w);
    sfx.word();
    this.full = this.ri >= this.all.length;
    /* tutorial step 1: pause after 3 words */
    if (this.state.tutorialStep === 1 && this.ri >= 3) {
      this.tutorialPaused = true;
      this.set({ tutorialTip: 'The question is being read out. Wait for the buzzer to light up.' });
      return;
    }
    if (this.rivalPlan && this.ri >= this.rivalPlan.idx) return this.later(() => this.rivalBuzz(), 200);
    if (this.full) return this.openWindow();
    this.later(() => this.readTick(), 150 + w.length * 22 + (/[,.]$/.test(w) ? 240 : 0));
  }

  private openWindow() {
    this.phase = 'open';
    this.meter(OPEN_MS / 1000);
    this.status(`That\u2019s the whole question. Buzz now for 10.`);
    /* tutorial step 2: prompt the player to buzz */
    if (this.state.tutorialStep === 2) {
      this.set({ tutorialTip: 'The buzzer is live! Press it now to claim the question.' });
    }
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
        ? `Buzzed ${Math.round(this.heard * 100)}% in. Worth ${10 + Math.round((1 - this.heard) * 10)} if you're right` + (this.early ? ', −5 if not.' : '.')
        : this.early ? `Early buzz. 15 if you\u2019re right, \u22125 if not.` : `Your buzzer. 10 points if you\u2019re right.`,
    });
    if (this.state.tutorialStep === 2 || this.state.tutorialStep === 3) {
      this.set({ tutorialStep: 3, tutorialTip: 'Pick the right answer. 10 points if correct, 15 if you buzzed before the question ended.' });
      this.later(() => this.ask(this.q!, { secs: 6, done: this.tutorialAnswerDone }), 700);
    } else {
      this.later(() => this.ask(this.q!, { secs: 6, done: daily ? this.dailyAnswer : this.tossResult }), 700);
    }
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
      if (Math.random() < this.botParams().stealChance) {
        this.score('rival', 10); this.took('rival');
        this.rivalPanel(rival.short + ' answers', q.o[0], 'right');
        this.showAnswer(q); sfx.theirs(); this.status(`${rival.short} steals it. +10 to them.`);
        this.later(() => this.bonus('rival'), 1700);
      } else {
        this.took('none');
        this.rivalPanel(rival.short + ' passes', 'No answer');
        this.showAnswer(q); this.status(`${rival.short} couldn\u2019t take it either.`);
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
      if (Math.random() < this.botParams().knowChance) {
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
        if (Math.random() < this.botParams().bonusChance) { this.score('rival', 10); this.rivalPanel(name + ' answers', b.o[0], 'right'); sfx.theirs(); this.status(`${name} takes the bonus. +10 to them.`); }
        else { this.rivalPanel(name + ' answers', pick(b.o.slice(1)), 'wrong'); sfx.tap(); this.status(`${name} misses the bonus.`); }
        this.showAnswer(b);
        this.later(() => this.advance(), 2000);
      }, 1800);
    }
  }

  /* ---------- tutorial ---------- */
  private shouldTutorial() { return this.save.played === 0 && !isTutorialDone(); }

  private startTutorial() {
    /* replace question 0 with the tutorial question */
    this.qs[0] = TUTORIAL_Q;
    this.set({ tutorialStep: 1, tutorialTip: '' });
    this.nextQuestion();
  }

  private tutorialAnswerDone = (ok: boolean, text: string | null) => {
    const q = this.q!;
    record(this.save, q.c, ok); this.commit();
    if (ok) {
      const pts = this.early ? 15 : 10;
      this.score('you', pts); this.took('you'); this.tally.won++;
      if (this.early) this.tally.best = Math.min(this.tally.best ?? 1, this.heard);
      sfx.right(); this.cheer(46);
      this.fillRest(); this.showAnswer(q);
      this.set({
        tutorialStep: 4,
        tutorialTip: 'Nice! In a real match, a wrong answer loses 5 points and gives the rival a chance to steal.',
      });
    } else {
      if (this.early) this.score('you', -5);
      sfx.wrong();
      this.fillRest(); this.showAnswer(q);
      this.set({
        tutorialStep: 4,
        tutorialTip: 'Wrong answer! In a real match, that\u2019s \u22125 and the rival can steal.',
      });
    }
  };

  tutorialNext() {
    const step = this.state.tutorialStep;
    if (step === 1) {
      /* resume reading */
      this.tutorialPaused = false;
      this.set({ tutorialStep: 2, tutorialTip: '' });
      this.later(() => this.readTick(), 150);
    } else if (step === 4) {
      /* tutorial complete — proceed to normal match */
      markTutorialDone();
      this.set({ tutorialStep: 0, tutorialTip: '' });
      this.advance();
    }
    /* steps 2 and 3 don't need "Got it" — the player interacts with the buzzer / options naturally */
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

  /* ---------- team navigation ---------- */
  showTeams() { sfx.tap(); this.set({ screen: 's-team', teamView: 'list' }); }
  showCreateTeam() { sfx.tap(); this.set({ teamView: 'create' }); }
  showTeamLobby(team: TeamData) { sfx.tap(); this.set({ teamView: 'lobby', activeTeam: team, lobby: null, teamFinding: false }); }
  setMyTeams(teams: TeamData[]) { this.set({ myTeams: teams }); }
  backToTeamList() { sfx.tap(); this.set({ teamView: 'list', activeTeam: null, lobby: null, teamFinding: false }); }

  /* ---------- team lobby event handlers ---------- */
  onTeamLobbyUpdate(data: { teamId: string; teamName: string; inviteCode: string; members: { userId: string; username: string; rating: number; ready: boolean; isCaptain: boolean }[] }) {
    this.set({
      lobby: {
        teamId: data.teamId,
        teamName: data.teamName,
        inviteCode: data.inviteCode,
        members: data.members,
      },
    });
  }

  onTeamFinding() {
    this.set({ teamFinding: true });
  }

  onTeamMatchFound(data: { match_id: string; opponent_team: string }) {
    // The match:found event will handle the actual transition
    this.set({ teamFinding: false });
  }

  onTeamMatchTimeout() {
    this.set({ teamFinding: false });
  }

  /* ---------- notifications ---------- */
  onNotification(data: { id: string; type: string; title: string; body: string; data: Record<string, any>; created_at: string }) {
    const notif: NotificationData = { ...data, read: false };
    this.set({
      notifications: [notif, ...this.state.notifications].slice(0, 50),
      unreadCount: this.state.unreadCount + 1,
    });
  }
  setNotifications(items: NotificationData[]) {
    this.set({ notifications: items, unreadCount: items.filter(n => !n.read).length });
  }
  markNotificationsRead() {
    this.set({
      notifications: this.state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    });
  }

  /* ---------- challenges navigation ---------- */
  showChallenges() { sfx.tap(); this.set({ screen: 's-challenges', challengeView: 'board' }); }
  showCreateChallenge() { sfx.tap(); this.set({ challengeView: 'create' }); }
  showChallengeDetail(challenge: ChallengeData) { sfx.tap(); this.set({ challengeView: 'detail', activeChallenge: challenge }); }
  showChallengeLobby(challenge: ChallengeData) { sfx.tap(); this.set({ challengeView: 'lobby', activeChallenge: challenge, challengeLobby: null }); }
  backToChallengeBoard() { sfx.tap(); this.set({ challengeView: 'board', activeChallenge: null, challengeLobby: null }); }
  setChallenges(list: ChallengeData[]) { this.set({ challenges: list }); }

  /* ---------- challenge lobby event handlers ---------- */
  onChallengeLobbyUpdate(data: ChallengeLobbyState) {
    this.set({ challengeLobby: data });
  }
  onChallengeStarting(data: { challenge_id: string; countdown: number }) {
    this.status(`Challenge starting in ${data.countdown}\u2026`);
  }
  onChallengeLive(data: { challenge_id: string; match_id: string }) {
    // Transition handled by match:found
    this.set({ challengeView: 'board', activeChallenge: null, challengeLobby: null });
  }

  /* ---------- spectator ---------- */
  startSpectating(matchId: string) {
    this.set({ spectating: true, spectateMatchId: matchId, screen: 's-match', matchMode: 'online' });
  }
  stopSpectating() {
    this.set({ spectating: false, spectateMatchId: null });
    this.menu();
  }

  /* ---------- connectivity ---------- */
  setOnline(v: boolean) { this.set({ online: v }); }
  setReconnecting(v: boolean) { this.set({ reconnecting: v }); }

  /* ---------- university profile ---------- */
  showUniversityProfile(profile: UniversityProfileData) {
    this.set({ screen: 's-uni-profile', universityProfile: profile });
  }
  onSpectateState(data: { match_id: string; score_a: number; score_b: number; round: number; total: number }) {
    this.set({ scoreYou: data.score_a, scoreRival: data.score_b, qi: data.round - 1, total: data.total });
  }

  /* ---------- online event handlers ---------- */
  onlineMatchFound(data: { match_id: string; opponent: { username: string; rating: number; university?: { name: string; short_name: string; color_a: string; color_b: string; pattern: string } }; you_side: string }) {
    if (this.findTimer) { clearInterval(this.findTimer); this.findTimer = null; }
    this.mySide = data.you_side as 'a' | 'b';
    const opp = data.opponent;
    const rival: School = opp.university
      ? { id: opp.username, name: opp.university.name, country: '', short: opp.university.short_name, a: opp.university.color_a, b: opp.university.color_b, pat: opp.university.pattern as any }
      : { id: opp.username, name: opp.username, country: '', short: opp.username.slice(0, 10), a: '#1763B8', b: '#0E4D8E', pat: 'chief' };
    this.tally = { won: 0, bonus: 0, best: null };
    this.set({
      finding: false, privateWaiting: false, privateCode: null,
      matchMode: 'online', matchId: data.match_id, opponentName: opp.username,
      rival, screen: 's-vs',
    });
    sfx.slam(); setTimeout(() => sfx.slam(), 180);
  }

  onlineCountdown(data: { seconds: number }) {
    this.status(`Match starts in ${data.seconds}\u2026`);
    if (data.seconds <= 1) this.later(() => this.set({ screen: 's-match' }), 900);
  }

  onlineNewQuestion(data: { round: number; total: number; category: string }) {
    this.cut();
    this.phase = 'reading';
    this.all = [];
    this.ri = 0;
    this.full = false;
    this.early = false;
    this.heard = 1;
    this.rivalPlan = null;
    this.set({
      screen: 's-match', qi: data.round - 1, total: data.total, boardKey: data.round === 1 ? this.key() : this.state.boardKey,
      scoreYou: data.round === 1 ? 0 : this.state.scoreYou, scoreRival: data.round === 1 ? 0 : this.state.scoreRival,
      took: data.round === 1 ? [] : this.state.took,
      tag: data.category, bonusCard: false, words: [], answer: null, stamp: null,
      zone: 'buzz', buzzLive: true, ask: null, rivalView: null,
      window: { key: this.key(), secs: 0 },
      status: `Toss-up ${data.round} of ${data.total}. Buzz as soon as you know it.`,
    });
  }

  onlineWord(data: { word: string; index: number; total: number }) {
    this.all[data.index] = data.word;
    this.ri = data.index + 1;
    this.addWord(data.word);
    sfx.word();
    this.full = data.index >= data.total - 1;
  }

  onlineBuzzOpen(data: { duration_ms: number }) {
    this.phase = 'open';
    this.meter(data.duration_ms / 1000);
    this.status('That\u2019s the whole question. Buzz now for 10.');
  }

  onlineBuzzed(data: { side: string; username: string }) {
    this.cut();
    const isMe = data.side === this.mySide;
    this.early = !this.full;
    if (isMe) this.heard = this.ri / Math.max(this.all.length, 1);
    this.phase = isMe ? 'answer' : 'rival';
    const team: Team = isMe ? 'you' : 'rival';
    if (isMe) sfx.buzz(); else sfx.rbuzz();
    this.flash(team);
    this.stamp(data.username + ' buzzed', team);
    this.seat(team);
    this.set({
      buzzLive: false, window: { key: this.key(), secs: 0 },
      status: isMe
        ? (this.early ? 'Early buzz. 15 if you\u2019re right, \u22125 if not.' : 'Your buzzer. 10 points if you\u2019re right.')
        : `${data.username} buzzed${this.early ? ' early' : ''}.`,
    });
    if (!isMe) this.rivalPanel(data.username + ' is answering');
  }

  onlineAsk(data: { options: string[]; seconds: number; struck?: string }) {
    this.phase = 'answer';
    this.asking = {
      qa: { t: '', o: data.options },
      done: () => {}, // answer result comes from server
      over: false,
    };
    this.set({
      zone: 'opts', rivalView: null,
      ask: {
        key: this.key(), secs: data.seconds, paused: false,
        options: data.options.map(text => ({
          text, mark: text === data.struck ? 'struck' as const : '' as const,
          disabled: text === data.struck,
        })),
      },
    });
    for (let s = 3; s >= 1; s--) this.later(() => sfx.tick(), (data.seconds - s) * 1000);
  }

  onlineAnswerResult(data: { correct: boolean; correct_answer: string; points: number; score_a: number; score_b: number }) {
    this.cut();
    const myScore = this.mySide === 'a' ? data.score_a : data.score_b;
    const theirScore = this.mySide === 'a' ? data.score_b : data.score_a;
    this.set({ scoreYou: myScore, scoreRival: theirScore });
    if (this.asking) this.asking.over = true;
    // Mark the correct option in the UI
    const view = this.state.ask;
    if (view) {
      this.set({
        ask: { ...view, paused: true, options: view.options.map(o => ({ ...o, disabled: true, mark: o.text === data.correct_answer ? 'right' as const : o.mark })) },
      });
    }
    this.fillRest();
    this.set({ answer: data.correct_answer });
    if (data.correct && this.phase === 'answer') {
      sfx.right(); this.cheer(46);
      this.status(data.points >= 15 ? 'Right, and early. +15.' : 'Right. +10.');
      this.took('you');
      this.tally.won++;
    } else if (data.correct) {
      sfx.theirs();
    }
  }

  onlineRebound(data: { options: string[]; seconds: number; struck: string }) {
    this.fillRest();
    this.phase = 'answer';
    this.early = false;
    this.stamp('Steal for 10', 'you');
    this.onlineAsk({ options: data.options, seconds: data.seconds, struck: data.struck });
  }

  onlineBonus(data: { text: string; options: string[]; seconds: number; for_side: string }) {
    this.cut();
    this.phase = 'bonus';
    const forMe = data.for_side === this.mySide;
    const name = forMe ? (this.state.you?.short ?? 'You') : (this.state.opponentName ?? 'Opponent');
    this.set({
      bonusCard: true, tag: 'Bonus for ' + name, answer: null,
      words: data.text.split(' ').map((text, i) => ({ text, late: false, delay: i * 25 })),
    });
    if (forMe) {
      this.set({ zone: 'none', ask: null, rivalView: null, status: 'Bonus question. 10 points, no buzzer.' });
      this.later(() => this.onlineAsk({ options: data.options, seconds: data.seconds }), 800);
    } else {
      this.rivalPanel(name + ' takes the bonus');
      this.status(`Bonus question for ${name}.`);
    }
  }

  onlineBonusResult(data: { correct: boolean; correct_answer: string; points: number; score_a: number; score_b: number }) {
    this.cut();
    const myScore = this.mySide === 'a' ? data.score_a : data.score_b;
    const theirScore = this.mySide === 'a' ? data.score_b : data.score_a;
    this.set({ scoreYou: myScore, scoreRival: theirScore, answer: data.correct_answer });
    if (this.asking) this.asking.over = true;
    const view = this.state.ask;
    if (view) {
      this.set({
        ask: { ...view, paused: true, options: view.options.map(o => ({ ...o, disabled: true, mark: o.text === data.correct_answer ? 'right' as const : o.mark })) },
      });
    }
    if (data.correct && this.phase === 'bonus') {
      sfx.right(); this.cheer(30);
      this.tally.bonus++;
      this.status('Bonus taken. +10.');
    } else if (data.correct) {
      sfx.theirs();
    } else {
      sfx.wrong();
      this.status('Bonus missed.');
    }
  }

  onlineSuddenDeath() {
    this.status('Sudden death! Next point wins.');
  }

  onlineRoundEnd(data: { round: number; score_a: number; score_b: number; took: string }) {
    const myScore = this.mySide === 'a' ? data.score_a : data.score_b;
    const theirScore = this.mySide === 'a' ? data.score_b : data.score_a;
    this.set({ scoreYou: myScore, scoreRival: theirScore });
    const t = data.took === this.mySide ? 'you' as const : data.took === 'none' ? 'none' as const : 'rival' as const;
    this.took(t);
  }

  onlineMatchEnd(data: { match_id: string; score_a: number; score_b: number; rating_before: number; rating_after: number; rating_delta: number; rounds_won: number; total_rounds: number }) {
    this.cut();
    this.phase = 'done';
    const you = this.state.you!, rival = this.state.rival!;
    const scoreYou = this.mySide === 'a' ? data.score_a : data.score_b;
    const scoreRival = this.mySide === 'a' ? data.score_b : data.score_a;
    const d = scoreYou - scoreRival;
    this.save.rating = data.rating_after;
    this.save.played++;
    if (d > 0) this.save.won++; else if (d < 0) this.save.lost++; else this.save.drawn++;
    this.commit();
    this.set({
      scoreYou, scoreRival,
      screen: 's-result', resultKey: this.key(),
      result: {
        kind: 'match', you, rival, scoreYou, scoreRival,
        verdict: d > 0 ? `${you.short} beat ${rival.short}` : d < 0 ? `${rival.short} beat ${you.short}` : `${you.short} and ${rival.short} drew`,
        cells: [['Toss-ups', `${data.rounds_won}/${data.total_rounds}`], ['Bonuses', String(this.tally.bonus)], ['Earliest buzz', pct(this.tally.best)]],
        rate: `Your rating: ${data.rating_after}, ${data.rating_delta < 0 ? 'down' : 'up'} ${Math.abs(data.rating_delta)}.`,
        dare: d > 0 ? 'Can your school beat us?' : d < 0 ? 'Rematch and take it back.' : 'One more to settle it.',
      },
    });
    if (d > 0) { sfx.win(); confetti.rain(this.colors(['#E8322C', '#131211'])); }
    else if (d < 0) sfx.lose();
    else sfx.theirs();
  }

  onlineOpponentDisconnected() {
    this.status('Opponent disconnected. Waiting for them to return\u2026');
  }
  onlineOpponentReconnected() {
    this.status('Opponent reconnected.');
  }
  onlineOpponentForfeited() {
    this.status('Opponent forfeited.');
  }
  onlineReconnectState(data: { match_id: string; round: number; total: number; score_a: number; score_b: number; phase: string }) {
    const myScore = this.mySide === 'a' ? data.score_a : data.score_b;
    const theirScore = this.mySide === 'a' ? data.score_b : data.score_a;
    this.set({
      matchId: data.match_id, qi: data.round - 1, total: data.total,
      scoreYou: myScore, scoreRival: theirScore,
      screen: 's-match', matchMode: 'online', finding: false,
    });
    this.status('Reconnected. Waiting for next question\u2026');
  }

  onlineMatchmakingStatus(data: { position: number; elapsed_ms: number }) {
    this.set({ findElapsed: Math.round(data.elapsed_ms / 1000) });
    this.status(`Finding opponent\u2026 ${Math.round(data.elapsed_ms / 1000)}s`);
  }
  onlineMatchmakingTimeout(_data: { offer_bot: boolean }) {
    this.status('No opponents found yet.');
    this.set({ botOffer: true });
  }
  acceptBotMatch() {
    if (this.findTimer) { clearInterval(this.findTimer); this.findTimer = null; }
    this.set({ finding: false, botOffer: false });
  }
  dismissBotOffer() {
    this.set({ botOffer: false });
    this.status('Still searching\u2026');
  }

  /** Answer an online question by option index (sent to server). */
  onlineAnswer(index: number) {
    const view = this.state.ask;
    if (!view || this.asking?.over) return;
    const opt = view.options[index];
    if (!opt || opt.disabled) return;
    if (this.asking) this.asking.over = true;
    this.set({
      ask: { ...view, paused: true, options: view.options.map((o, i) => ({ ...o, disabled: true, mark: i === index ? 'wrong' as const : o.mark })) },
    });
  }

  private showDailyResult(fresh: boolean) {
    const d = this.save.daily!, you = this.state.you!, n = liveStreak(this.save);
    this.set({
      screen: 's-result', resultKey: this.key(),
      result: {
        kind: 'daily', you, date: d.date, score: d.score, marks: d.marks, streak: n,
        verdict: 'Daily challenge, ' + niceDate(d.date),
        cells: [['Right', `${d.right}/${DAILY}`], ['Streak', n === 1 ? '1 day' : n + ' days'], ['Earliest buzz', pct(d.best)]],
        dare: (fresh ? (d.froze ? 'Your free miss for the week kept the streak alive. ' : '') : `You\u2019ve played today\u2019s set. `) + `Next set in ${nextIn()}.`,
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
    if (d > 0) { sfx.win(); confetti.rain(this.colors(['#E8322C', '#131211'])); }
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
