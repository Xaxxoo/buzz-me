"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const leaderboards_controller_1 = require("./leaderboards.controller");
const leaderboards_service_1 = require("./leaderboards.service");
const user_entity_1 = require("../entities/user.entity");
const university_entity_1 = require("../entities/university.entity");
const leaderboard_entry_entity_1 = require("../entities/leaderboard-entry.entity");
let LeaderboardsModule = class LeaderboardsModule {
};
exports.LeaderboardsModule = LeaderboardsModule;
exports.LeaderboardsModule = LeaderboardsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, university_entity_1.University, leaderboard_entry_entity_1.LeaderboardEntry])],
        controllers: [leaderboards_controller_1.LeaderboardsController],
        providers: [leaderboards_service_1.LeaderboardsService],
        exports: [leaderboards_service_1.LeaderboardsService],
    })
], LeaderboardsModule);
//# sourceMappingURL=leaderboards.module.js.map