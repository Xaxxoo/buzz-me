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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const university_entity_1 = require("../entities/university.entity");
const profanity_pipe_1 = require("../common/pipes/profanity.pipe");
let UsersService = class UsersService {
    constructor(usersRepo, universityRepo) {
        this.usersRepo = usersRepo;
        this.universityRepo = universityRepo;
        this.profanity = new profanity_pipe_1.ProfanityPipe();
    }
    async getProfile(userId) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            relations: ['university'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const { password_hash, ...profile } = user;
        return profile;
    }
    async getPublicProfile(userId) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'username', 'rating', 'matches_played', 'matches_won', 'matches_lost', 'matches_drawn', 'university_id'],
            relations: ['university'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateProfile(userId, dto) {
        const user = await this.usersRepo.findOneBy({ id: userId });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.username) {
            this.profanity.transform(dto.username);
            const existing = await this.usersRepo.findOneBy({
                username_lower: dto.username.toLowerCase(),
            });
            if (existing && existing.id !== userId) {
                throw new common_1.ConflictException('Username already taken');
            }
            user.username = dto.username;
            user.username_lower = dto.username.toLowerCase();
        }
        await this.usersRepo.save(user);
        const { password_hash, ...profile } = user;
        return profile;
    }
    async getSaveData(userId) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'save_data', 'rating', 'matches_played', 'matches_won', 'matches_lost', 'matches_drawn', 'category_stats'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user.save_data || {
            school: null,
            rating: user.rating,
            played: user.matches_played,
            won: user.matches_won,
            lost: user.matches_lost,
            drawn: user.matches_drawn,
            cats: user.category_stats || {},
            daily: null,
            bestDaily: null,
            streak: { n: 0, last: null, best: 0, freeze: null },
        };
    }
    async updateSaveData(userId, saveData) {
        const user = await this.usersRepo.findOneBy({ id: userId });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        user.save_data = saveData;
        if (typeof saveData.rating === 'number')
            user.rating = saveData.rating;
        if (typeof saveData.played === 'number')
            user.matches_played = saveData.played;
        if (typeof saveData.won === 'number')
            user.matches_won = saveData.won;
        if (typeof saveData.lost === 'number')
            user.matches_lost = saveData.lost;
        if (typeof saveData.drawn === 'number')
            user.matches_drawn = saveData.drawn;
        if (saveData.cats && typeof saveData.cats === 'object')
            user.category_stats = saveData.cats;
        await this.usersRepo.save(user);
        return saveData;
    }
    async linkUniversity(userId, universityId) {
        const user = await this.usersRepo.findOneBy({ id: userId });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const university = await this.universityRepo.findOneBy({ id: universityId });
        if (!university)
            throw new common_1.NotFoundException('University not found');
        user.university_id = universityId;
        user.university_verified = false;
        await this.usersRepo.save(user);
        return { university_id: universityId, university_verified: false };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(university_entity_1.University)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map