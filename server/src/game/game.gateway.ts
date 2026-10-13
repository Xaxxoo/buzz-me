import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { isBot } from './types/game-room';

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

    const side = (room.playerA as any).userId === user.id ? 'a' : 'b';

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
}
