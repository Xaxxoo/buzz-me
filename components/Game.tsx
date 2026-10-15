'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Backdrop } from '@/components/Backdrop';
import { Leaderboard } from '@/components/screens/Leaderboard';
import { Login } from '@/components/screens/Login';
import { Match } from '@/components/screens/Match';
import { Menu } from '@/components/screens/Menu';
import { Picker } from '@/components/screens/Picker';
import { Result } from '@/components/screens/Result';
import { Signup } from '@/components/screens/Signup';
import { Stats } from '@/components/screens/Stats';
import { Team } from '@/components/screens/Team';
import { UniversityProfile } from '@/components/screens/UniversityProfile';
import { Versus } from '@/components/screens/Versus';
import { Challenge } from '@/components/screens/Challenge';
import { NotificationBell } from '@/components/NotificationBell';
import { AuthClient } from '@/lib/auth';
import { API_BASE, GAME_NAME } from '@/lib/config';
import { GameEngine } from '@/lib/engine';
import { registerPush } from '@/lib/push';
import { SocketClient } from '@/lib/socket';
import type { TeamData, ChallengeData, UniversityProfileData } from '@/lib/types';

/**
 * The whole game is one client component tree driven by a GameEngine instance.
 * Every screen stays mounted and is shown or hidden, which keeps the picker's scroll
 * position and lets CSS entrance animations replay each time a screen appears.
 */
