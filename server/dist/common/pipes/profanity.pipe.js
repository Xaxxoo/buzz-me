"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfanityPipe = void 0;
const common_1 = require("@nestjs/common");
const BLOCKED = new Set([
    'admin', 'moderator', 'mod', 'system', 'support', 'help', 'root',
    'fuck', 'shit', 'ass', 'damn', 'bitch', 'dick', 'pussy', 'cock',
    'nigger', 'nigga', 'faggot', 'retard',
]);
let ProfanityPipe = class ProfanityPipe {
    transform(value) {
        if (typeof value !== 'string')
            return value;
        const lower = value.toLowerCase();
        for (const word of BLOCKED) {
            if (lower.includes(word)) {
                throw new common_1.BadRequestException('Username contains inappropriate content');
            }
        }
        return value;
    }
};
exports.ProfanityPipe = ProfanityPipe;
exports.ProfanityPipe = ProfanityPipe = __decorate([
    (0, common_1.Injectable)()
], ProfanityPipe);
//# sourceMappingURL=profanity.pipe.js.map