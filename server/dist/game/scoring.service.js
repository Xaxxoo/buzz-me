"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringService = void 0;
const common_1 = require("@nestjs/common");
const game_config_1 = require("../config/game.config");
let ScoringService = class ScoringService {
    tossUpPoints(early) {
        return early ? 15 : 10;
    }
    earlyPenalty() {
        return -5;
    }
    reboundPoints() {
        return 10;
    }
    bonusPoints() {
        return 10;
    }
    eloChange(playerRating, opponentRating, result) {
        const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
        return Math.round(game_config_1.ELO_K_FACTOR * (result - expected));
    }
    matchResult(scoreA, scoreB) {
        if (scoreA > scoreB)
            return 1;
        if (scoreA < scoreB)
            return 0;
        return 0.5;
    }
};
exports.ScoringService = ScoringService;
exports.ScoringService = ScoringService = __decorate([
    (0, common_1.Injectable)()
], ScoringService);
//# sourceMappingURL=scoring.service.js.map