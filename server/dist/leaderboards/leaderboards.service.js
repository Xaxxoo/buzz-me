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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const university_entity_1 = require("../entities/university.entity");
let LeaderboardsService = class LeaderboardsService {
    constructor(userRepo, universityRepo) {
        this.userRepo = userRepo;
        this.universityRepo = universityRepo;
        this.playerCache = null;
        this.universityCache = null;
        this.CACHE_TTL = 60_000;
    }
    async getPlayerBoard(dto) {
        const { page = 1, limit = 20, university_id } = dto;
        const qb = this.userRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.username', 'u.rating', 'u.matches_played', 'u.matches_won', 'u.university_id'])
            .where('u.matches_played >= :min', { min: 5 })
            .orderBy('u.rating', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (university_id) {
            qb.andWhere('u.university_id = :university_id', { university_id });
        }
        const [items, total] = await qb.getManyAndCount();
        return {
            items: items.map((u, i) => ({
                rank: (page - 1) * limit + i + 1,
                id: u.id,
                username: u.username,
                rating: u.rating,
                matches_played: u.matches_played,
                matches_won: u.matches_won,
            })),
            total,
            page,
            limit,
        };
    }
    async getOwnRank(userId) {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user || user.matches_played < 5) {
            return { rank: null, rating: user?.rating ?? 1000, matches_played: user?.matches_played ?? 0 };
        }
        const rank = await this.userRepo
            .createQueryBuilder('u')
            .where('u.matches_played >= :min', { min: 5 })
            .andWhere('u.rating > :rating', { rating: user.rating })
            .getCount();
        return { rank: rank + 1, rating: user.rating, matches_played: user.matches_played };
    }
    async getUniversityBoard(dto) {
        const { page = 1, limit = 20 } = dto;
        const qb = this.universityRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.name', 'u.short_name', 'u.country', 'u.points', 'u.color_a', 'u.color_b', 'u.pattern'])
            .orderBy('u.points', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [items, total] = await qb.getManyAndCount();
        return {
            items: items.map((u, i) => ({
                rank: (page - 1) * limit + i + 1,
                ...u,
            })),
            total,
            page,
            limit,
        };
    }
    invalidateCache() {
        this.playerCache = null;
        this.universityCache = null;
    }
};
exports.LeaderboardsService = LeaderboardsService;
exports.LeaderboardsService = LeaderboardsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(university_entity_1.University)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LeaderboardsService);
//# sourceMappingURL=leaderboards.service.js.map