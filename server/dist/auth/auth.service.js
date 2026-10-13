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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const user_entity_1 = require("../entities/user.entity");
const device_session_entity_1 = require("../entities/device-session.entity");
const profanity_pipe_1 = require("../common/pipes/profanity.pipe");
let AuthService = class AuthService {
    constructor(usersRepo, sessionsRepo, jwtService) {
        this.usersRepo = usersRepo;
        this.sessionsRepo = sessionsRepo;
        this.jwtService = jwtService;
        this.profanity = new profanity_pipe_1.ProfanityPipe();
    }
    async signup(dto, deviceName) {
        this.profanity.transform(dto.username);
        const existing = await this.usersRepo.findOne({
            where: [
                { username_lower: dto.username.toLowerCase() },
                { email: dto.email.toLowerCase() },
            ],
        });
        if (existing) {
            if (existing.email === dto.email.toLowerCase()) {
                throw new common_1.ConflictException('Email already registered');
            }
            throw new common_1.ConflictException('Username already taken');
        }
        const user = this.usersRepo.create({
            username: dto.username,
            username_lower: dto.username.toLowerCase(),
            email: dto.email.toLowerCase(),
            password_hash: await bcrypt.hash(dto.password, 12),
        });
        await this.usersRepo.save(user);
        return this.createTokenPair(user, deviceName);
    }
    async login(dto, deviceName) {
        const user = await this.usersRepo.findOne({
            where: { email: dto.email.toLowerCase() },
        });
        if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        return this.createTokenPair(user, deviceName);
    }
    async refresh(refreshToken, userId) {
        const sessions = await this.sessionsRepo.find({ where: { user_id: userId } });
        let matched = null;
        for (const session of sessions) {
            if (await bcrypt.compare(refreshToken, session.refresh_token_hash)) {
                matched = session;
                break;
            }
        }
        if (!matched) {
            await this.sessionsRepo.delete({ user_id: userId });
            throw new common_1.UnauthorizedException('Refresh token invalid. All sessions revoked.');
        }
        const user = await this.usersRepo.findOneBy({ id: userId });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const newRefreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        matched.refresh_token_hash = await bcrypt.hash(newRefreshToken, 10);
        await this.sessionsRepo.save(matched);
        const accessToken = this.issueAccessToken(user);
        return { access_token: accessToken, refresh_token: newRefreshToken };
    }
    async logout(userId, sessionId) {
        if (sessionId) {
            await this.sessionsRepo.delete({ id: sessionId, user_id: userId });
        }
        else {
            await this.sessionsRepo.delete({ user_id: userId });
        }
    }
    async getSessions(userId) {
        return this.sessionsRepo.find({
            where: { user_id: userId },
            select: ['id', 'device_name', 'last_seen', 'created_at'],
            order: { last_seen: 'DESC' },
        });
    }
    async deleteSession(userId, sessionId) {
        const result = await this.sessionsRepo.delete({ id: sessionId, user_id: userId });
        if (!result.affected)
            throw new common_1.BadRequestException('Session not found');
    }
    issueAccessToken(user) {
        return this.jwtService.sign({
            sub: user.id,
            username: user.username,
        });
    }
    async createTokenPair(user, deviceName) {
        const accessToken = this.issueAccessToken(user);
        const refreshToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const session = this.sessionsRepo.create({
            user_id: user.id,
            refresh_token_hash: await bcrypt.hash(refreshToken, 10),
            device_name: deviceName || 'Unknown device',
        });
        await this.sessionsRepo.save(session);
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(device_session_entity_1.DeviceSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map