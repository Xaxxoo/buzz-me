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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchParticipant = void 0;
const typeorm_1 = require("typeorm");
const match_entity_1 = require("./match.entity");
const user_entity_1 = require("./user.entity");
let MatchParticipant = class MatchParticipant {
};
exports.MatchParticipant = MatchParticipant;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], MatchParticipant.prototype, "match_id", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], MatchParticipant.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => match_entity_1.Match, (m) => m.participants, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'match_id' }),
    __metadata("design:type", match_entity_1.Match)
], MatchParticipant.prototype, "match", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], MatchParticipant.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 1, nullable: true }),
    __metadata("design:type", Object)
], MatchParticipant.prototype, "team_side", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], MatchParticipant.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MatchParticipant.prototype, "rating_before", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], MatchParticipant.prototype, "rating_after", void 0);
exports.MatchParticipant = MatchParticipant = __decorate([
    (0, typeorm_1.Entity)('match_participants')
], MatchParticipant);
//# sourceMappingURL=match-participant.entity.js.map