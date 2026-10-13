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
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const game_service_1 = require("./game.service");
const game_config_1 = require("../config/game.config");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    constructor(gameService) {
        this.gameService = gameService;
        this.logger = new common_1.Logger(MatchmakingService_1.name);
        this.queue = [];
        this.tickInterval = null;
        this.tickInterval = setInterval(() => this.tick(), game_config_1.MATCHMAKING_TICK_MS);
    }
    onModuleDestroy() {
        if (this.tickInterval)
            clearInterval(this.tickInterval);
    }
    addToQueue(socket, user, categories = []) {
        this.removeFromQueue(user.id);
        const entry = {
            userId: user.id,
            username: user.username,
            rating: user.rating || 1000,
            universityId: user.universityId || null,
            categories,
            socket,
            joinedAt: Date.now(),
            notifiedTimeout: false,
        };
        this.queue.push(entry);
        this.logger.log(`${user.username} joined queue (${this.queue.length} in queue)`);
        socket.emit('matchmaking:status', { position: this.queue.length, elapsed_ms: 0 });
    }
    removeFromQueue(userId) {
        this.queue = this.queue.filter((e) => e.userId !== userId);
    }
    tick() {
        if (this.queue.length < 2) {
            const now = Date.now();
            for (const entry of this.queue) {
                const elapsed = now - entry.joinedAt;
                if (elapsed >= game_config_1.MATCHMAKING_TIMEOUT_MS && !entry.notifiedTimeout) {
                    entry.notifiedTimeout = true;
                    entry.socket.emit('matchmaking:timeout', { offer_bot: true });
                }
                entry.socket.emit('matchmaking:status', {
                    position: 1,
                    elapsed_ms: elapsed,
                });
            }
            return;
        }
        const now = Date.now();
        const matched = new Set();
        const sorted = [...this.queue].sort((a, b) => a.joinedAt - b.joinedAt);
        for (let i = 0; i < sorted.length; i++) {
            if (matched.has(sorted[i].userId))
                continue;
            const a = sorted[i];
            let bestMatch = null;
            let bestScore = -1;
            for (let j = i + 1; j < sorted.length; j++) {
                if (matched.has(sorted[j].userId))
                    continue;
                const b = sorted[j];
                const elapsed = Math.max(now - a.joinedAt, now - b.joinedAt);
                const ratingExpansion = Math.floor(elapsed / 5000) * 50;
                const maxRange = game_config_1.RATING_RANGE_INITIAL + ratingExpansion;
                const ratingDiff = Math.abs(a.rating - b.rating);
                if (ratingDiff > maxRange)
                    continue;
                let score = 100;
                if (a.universityId && b.universityId && a.universityId !== b.universityId)
                    score += 20;
                score -= ratingDiff / 10;
                if (a.categories.length && b.categories.length) {
                    const overlap = a.categories.filter((c) => b.categories.includes(c)).length;
                    score += overlap * 5;
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = b;
                }
            }
            if (bestMatch) {
                matched.add(a.userId);
                matched.add(bestMatch.userId);
                this.logger.log(`Matched ${a.username} vs ${bestMatch.username}`);
                this.gameService.createQuickRoom(a.socket, { id: a.userId, username: a.username }, bestMatch.socket, { id: bestMatch.userId, username: bestMatch.username }).catch((err) => this.logger.error('Failed to create room', err));
            }
        }
        this.queue = this.queue.filter((e) => !matched.has(e.userId));
        for (let i = 0; i < this.queue.length; i++) {
            const entry = this.queue[i];
            const elapsed = now - entry.joinedAt;
            entry.socket.emit('matchmaking:status', {
                position: i + 1,
                elapsed_ms: elapsed,
            });
            if (elapsed >= game_config_1.MATCHMAKING_TIMEOUT_MS && !entry.notifiedTimeout) {
                entry.notifiedTimeout = true;
                entry.socket.emit('matchmaking:timeout', { offer_bot: true });
            }
        }
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_service_1.GameService])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map