export default function Game() {
  const [auth] = useState(() => new AuthClient());
  const [engine] = useState(() => { const e = new GameEngine(); e.auth = auth; return e; });
  const [socket] = useState(() => new SocketClient(engine, auth));
  const authState = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getSnapshot);
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const stage = useRef<HTMLElement>(null);

  /* hydrate auth first, then engine */
  useEffect(() => { auth.hydrate(); }, [auth]);

  /* Android back button and iOS back-swipe: go back to the menu instead of leaving the game.
     Every screen off the menu sits on one extra history entry; mid-match, back is ignored. */
  useEffect(() => {
    const away = s.screen !== 's-title';
    const pushed = history.state?.quad === 1;
    if (away && !pushed) history.pushState({ quad: 1 }, '');
    else if (!away && pushed) history.back();
  }, [s.screen]);
  useEffect(() => {
    const onPop = () => {
      const scr = engine.getSnapshot().screen;
      if (scr === 's-title') return;
      if (scr === 's-match' || scr === 's-vs') { history.pushState({ quad: 1 }, ''); return; }
      engine.menu();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [engine]);
  useEffect(() => {
    if (authState.status !== 'loading') engine.hydrate();
  }, [engine, authState.status]);

  /* connect socket when authenticated, disconnect on cleanup or logout */
  useEffect(() => {
    if (authState.status === 'authenticated') {
      socket.connect();
      registerPush(auth).catch(() => {});
    } else {
      socket.disconnect();
    }
    return () => socket.disconnect();
  }, [socket, auth, authState.status]);

  /* online/offline detection */
  useEffect(() => {
    engine.setOnline(navigator.onLine);
    const goOnline = () => engine.setOnline(true);
    const goOffline = () => engine.setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [engine]);

  /* Space buzzes, 1-4 or A-D answers */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (engine.getSnapshot().screen !== 's-match' || e.repeat || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        if (s.matchMode === 'online') socket.buzz();
        else engine.buzz();
        return;
      }
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase(), i = '1234'.includes(k) ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (i >= 0) {
        if (s.matchMode === 'online') socket.answer(i);
        else engine.answerIndex(i);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, socket, s.matchMode]);

  /* a small shake of the whole stage on every buzz */
  const flashKey = s.flash?.key ?? 0;
  useEffect(() => {
    const el = stage.current;
    if (!flashKey || !el) return;
    el.classList.remove('jolt');
    void el.offsetWidth;
    el.classList.add('jolt');
  }, [flashKey]);

  const flashColor = (s.flash?.team === 'rival' ? s.rival?.a : s.you?.a) ?? '#E8322C';
  const vars = { '--you': s.you?.a ?? '#0B8457', '--rival': s.rival?.a ?? '#1763B8' } as CSSProperties;

  const onBuzz = () => {
    navigator.vibrate?.(50);
    if (s.matchMode === 'online') socket.buzz(); else engine.buzz();
  };
  const onAnswer = (text: string) => {
    if (s.matchMode === 'online') {
      const idx = s.ask?.options.findIndex(o => o.text === text) ?? -1;
      if (idx >= 0) socket.answer(idx);
    } else {
      engine.answer(text);
    }
  };

  const onQuickMatch = () => {
    engine.findQuickMatch();
    const cats = engine.getSnapshot().selectedCategories;
    socket.findMatch(cats.length ? cats : undefined);
  };

  const onAcceptBot = () => {
    const cats = engine.getSnapshot().selectedCategories;
    engine.acceptBotMatch();
    socket.acceptBotMatch(cats.length ? cats : undefined);
  };
  const onDismissBot = () => engine.dismissBotOffer();
  const onCancelFind = () => { socket.cancelFind(); engine.cancelFind(); };

  /* ---------- friendly (private) match ---------- */
  const [joinCode, setJoinCode] = useState('');
  const onFriendly = () => {
    engine.startPrivateMatch();
    socket.createPrivateMatch();
  };
  const onJoinPrivate = () => {
    if (!joinCode.trim()) return;
    engine.joinPrivateMatch();
    socket.joinPrivateMatch(joinCode.trim());
  };
  const onCancelPrivate = () => {
    engine.cancelPrivateMatch();
  };

  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const fetchMyTeams = async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const res = await auth.api.get<TeamData[]>('/teams/mine');
      engine.setMyTeams(res);
    } catch { setTeamsError('Failed to load teams.'); }
    setTeamsLoading(false);
  };
  const onTeams = () => { engine.showTeams(); fetchMyTeams(); };
  const onCreateTeam = async (name: string) => {
    try {
      await auth.api.post('/teams', { name });
      await fetchMyTeams();
      engine.backToTeamList();
    } catch { /* ignore */ }
  };
  const onJoinByCode = async (code: string) => {
    try {
      await auth.api.post(`/teams/join/${code}`);
      await fetchMyTeams();
    } catch { /* ignore */ }
  };
  const onSelectTeam = (team: TeamData) => {
    engine.showTeamLobby(team);
    socket.joinTeamLobby(team.id);
  };
  const onLeaveLobby = (teamId: string) => {
    socket.leaveTeamLobby(teamId);
    engine.backToTeamList();
  };
  const onRegenerateCode = async (teamId: string) => {
    try {
      await auth.api.patch(`/teams/${teamId}/invite-code`);
      await fetchMyTeams();
    } catch { /* ignore */ }
  };
  const onTransferCaptain = async (teamId: string, newCaptainId: string) => {
    try {
      await auth.api.patch(`/teams/${teamId}/captain`, { new_captain_id: newCaptainId });
      await fetchMyTeams();
    } catch { /* ignore */ }
  };
  const onRemoveMember = async (teamId: string, memberId: string) => {
    try {
      await auth.api.del(`/teams/${teamId}/members/${memberId}`);
      await fetchMyTeams();
    } catch { /* ignore */ }
  };

  /* ---------- challenges ---------- */
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengesError, setChallengesError] = useState<string | null>(null);
  const fetchChallenges = async () => {
    setChallengesLoading(true);
    setChallengesError(null);
    try {
      const res = await auth.api.get<ChallengeData[]>('/challenges');
      engine.setChallenges(res);
    } catch { setChallengesError('Failed to load challenges.'); }
    setChallengesLoading(false);
  };
  const onChallenges = () => { engine.showChallenges(); fetchChallenges(); };
  const onCreateChallenge = async (dto: { categories: string[]; question_count: number; team_size: number; start_at: string | null }) => {
    try {
      const created = await auth.api.post<ChallengeData>('/challenges', dto);
      await fetchChallenges();
      engine.showChallengeDetail(created);
    } catch { /* ignore */ }
  };
  const onAcceptChallenge = async (id: string) => {
    try {
      const updated = await auth.api.post<ChallengeData>(`/challenges/${id}/accept`);
      engine.showChallengeLobby(updated);
      socket.joinChallengeLobby(id);
    } catch { /* ignore */ }
  };
  const onJoinChallengeLobby = (id: string) => {
    const ch = s.challenges.find(c => c.id === id) || s.activeChallenge;
    if (ch) { engine.showChallengeLobby(ch); socket.joinChallengeLobby(id); }
  };
  const onLeaveChallengeLobby = (id: string) => {
    socket.leaveChallengeLobby(id);
    engine.backToChallengeBoard();
  };
  const onCancelChallenge = async (id: string) => {
    try {
      await auth.api.del(`/challenges/${id}`);
      await fetchChallenges();
      engine.backToChallengeBoard();
    } catch { /* ignore */ }
  };

  /* ---------- notifications ---------- */
  const [notifsLoading, setNotifsLoading] = useState(false);
  const fetchNotifications = async () => {
    setNotifsLoading(true);
    try {
      const res = await auth.api.get<{ items: any[] }>('/notifications');
      engine.setNotifications(res.items);
    } catch { /* ignore */ }
    setNotifsLoading(false);
  };
  const onNotifOpen = () => { fetchNotifications(); };
  const onMarkAllRead = async () => {
    try {
      await auth.api.put('/notifications/read-all');
      engine.markNotificationsRead();
    } catch { /* ignore */ }
  };

  /* ---------- university profile ---------- */
  const onViewUniversity = async (universityId: string) => {
    try {
      const profile = await auth.api.get<UniversityProfileData>(`/universities/${universityId}/profile`);
      engine.showUniversityProfile(profile);
    } catch { /* ignore */ }
  };

  /* ---------- spectate ---------- */
  const onJoinSpectate = (matchId: string) => {
    engine.startSpectating(matchId);
    socket.joinSpectate(matchId);
  };
  const onLeaveSpectate = () => {
    if (s.spectateMatchId) socket.leaveSpectate(s.spectateMatchId);
    engine.stopSpectating();
  };

  /* ---------- direct player challenge ---------- */
  const onAcceptPlayerChallenge = (fromUserId: string) => {
    socket.respondChallenge(fromUserId, true);
    engine.acceptedChallenge();
  };
  const onDeclinePlayerChallenge = (fromUserId: string) => {
    socket.respondChallenge(fromUserId, false);
    engine.dismissChallenge();
  };

  return (
    <>
      <Backdrop flashKey={flashKey} flashColor={flashColor} />
      {!s.online && <div className="offline-banner">You&apos;re offline. Some features may not work.</div>}
      {s.reconnecting && s.online && <div className="reconnecting-banner">Reconnecting&hellip;</div>}
      <main className="stage" id="stage" data-screen={s.screen} ref={stage} style={vars}>
        <div className="flex items-center justify-between min-h-9 shrink-0">
          <span className="mini">{GAME_NAME}</span>
          <div className="flex items-center gap-2">
            {authState.status === 'authenticated' && (
              <NotificationBell
                notifications={s.notifications}
                unreadCount={s.unreadCount}
                loading={notifsLoading}
                onOpen={onNotifOpen}
                onMarkAllRead={onMarkAllRead}
              />
            )}
            {authState.status === 'authenticated' && <span className="auth-bar">{authState.user?.username}</span>}
            <button className="sound" id="sound" type="button" aria-pressed={s.muted} aria-label={s.muted ? 'Turn sound on' : 'Mute sound'} onClick={() => engine.toggleMute()}>
              <svg className="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M17 8.5a5 5 0 0 1 0 7" /><path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
              </svg>
              <svg className="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" /><path d="M17 9l5 6M22 9l-5 6" />
              </svg>
            </button>
          </div>
        </div>

        <Menu
          active={s.screen === 's-title'} save={s.save} you={s.you}
          authStatus={authState.status} username={authState.user?.username ?? null}
          onPlay={() => engine.play()} onDaily={() => engine.daily()} onStats={() => engine.showStats()}
          onSignIn={() => engine.showLogin()} onQuickMatch={onQuickMatch} onLeaderboard={() => engine.showLeaderboard()}
          onTeams={onTeams} onChallenges={onChallenges} onFriendly={onFriendly}
        />
        <Picker
          key={s.pickKey} active={s.screen === 's-pick'} you={s.you} forDaily={s.pending === 'daily'}
          selectedCategories={s.selectedCategories} difficulty={s.difficulty}
          onSetCategories={cats => engine.setCategories(cats)} onSetDifficulty={d => engine.setDifficulty(d)}
          onChoose={sch => engine.choose(sch)} onGo={() => engine.go()} onMenu={() => engine.menu()}
        />
        <Stats
          active={s.screen === 's-stats'} save={s.save} you={s.you} onMenu={() => engine.menu()}
          devices={s.devices}
          onFetchDevices={authState.status === 'authenticated' ? async () => {
            try { const res = await auth.api.get<any[]>('/auth/sessions'); engine.setDevices(res); } catch {}
          } : undefined}
          onRevokeDevice={authState.status === 'authenticated' ? async (id: string) => {
            try { await auth.api.del(`/auth/sessions/${id}`); engine.removeDevice(id); } catch {}
          } : undefined}
        />
        <Versus active={s.screen === 's-vs'} you={s.you} rival={s.rival} />
        <Match active={s.screen === 's-match'} s={s} boardKey={String(s.boardKey)} onBuzz={onBuzz} onAnswer={onAnswer} onAcceptBot={onAcceptBot} onDismissBot={onDismissBot} onCancelFind={onCancelFind} onJoinPrivate={(code) => { engine.joinPrivateMatch(); socket.joinPrivateMatch(code); }} onCancelPrivate={onCancelPrivate} onTutorialNext={() => engine.tutorialNext()} />
        <Result
          active={s.screen === 's-result'} result={s.result} resultKey={s.resultKey}
          authStatus={authState.status}
          onAgain={() => engine.rematch()} onMenu={() => engine.menu()} onSignup={() => engine.showSignup()}
        />
        <Login active={s.screen === 's-login'} auth={auth} onSignup={() => engine.showSignup()} onMenu={() => engine.menu()} />
        <Signup active={s.screen === 's-signup'} auth={auth} onLogin={() => engine.showLogin()} onMenu={() => engine.menu()} />
        <Team
          active={s.screen === 's-team'}
          myTeams={s.myTeams}
          teamView={s.teamView}
          activeTeam={s.activeTeam}
          lobby={s.lobby}
          teamFinding={s.teamFinding}
          userId={authState.user?.id ?? null}
          loading={teamsLoading}
          error={teamsError}
          onRetry={fetchMyTeams}
          onMenu={() => engine.menu()}
          onCreateTeam={onCreateTeam}
          onJoinByCode={onJoinByCode}
          onSelectTeam={onSelectTeam}
          onShowCreate={() => engine.showCreateTeam()}
          onBackToList={() => engine.backToTeamList()}
          onJoinLobby={(teamId) => socket.joinTeamLobby(teamId)}
          onLeaveLobby={onLeaveLobby}
          onReady={(teamId, ready) => socket.teamReady(teamId, ready)}
          onStartFind={(teamId) => socket.teamStartFind(teamId)}
          onCancelFind={(teamId) => socket.teamCancelFind(teamId)}
          onChallenge={(teamId, code) => socket.teamChallenge(teamId, code)}
          onRegenerateCode={onRegenerateCode}
          onTransferCaptain={onTransferCaptain}
          onRemoveMember={onRemoveMember}
        />
        <Challenge
          active={s.screen === 's-challenges'}
          challengeView={s.challengeView}
          challenges={s.challenges}
          activeChallenge={s.activeChallenge}
          challengeLobby={s.challengeLobby}
          userId={authState.user?.id ?? null}
          loading={challengesLoading}
          error={challengesError}
          onRetry={fetchChallenges}
          onMenu={() => engine.menu()}
          onShowCreate={() => engine.showCreateChallenge()}
          onBackToBoard={() => engine.backToChallengeBoard()}
          onSelectChallenge={(c) => engine.showChallengeDetail(c)}
          onCreateChallenge={onCreateChallenge}
          onAcceptChallenge={onAcceptChallenge}
          onJoinLobby={onJoinChallengeLobby}
          onLeaveLobby={onLeaveChallengeLobby}
          onCancelChallenge={onCancelChallenge}
          onReady={(id, ready) => socket.challengeReady(id, ready)}
          onStart={(id) => socket.challengeStart(id)}
          onSpectate={(challengeId) => {
            // Join the challenge lobby to receive challenge:live events, then spectate
            socket.joinChallengeLobby(challengeId);
          }}
        />
        <Leaderboard active={s.screen === 's-leaderboard'} auth={auth} authStatus={authState.status} onMenu={() => engine.menu()} />
        <UniversityProfile active={s.screen === 's-uni-profile'} profile={s.universityProfile} onMenu={() => engine.menu()} />

        {s.incomingChallenge && (
          <div className="challenge-toast">
            <p><b>{s.incomingChallenge.fromUsername}</b> ({s.incomingChallenge.fromRating}) wants to play!</p>
            <div className="flex gap-2">
              <button className="btn small" type="button" onClick={() => onAcceptPlayerChallenge(s.incomingChallenge!.fromUserId)}>Accept</button>
              <button className="btn ghost small" type="button" onClick={() => onDeclinePlayerChallenge(s.incomingChallenge!.fromUserId)}>Decline</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
