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
import { TeamsService } from '../teams/teams.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
    private matchmakingService: MatchmakingService,
    private teamLobbyService: TeamLobbyService,
    private teamMatchmakingService: TeamMatchmakingService,
    private teamsService: TeamsService,
  ) {}

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

    this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
    this.matchmakingService.removeFromQueue(user.id);
    // Clean up team lobby if disconnected
    const lobby = this.teamLobbyService.getLobbyByUser(user.id);
    if (lobby) this.teamLobbyService.leaveLobby(lobby.teamId, user.id, this.server);
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
}
