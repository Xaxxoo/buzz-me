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
exports.LeaderboardsController = void 0;
const common_1 = require("@nestjs/common");
const leaderboards_service_1 = require("./leaderboards.service");
const leaderboard_query_dto_1 = require("./dto/leaderboard-query.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let LeaderboardsController = class LeaderboardsController {
    constructor(service) {
        this.service = service;
    }
    getPlayerBoard(dto) {
        return this.service.getPlayerBoard(dto);
    }
    getOwnRank(userId) {
        return this.service.getOwnRank(userId);
    }
    getUniversityBoard(dto) {
        return this.service.getUniversityBoard(dto);
    }
};
exports.LeaderboardsController = LeaderboardsController;
__decorate([
    (0, common_1.Get)('players'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [leaderboard_query_dto_1.LeaderboardQueryDto]),
    __metadata("design:returntype", void 0)
], LeaderboardsController.prototype, "getPlayerBoard", null);
__decorate([
    (0, common_1.Get)('players/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LeaderboardsController.prototype, "getOwnRank", null);
__decorate([
    (0, common_1.Get)('universities'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [leaderboard_query_dto_1.LeaderboardQueryDto]),
    __metadata("design:returntype", void 0)
], LeaderboardsController.prototype, "getUniversityBoard", null);
exports.LeaderboardsController = LeaderboardsController = __decorate([
    (0, common_1.Controller)('leaderboards'),
    __metadata("design:paramtypes", [leaderboards_service_1.LeaderboardsService])
], LeaderboardsController);
//# sourceMappingURL=leaderboards.controller.js.map