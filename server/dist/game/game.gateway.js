"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GameGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const game_service_1 = require("./game.service");
const matchmaking_service_1 = require("./matchmaking.service");
const ws_exception_filter_1 = require("../common/filters/ws-exception.filter");
let GameGateway = GameGateway_1 = class GameGateway {
    constructor(jwtService, gameService, matchmakingService) {
        this.jwtService = jwtService;
        this.gameService = gameService;
        this.matchmakingService = matchmakingService;
        this.logger = new common_1.Logger(GameGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake?.auth?.token;
            if (!token) {
                client.emit('error', { message: 'Missing auth token' });
                client.disconnect();
                return;
            }
            const payload = await this.jwtService.verifyAsync(token);
            client.user = { id: payload.sub, username: payload.username };
            this.logger.log(`Client connected: ${payload.username} (${client.id})`);
            const start = Date.now();
            client.emit('ping_measure', { t: start });
            client.once('pong_measure', (data) => {
                client.rtt = Date.now() - data.t;
            });
        }
        catch {
            client.emit('error', { message: 'Invalid auth token' });
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const user = client.user;
        if (!user)
            return;
        this.logger.log(`Client disconnected: ${user.username} (${client.id})`);
        this.matchmakingService.removeFromQueue(user.id);
        this.gameService.handleDisconnect(user.id);
    }
    async handleSoloMatch(client, data) {
        const user = client.user;
        if (!user)
            return;
        const room = await this.gameService.createSoloRoom(client, user);
        client.emit('match:found', {
            match_id: room.id,
            opponent: { id: 'bot', username: 'Bot', rating: 1000 },
            you_side: 'a',
        });
    }
    handleFindMatch(client, data) {
        const user = client.user;
        if (!user)
            return;
        this.matchmakingService.addToQueue(client, user, data?.categories || []);
    }
    handleCancelFind(client) {
        const user = client.user;
        if (!user)
            return;
        this.matchmakingService.removeFromQueue(user.id);
    }
    handleBuzz(client, data) {
        const user = client.user;
        if (!user)
            return;
        const room = this.gameService.getRoomByUser(user.id);
        if (!room)
            return;
        this.gameService.handleBuzz(room, user.id, data?.timestamp || Date.now());
    }
    handleAnswer(client, data) {
        const user = client.user;
        if (!user)
            return;
        const room = this.gameService.getRoomByUser(user.id);
        if (!room)
            return;
        const side = room.playerA.userId === user.id ? 'a' : 'b';
        if (room.phase === 'answering') {
            this.gameService.handleAnswer(room, side, data.option_index);
        }
        else if (room.phase === 'rebound') {
            this.gameService.handleRebound(room, side, data.option_index);
        }
        else if (room.phase === 'bonus') {
            this.gameService.handleBonus(room, side, data.option_index);
        }
    }
    handleReconnect(client, data) {
        const user = client.user;
        if (!user)
            return;
        const success = this.gameService.handleReconnect(client, user.id, data.match_id);
        if (!success) {
            client.emit('error', { message: 'Match not found or expired' });
        }
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:solo'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleSoloMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:find'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleFindMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:cancel_find'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleCancelFind", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:buzz'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleBuzz", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:answer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:reconnect'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleReconnect", null);
exports.GameGateway = GameGateway = GameGateway_1 = __decorate([
    (0, common_1.UseFilters)(new ws_exception_filter_1.WsExceptionFilter()),
    (0, websockets_1.WebSocketGateway)({ namespace: '/game', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        game_service_1.GameService,
        matchmaking_service_1.MatchmakingService])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map