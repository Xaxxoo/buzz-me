import { io, type Socket } from 'socket.io-client';
import type { AuthClient } from './auth';
import { WS_URL } from './config';
import type { GameEngine } from './engine';
import type { ClientToServerEvents, ServerToClientEvents } from './socket-events';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketClient {
  private socket: GameSocket | null = null;
  private engine: GameEngine;
  private auth: AuthClient;
  /** Estimated offset: serverTime ≈ Date.now() + clockOffset */
  clockOffset = 0;

  constructor(engine: GameEngine, auth: AuthClient) {
    this.engine = engine;
    this.auth = auth;
  }

  /** Returns estimated server time right now. */
  clockNow() { return Date.now() + this.clockOffset; }

  connect() {
    if (this.socket?.connected) return;
    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io(`${WS_URL}/game`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    }) as GameSocket;

    this.bindEvents();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /* ---------- client→server ---------- */
  findMatch(categories?: string[]) {
    this.socket?.emit('match:find', { categories });
  }
  cancelFind() {
    this.socket?.emit('match:cancel_find');
  }
  acceptBotMatch(categories?: string[]) {
    this.socket?.emit('match:cancel_find');
    this.socket?.emit('match:solo', { categories });
  }
  startSolo(categories?: string[]) {
    this.socket?.emit('match:solo', { categories });
  }
  buzz() {
    this.socket?.emit('match:buzz', { timestamp: Date.now() });
  }
  answer(index: number) {
    this.engine.onlineAnswer(index);
    this.socket?.emit('match:answer', { option_index: index });
  }

  /* ---------- direct player challenge ---------- */
  fetchOnlinePlayers() {
    this.socket?.emit('players:online');
  }
  challengePlayer(targetUserId: string) {
    this.socket?.emit('match:challenge_player', { target_user_id: targetUserId });
  }
  respondChallenge(fromUserId: string, accept: boolean) {
    this.socket?.emit('match:challenge_respond', { from_user_id: fromUserId, accept });
  }

  /* ---------- private (friendly) match ---------- */
  createPrivateMatch() {
    this.socket?.emit('match:create_private');
  }
  joinPrivateMatch(code: string) {
    this.socket?.emit('match:join_private', { code });
  }

  /* ---------- team client→server ---------- */
  joinTeamLobby(teamId: string) {
    this.socket?.emit('team:join_lobby', { team_id: teamId });
  }
  leaveTeamLobby(teamId: string) {
    this.socket?.emit('team:leave_lobby', { team_id: teamId });
  }
  teamReady(teamId: string, ready: boolean) {
    this.socket?.emit('team:ready', { team_id: teamId, ready });
  }
  teamStartFind(teamId: string, categories?: string[]) {
    this.socket?.emit('team:start_find', { team_id: teamId, categories });
  }
  teamCancelFind(teamId: string) {
    this.socket?.emit('team:cancel_find', { team_id: teamId });
  }
  teamChallenge(teamId: string, opponentCode: string) {
    this.socket?.emit('team:challenge', { team_id: teamId, opponent_code: opponentCode });
  }

  /* ---------- challenge client→server ---------- */
  joinChallengeLobby(challengeId: string) {
    this.socket?.emit('challenge:join_lobby', { challenge_id: challengeId });
  }
  leaveChallengeLobby(challengeId: string) {
    this.socket?.emit('challenge:leave_lobby', { challenge_id: challengeId });
  }
  challengeReady(challengeId: string, ready: boolean) {
    this.socket?.emit('challenge:ready', { challenge_id: challengeId, ready });
  }
  challengeStart(challengeId: string) {
    this.socket?.emit('challenge:start', { challenge_id: challengeId });
  }

  /* ---------- spectate client→server ---------- */
  joinSpectate(matchId: string) {
    this.socket?.emit('spectate:join', { match_id: matchId });
  }
  leaveSpectate(matchId: string) {
    this.socket?.emit('spectate:leave', { match_id: matchId });
  }

  /* ---------- server→client ---------- */
  private bindEvents() {
    const s = this.socket;
    if (!s) return;

    s.on('match:found', d => this.engine.onlineMatchFound(d));
    s.on('match:countdown', d => this.engine.onlineCountdown(d));
    s.on('match:question', d => this.engine.onlineNewQuestion(d));
    s.on('match:buzz_open', d => this.engine.onlineBuzzOpen(d));
    s.on('match:buzzed', d => this.engine.onlineBuzzed(d));
    s.on('match:ask', d => this.engine.onlineAsk(d));
    s.on('match:answer_result', d => this.engine.onlineAnswerResult(d));
    s.on('match:rebound', d => this.engine.onlineRebound(d));
    s.on('match:bonus', d => this.engine.onlineBonus(d));
    s.on('match:bonus_result', d => this.engine.onlineBonusResult(d));
    s.on('match:round_end', d => this.engine.onlineRoundEnd(d));
    s.on('match:sudden_death', () => this.engine.onlineSuddenDeath());
    s.on('match:end', d => this.engine.onlineMatchEnd(d));
    s.on('match:opponent_disconnected', () => this.engine.onlineOpponentDisconnected());
    s.on('match:opponent_reconnected', () => this.engine.onlineOpponentReconnected());
    s.on('match:opponent_forfeited', () => this.engine.onlineOpponentForfeited());
    s.on('match:reconnect_state', d => this.engine.onlineReconnectState(d));
    s.on('matchmaking:status', d => this.engine.onlineMatchmakingStatus(d));
    s.on('matchmaking:timeout', d => this.engine.onlineMatchmakingTimeout(d));

    // Direct player challenge events
    s.on('players:online_list', d => this.engine.onOnlinePlayers(d));
    s.on('match:challenge_received', d => this.engine.onChallengeReceived(d));
    s.on('match:challenge_declined', d => this.engine.onChallengeDeclined(d));
    s.on('match:challenge_cancelled', () => this.engine.onChallengeCancelled());

    // Private match events
    s.on('match:private_created', d => this.engine.onPrivateCreated(d));
    s.on('private:expired', d => this.engine.onPrivateExpired(d));

    // Team events
    s.on('team:lobby_update', d => this.engine.onTeamLobbyUpdate(d));
    s.on('team:finding', () => this.engine.onTeamFinding());
    s.on('team:match_found', d => this.engine.onTeamMatchFound(d));
    s.on('team:match_timeout', () => this.engine.onTeamMatchTimeout());

    // Notification events
    s.on('notification:new', d => this.engine.onNotification(d));

    // Challenge events
    s.on('challenge:lobby_update', d => this.engine.onChallengeLobbyUpdate(d));
    s.on('challenge:starting', d => this.engine.onChallengeStarting(d));
    s.on('challenge:live', d => this.engine.onChallengeLive(d));

    // Spectate events
    s.on('spectate:state', d => this.engine.onSpectateState(d));

    s.on('disconnect', () => {
      this.engine.setReconnecting(true);
    });
    s.io.on('reconnect_attempt', () => {
      this.engine.setReconnecting(true);
    });

    // Clock sync reply
    s.on('time:sync_reply' as any, (data: { t0: number; t1: number }) => {
      const t2 = Date.now();
      const rtt = t2 - data.t0;
      this.clockOffset = data.t1 - data.t0 - Math.round(rtt / 2);
      this.engine.setClockOffset(this.clockOffset);
    });

    s.on('connect', () => {
      this.engine.setReconnecting(false);
      // Measure clock offset with server
      s.emit('time:sync', { t0: Date.now() });
      // On reconnect, rejoin match if one was in progress
      const snap = this.engine.getSnapshot();
      if (snap.screen === 's-match' && snap.matchMode === 'online' && snap.matchId) {
        s.emit('match:reconnect', { match_id: snap.matchId });
      }
      // Auto-join a private match if arriving via invite link
      if (snap.pendingJoinCode) {
        const code = snap.pendingJoinCode;
        this.engine.joinPrivateMatch();
        s.emit('match:join_private', { code });
        this.engine.clearPendingJoin();
      }
    });

    s.on('connect_error', async () => {
      // Try refreshing the token
      try {
        const token = this.auth.getToken();
        if (token && s.auth) {
          (s.auth as any).token = token;
        }
      } catch { /* ignore */ }
    });
  }
}
