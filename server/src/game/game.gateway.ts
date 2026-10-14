import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { TeamLobbyService } from './team-lobby.service';
import { TeamMatchmakingService } from './team-matchmaking.service';
import { ChallengeLobbyService } from './challenge-lobby.service';
import { TeamsService } from '../teams/teams.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private userSockets = new Map<string, Socket>();

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
    private matchmakingService: MatchmakingService,
    private teamLobbyService: TeamLobbyService,
    private teamMatchmakingService: TeamMatchmakingService,
    private challengeLobbyService: ChallengeLobbyService,
    private teamsService: TeamsService,
  ) {}

  /** Emit an event to a user's socket if they are currently connected. Returns true if delivered. */
  emitToUser(userId: string, event: string, data: any): boolean {
    const socket = this.userSockets.get(userId);
    if (socket?.connected) { socket.emit(event, data); return true; }
    return false;
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.auth?.token as string;
      if (!token) {
        client.emit('error', { message: 'Missing auth token' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      (client as any).user = { id: payload.sub, username: payload.username };
      this.userSockets.set(payload.sub, client);
      this.logger.log(`Client connected: ${payload.username} (${client.id})`);

      // RTT measurement
      const start = Date.now();
      client.emit('ping_measure', { t: start });
      client.once('pong_measure', (data: { t: number }) => {
        (client as any).rtt = Date.now() - data.t;
      });
    } catch {
      client.emit('error', { message: 'Invalid auth token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    // Only remove from map if this socket is still the registered one (prevents race with reconnect)
    if (this.userSockets.get(user.id) === client) {
      this.userSockets.delete(user.id);
    }
    this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
    this.matchmakingService.removeFromQueue(user.id);
    // Clean up team lobby if disconnected
    const lobby = this.teamLobbyService.getLobbyByUser(user.id);
    if (lobby) this.teamLobbyService.leaveLobby(lobby.teamId, user.id, this.server);
    // Clean up challenge lobby if disconnected
    const cLobby = this.challengeLobbyService.getLobbyByUser(user.id);
    if (cLobby) this.challengeLobbyService.leaveLobby(cLobby.challengeId, user.id, this.server);
    this.gameService.cleanupPrivateCodes(user.id);
    this.gameService.cleanupPlayerChallenges(user.id);
    this.gameService.handleDisconnect(user.id);
  }

  @SubscribeMessage('match:solo')
  async handleSoloMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { categories?: string[] },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const room = await this.gameService.createSoloRoom(client, user);
    client.emit('match:found', {
      match_id: room.id,
      opponent: { id: 'bot', username: 'Bot', rating: 1000 },
      you_side: 'a',
    });
  }

  @SubscribeMessage('match:find')
  handleFindMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { categories?: string[] },
  ) {
    const user = (client as any).user;
    if (!user) return;

    this.matchmakingService.addToQueue(client, user, data?.categories || []);
  }

  @SubscribeMessage('match:cancel_find')
  handleCancelFind(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    this.matchmakingService.removeFromQueue(user.id);
  }

  @SubscribeMessage('match:buzz')
  handleBuzz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { timestamp: number },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const room = this.gameService.getRoomByUser(user.id);
    if (!room) return;

    this.gameService.handleBuzz(room, user.id, data?.timestamp || Date.now());
  }

  @SubscribeMessage('match:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { option_index: number },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const room = this.gameService.getRoomByUser(user.id);
    if (!room) return;

    const side = this.gameService.findSideByUser(room, user.id) || 'b';

    if (room.phase === 'answering') {
      this.gameService.handleAnswer(room, side, data.option_index);
    } else if (room.phase === 'rebound') {
      this.gameService.handleRebound(room, side, data.option_index);
    } else if (room.phase === 'bonus') {
      this.gameService.handleBonus(room, side, data.option_index);
    }
  }

  @SubscribeMessage('match:reconnect')
  handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { match_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const success = this.gameService.handleReconnect(client, user.id, data.match_id);
    if (!success) {
      client.emit('error', { message: 'Match not found or expired' });
    }
  }

  // ---------- Online players ----------

  @SubscribeMessage('players:online')
  async handleOnlinePlayers(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    const onlineIds = Array.from(this.userSockets.keys()).filter(id => id !== user.id);
    // Batch-fetch usernames and ratings
    const players: { id: string; username: string; rating: number }[] = [];
    for (const id of onlineIds.slice(0, 50)) {
      const socket = this.userSockets.get(id);
      const socketUser = socket ? (socket as any).user : null;
      if (!socketUser) continue;
      const dbUser = await this.gameService.getDbUser(id);
      players.push({ id, username: socketUser.username, rating: dbUser?.rating || 1000 });
    }
    client.emit('players:online_list', { players });
  }

  // ---------- Direct player challenge ----------

  @SubscribeMessage('match:challenge_player')
  async handleChallengePlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { target_user_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const dbUser = await this.gameService.getDbUser(user.id);
    const sent = this.gameService.sendPlayerChallenge(
      client,
      { id: user.id, username: user.username },
      data.target_user_id,
      {
        emitToUser: (userId, event, d) => {
          // Enrich with rating
          if (event === 'match:challenge_received') {
            d.from_rating = dbUser?.rating || 1000;
          }
          return this.emitToUser(userId, event, d);
        },
      },
    );
    if (!sent) {
      client.emit('error', { message: 'Player is offline or in a match' });
    }
  }

  @SubscribeMessage('match:challenge_respond')
  async handleChallengeRespond(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { from_user_id: string; accept: boolean },
  ) {
    const user = (client as any).user;
    if (!user) return;

    await this.gameService.respondPlayerChallenge(
      client,
      { id: user.id, username: user.username },
      data.from_user_id,
      data.accept,
    );
  }

  // ---------- Private (friendly) match handlers ----------

  @SubscribeMessage('match:create_private')
  handleCreatePrivate(@ConnectedSocket() client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    const code = this.gameService.createPrivateCode(client, user);
    client.emit('match:private_created', { code });
  }

  @SubscribeMessage('match:join_private')
  async handleJoinPrivate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const room = await this.gameService.joinPrivateRoom(
      (data.code || '').toUpperCase(),
      client,
      user,
    );
    if (!room) {
      client.emit('error', { message: 'Invalid or expired room code' });
    }
  }

  // ---------- Team handlers ----------

  @SubscribeMessage('team:join_lobby')
  async handleTeamJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    try {
      const team = await this.teamsService.findOne(data.team_id);
      const isMember = team.members?.some(m => m.user_id === user.id);
      if (!isMember) {
        client.emit('error', { message: 'You are not a member of this team' });
        return;
      }

      const dbUser = await this.gameService.getDbUser?.(user.id);
      this.teamLobbyService.joinLobby(
        team.id,
        team.name,
        team.invite_code,
        team.university_id,
        team.captain_id,
        {
          id: user.id,
          username: user.username,
          rating: dbUser?.rating || 1000,
          universityId: dbUser?.university_id || null,
        },
        client,
      );
    } catch (err: any) {
      client.emit('error', { message: err.message || 'Failed to join lobby' });
    }
  }

  @SubscribeMessage('team:leave_lobby')
  handleTeamLeaveLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    this.teamLobbyService.leaveLobby(data.team_id, user.id, this.server);
  }

  @SubscribeMessage('team:ready')
  handleTeamReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string; ready: boolean },
  ) {
    const user = (client as any).user;
    if (!user) return;

    this.teamLobbyService.setReady(data.team_id, user.id, data.ready, this.server);
  }

  @SubscribeMessage('team:start_find')
  handleTeamStartFind(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string; categories?: string[] },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const lobby = this.teamLobbyService.getLobby(data.team_id);
    if (!lobby) {
      client.emit('error', { message: 'Lobby not found' });
      return;
    }
    if (lobby.captainId !== user.id) {
      client.emit('error', { message: 'Only the captain can start matchmaking' });
      return;
    }
    if (!this.teamLobbyService.allReady(data.team_id)) {
      client.emit('error', { message: 'All members must be ready' });
      return;
    }

    this.teamMatchmakingService.addToQueue(lobby, data.categories || []);
  }

  @SubscribeMessage('team:cancel_find')
  handleTeamCancelFind(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    this.teamMatchmakingService.removeFromQueue(data.team_id);
  }

  @SubscribeMessage('team:challenge')
  handleTeamChallenge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { team_id: string; opponent_code: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const lobby = this.teamLobbyService.getLobby(data.team_id);
    if (!lobby) {
      client.emit('error', { message: 'Lobby not found' });
      return;
    }
    if (lobby.captainId !== user.id) {
      client.emit('error', { message: 'Only the captain can issue a challenge' });
      return;
    }
    if (!this.teamLobbyService.allReady(data.team_id)) {
      client.emit('error', { message: 'All members must be ready' });
      return;
    }

    this.teamMatchmakingService.challengeByCode(lobby, data.opponent_code);
  }

  // ---------- Challenge handlers ----------

  @SubscribeMessage('challenge:join_lobby')
  async handleChallengeJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challenge_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const dbUser = await this.gameService.getDbUser(user.id);
    if (!dbUser) return;

    let lobby = this.challengeLobbyService.getLobby(data.challenge_id);
    if (!lobby) {
      // Need to fetch challenge data — import inline to avoid circular deps
      // The gateway doesn't inject ChallengesService to keep deps minimal.
      // Instead, we only allow joining if the lobby has been created by accept flow.
      client.emit('error', { message: 'Challenge lobby not found. Accept the challenge first.' });
      return;
    }

    this.challengeLobbyService.joinLobby(
      data.challenge_id,
      { id: user.id, username: user.username, rating: dbUser.rating, universityId: dbUser.university_id },
      client,
      this.server,
    );
  }

  @SubscribeMessage('challenge:leave_lobby')
  handleChallengeLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challenge_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;
    this.challengeLobbyService.leaveLobby(data.challenge_id, user.id, this.server);
  }

  @SubscribeMessage('challenge:ready')
  handleChallengeReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challenge_id: string; ready: boolean },
  ) {
    const user = (client as any).user;
    if (!user) return;
    this.challengeLobbyService.setReady(data.challenge_id, user.id, data.ready, this.server);
  }

  @SubscribeMessage('challenge:start')
  async handleChallengeStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challenge_id: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const lobby = this.challengeLobbyService.getLobby(data.challenge_id);
    if (!lobby) {
      client.emit('error', { message: 'Challenge lobby not found' });
      return;
    }
    if (!this.challengeLobbyService.allReady(data.challenge_id)) {
      client.emit('error', { message: 'All players must be ready' });
      return;
    }

    // Notify lobby that the challenge is starting
    this.server.to(`challenge_lobby_${data.challenge_id}`).emit('challenge:starting', {
      challenge_id: data.challenge_id,
      countdown: 3,
    });

    // Create the game room
    const room = await this.gameService.createChallengeRoom(
      data.challenge_id,
      lobby.hostPlayers.map(p => ({
        userId: p.userId,
        username: p.username,
        rating: p.rating,
        universityId: p.universityId,
        socket: p.socket,
      })),
      lobby.guestPlayers.map(p => ({
        userId: p.userId,
        username: p.username,
        rating: p.rating,
        universityId: p.universityId,
        socket: p.socket,
      })),
      lobby.hostUniId,
      lobby.guestUniId,
      lobby.hostUniName,
      lobby.guestUniName,
      20, // default question count
    );

    this.server.to(`challenge_lobby_${data.challenge_id}`).emit('challenge:live', {
      challenge_id: data.challenge_id,
      match_id: room.id,
    });

    this.challengeLobbyService.removeLobby(data.challenge_id);
  }

  // ---------- Spectate handlers ----------

  @SubscribeMessage('spectate:join')
  handleSpectateJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { match_id: string },
  ) {
    const success = this.gameService.addSpectator(data.match_id, client);
    if (!success) {
      client.emit('error', { message: 'Match not found' });
    }
  }

  @SubscribeMessage('spectate:leave')
  handleSpectateLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { match_id: string },
  ) {
    this.gameService.removeSpectator(data.match_id, client);
  }
}
