"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const database_config_1 = require("./config/database.config");
const jwt_config_1 = require("./config/jwt.config");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const universities_module_1 = require("./universities/universities.module");
const categories_module_1 = require("./categories/categories.module");
const questions_module_1 = require("./questions/questions.module");
const matches_module_1 = require("./matches/matches.module");
const leaderboards_module_1 = require("./leaderboards/leaderboards.module");
const teams_module_1 = require("./teams/teams.module");
const game_module_1 = require("./game/game.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [database_config_1.default, jwt_config_1.default],
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('database.host'),
                    port: config.get('database.port'),
                    username: config.get('database.username'),
                    password: config.get('database.password'),
                    database: config.get('database.database'),
                    autoLoadEntities: true,
                    synchronize: true,
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            universities_module_1.UniversitiesModule,
            categories_module_1.CategoriesModule,
            questions_module_1.QuestionsModule,
            matches_module_1.MatchesModule,
            leaderboards_module_1.LeaderboardsModule,
            teams_module_1.TeamsModule,
            game_module_1.GameModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map