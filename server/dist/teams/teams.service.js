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
exports.TeamsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const team_entity_1 = require("../entities/team.entity");
const team_member_entity_1 = require("../entities/team-member.entity");
let TeamsService = class TeamsService {
    constructor(teamRepo, memberRepo) {
        this.teamRepo = teamRepo;
        this.memberRepo = memberRepo;
    }
    async create(userId, dto) {
        const inviteCode = (0, crypto_1.randomBytes)(6).toString('hex').slice(0, 12).toUpperCase();
        const team = this.teamRepo.create({
            name: dto.name,
            captain_id: userId,
            university_id: dto.university_id || null,
            invite_code: inviteCode,
        });
        await this.teamRepo.save(team);
        const member = this.memberRepo.create({
            team_id: team.id,
            user_id: userId,
            role: 'captain',
        });
        await this.memberRepo.save(member);
        return team;
    }
    async findOne(teamId) {
        const team = await this.teamRepo.findOne({
            where: { id: teamId },
            relations: ['members', 'members.user', 'university', 'captain'],
        });
        if (!team)
            throw new common_1.NotFoundException('Team not found');
        return team;
    }
    async joinByInvite(userId, inviteCode) {
        const team = await this.teamRepo.findOne({
            where: { invite_code: inviteCode.toUpperCase() },
            relations: ['members'],
        });
        if (!team)
            throw new common_1.NotFoundException('Invalid invite code');
        const existing = team.members?.find((m) => m.user_id === userId);
        if (existing)
            throw new common_1.ConflictException('Already a member');
        const member = this.memberRepo.create({
            team_id: team.id,
            user_id: userId,
            role: 'member',
        });
        await this.memberRepo.save(member);
        return this.findOne(team.id);
    }
    async removeMember(teamId, memberId, requesterId) {
        const team = await this.teamRepo.findOneBy({ id: teamId });
        if (!team)
            throw new common_1.NotFoundException('Team not found');
        if (team.captain_id !== requesterId && memberId !== requesterId) {
            throw new common_1.ForbiddenException('Only captain can remove members');
        }
        const result = await this.memberRepo.delete({ team_id: teamId, user_id: memberId });
        if (!result.affected)
            throw new common_1.NotFoundException('Member not found');
        return { removed: true };
    }
};
exports.TeamsService = TeamsService;
exports.TeamsService = TeamsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(team_entity_1.Team)),
    __param(1, (0, typeorm_1.InjectRepository)(team_member_entity_1.TeamMember)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], TeamsService);
//# sourceMappingURL=teams.service.js.map