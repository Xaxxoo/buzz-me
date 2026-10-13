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
exports.Challenge = void 0;
const typeorm_1 = require("typeorm");
const university_entity_1 = require("./university.entity");
const user_entity_1 = require("./user.entity");
let Challenge = class Challenge {
};
exports.Challenge = Challenge;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Challenge.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], Challenge.prototype, "host_university_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => university_entity_1.University, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'host_university_id' }),
    __metadata("design:type", university_entity_1.University)
], Challenge.prototype, "host_university", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Challenge.prototype, "guest_university_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => university_entity_1.University, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'guest_university_id' }),
    __metadata("design:type", university_entity_1.University)
], Challenge.prototype, "guest_university", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], Challenge.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], Challenge.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Challenge.prototype, "start_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Challenge.prototype, "categories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 8 }),
    __metadata("design:type", Number)
], Challenge.prototype, "question_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], Challenge.prototype, "team_size", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'open' }),
    __metadata("design:type", String)
], Challenge.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 12 }),
    __metadata("design:type", String)
], Challenge.prototype, "share_code", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Challenge.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Challenge.prototype, "updated_at", void 0);
exports.Challenge = Challenge = __decorate([
    (0, typeorm_1.Entity)('challenges')
], Challenge);
//# sourceMappingURL=challenge.entity.js.map