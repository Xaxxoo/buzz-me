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

  constructor(engine: GameEngine, auth: AuthClient) {
    this.engine = engine;
    this.auth = auth;
  }

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

  /* ---------- server→client ---------- */
  private bindEvents() {
    const s = this.socket;
    if (!s) return;

    s.on('match:found', d => this.engine.onlineMatchFound(d));
    s.on('match:countdown', d => this.engine.onlineCountdown(d));
    s.on('match:question', d => this.engine.onlineNewQuestion(d));
    s.on('match:word', d => this.engine.onlineWord(d));
    s.on('match:buzz_open', d => this.engine.onlineBuzzOpen(d));
    s.on('match:buzzed', d => this.engine.onlineBuzzed(d));
    s.on('match:ask', d => this.engine.onlineAsk(d));
    s.on('match:answer_result', d => this.engine.onlineAnswerResult(d));
    s.on('match:rebound', d => this.engine.onlineRebound(d));
    s.on('match:bonus', d => this.engine.onlineBonus(d));
    s.on('match:bonus_result', d => this.engine.onlineBonusResult(d));
    s.on('match:round_end', d => this.engine.onlineRoundEnd(d));
    s.on('match:end', d => this.engine.onlineMatchEnd(d));
    s.on('match:opponent_disconnected', () => this.engine.onlineOpponentDisconnected());
    s.on('match:opponent_reconnected', () => this.engine.onlineOpponentReconnected());
    s.on('match:opponent_forfeited', () => this.engine.onlineOpponentForfeited());
    s.on('matchmaking:status', d => this.engine.onlineMatchmakingStatus(d));
    s.on('matchmaking:timeout', d => this.engine.onlineMatchmakingTimeout(d));

    // Team events
    s.on('team:lobby_update', d => this.engine.onTeamLobbyUpdate(d));
    s.on('team:finding', () => this.engine.onTeamFinding());
    s.on('team:match_found', d => this.engine.onTeamMatchFound(d));
    s.on('team:match_timeout', () => this.engine.onTeamMatchTimeout());

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
