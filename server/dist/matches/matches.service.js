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
exports.MatchesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const match_entity_1 = require("../entities/match.entity");
const match_participant_entity_1 = require("../entities/match-participant.entity");
let MatchesService = class MatchesService {
    constructor(matchRepo, participantRepo) {
        this.matchRepo = matchRepo;
        this.participantRepo = participantRepo;
    }
    async getHistory(userId, page = 1, limit = 20) {
        const qb = this.matchRepo
            .createQueryBuilder('m')
            .innerJoin('m.participants', 'mp', 'mp.user_id = :userId', { userId })
            .leftJoinAndSelect('m.participants', 'p')
            .leftJoinAndSelect('p.user', 'u')
            .where('m.status = :status', { status: 'completed' })
            .orderBy('m.ended_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit };
    }
    async getDetail(matchId) {
        const match = await this.matchRepo.findOne({
            where: { id: matchId },
            relations: ['participants', 'participants.user', 'rounds', 'rounds.question'],
        });
        if (!match)
            throw new common_1.NotFoundException('Match not found');
        return match;
    }
};
exports.MatchesService = MatchesService;
exports.MatchesService = MatchesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(match_entity_1.Match)),
    __param(1, (0, typeorm_1.InjectRepository)(match_participant_entity_1.MatchParticipant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], MatchesService);
//# sourceMappingURL=matches.service.js.map