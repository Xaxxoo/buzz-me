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
var GameService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const game_room_1 = require("./types/game-room");
const scoring_service_1 = require("./scoring.service");
const questions_service_1 = require("../questions/questions.service");
const user_entity_1 = require("../entities/user.entity");
const match_entity_1 = require("../entities/match.entity");
const match_participant_entity_1 = require("../entities/match-participant.entity");
const round_entity_1 = require("../entities/round.entity");
const game_config_1 = require("../config/game.config");
let GameService = GameService_1 = class GameService {
    constructor(scoring, questionsService, userRepo, matchRepo, participantRepo, roundRepo) {
        this.scoring = scoring;
        this.questionsService = questionsService;
        this.userRepo = userRepo;
        this.matchRepo = matchRepo;
        this.participantRepo = participantRepo;
        this.roundRepo = roundRepo;
        this.logger = new common_1.Logger(GameService_1.name);
        this.rooms = new Map();
        this.userRooms = new Map();
        this.timers = new Map();
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getRoomByUser(userId) {
        const roomId = this.userRooms.get(userId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }
    async createSoloRoom(socket, user) {
        const dbUser = await this.userRepo.findOneBy({ id: user.id });
        const questions = await this.questionsService.getRandomSet(game_config_1.ROUNDS);
        const roomId = `solo_${user.id}_${Date.now()}`;
        const roomQuestions = questions.map((q) => ({
            id: q.id,
            categoryId: q.category_id,
            categoryName: q.category?.name || '',
            text: q.text,
            words: q.text.split(' '),
            options: q.options,
            correctIndex: q.correct_option_index,
            bonusText: q.bonus_text,
            bonusOptions: q.bonus_options,
        }));
        const room = {
            id: roomId,
            type: 'solo',
            ranked: true,
            playerA: {
                userId: user.id,
                username: user.username,
                rating: dbUser?.rating || 1000,
                universityId: dbUser?.university_id || null,
                socket,
                score: 0,
                side: 'a',
                connected: true,
                disconnectedAt: null,
                rtt: 0,
            },
            playerB: {
                isBot: true,
                username: 'Bot',
                rating: 1000,
                score: 0,
                side: 'b',
                difficulty: 'medium',
            },
            questions: roomQuestions,
            currentRound: 0,
            phase: 'countdown',
            epoch: 0,
            buzzedSide: null,
            buzzedEarly: false,
            wordIndex: 0,
            answeredCorrectly: null,
            answeredOption: null,
            createdAt: Date.now(),
        };
        this.rooms.set(roomId, room);
        this.userRooms.set(user.id, roomId);
        this.timers.set(roomId, new Map());
        socket.join(roomId);
        this.startCountdown(room);
        return room;
    }
    async createQuickRoom(socketA, userA, socketB, userB) {
        const [dbA, dbB] = await Promise.all([
            this.userRepo.findOneBy({ id: userA.id }),
            this.userRepo.findOneBy({ id: userB.id }),
        ]);
        const questions = await this.questionsService.getRandomSet(game_config_1.ROUNDS);
        const roomId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const roomQuestions = questions.map((q) => ({
            id: q.id,
            categoryId: q.category_id,
            categoryName: q.category?.name || '',
            text: q.text,
            words: q.text.split(' '),
            options: q.options,
            correctIndex: q.correct_option_index,
            bonusText: q.bonus_text,
            bonusOptions: q.bonus_options,
        }));
        const room = {
            id: roomId,
            type: 'quick',
            ranked: true,
            playerA: {
                userId: userA.id,
                username: userA.username,
                rating: dbA?.rating || 1000,
                universityId: dbA?.university_id || null,
                socket: socketA,
                score: 0,
                side: 'a',
                connected: true,
                disconnectedAt: null,
                rtt: 0,
            },
            playerB: {
                userId: userB.id,
                username: userB.username,
                rating: dbB?.rating || 1000,
                universityId: dbB?.university_id || null,
                socket: socketB,
                score: 0,
                side: 'b',
                connected: true,
                disconnectedAt: null,
                rtt: 0,
            },
            questions: roomQuestions,
            currentRound: 0,
            phase: 'countdown',
            epoch: 0,
            buzzedSide: null,
            buzzedEarly: false,
            wordIndex: 0,
            answeredCorrectly: null,
            answeredOption: null,
            createdAt: Date.now(),
        };
        this.rooms.set(roomId, room);
        this.userRooms.set(userA.id, roomId);
        this.userRooms.set(userB.id, roomId);
        this.timers.set(roomId, new Map());
        socketA.join(roomId);
        socketB.join(roomId);
        const opponentInfoForA = { id: userB.id, username: userB.username, rating: dbB?.rating || 1000 };
        const opponentInfoForB = { id: userA.id, username: userA.username, rating: dbA?.rating || 1000 };
        socketA.emit('match:found', { match_id: roomId, opponent: opponentInfoForA, you_side: 'a' });
        socketB.emit('match:found', { match_id: roomId, opponent: opponentInfoForB, you_side: 'b' });
        this.startCountdown(room);
        return room;
    }
    scheduleTimer(room, fn, ms) {
        const epoch = room.epoch;
        const timer = setTimeout(() => {
            if (room.epoch === epoch)
                fn();
        }, ms);
        this.timers.get(room.id)?.set(epoch, timer);
    }
    bumpEpoch(room) {
        room.epoch++;
    }
    emitToRoom(room, event, data) {
        const a = room.playerA;
        if (a.socket && a.connected)
            a.socket.emit(event, data);
        if (!(0, game_room_1.isBot)(room.playerB)) {
            const b = room.playerB;
            if (b.socket && b.connected)
                b.socket.emit(event, data);
        }
    }
    emitToSide(room, side, event, data) {
        const player = side === 'a' ? room.playerA : room.playerB;
        if ((0, game_room_1.isBot)(player))
            return;
        if (player.socket && player.connected)
            player.socket.emit(event, data);
    }
    startCountdown(room) {
        room.phase = 'countdown';
        this.emitToRoom(room, 'match:countdown', { seconds: 3 });
        this.scheduleTimer(room, () => this.nextRound(room), 3000);
    }
    nextRound(room) {
        this.bumpEpoch(room);
        if (room.currentRound >= room.questions.length) {
            return this.finishMatch(room);
        }
        const q = room.questions[room.currentRound];
        room.phase = 'reading';
        room.buzzedSide = null;
        room.buzzedEarly = false;
        room.wordIndex = 0;
        room.answeredCorrectly = null;
        room.answeredOption = null;
        this.emitToRoom(room, 'match:question', {
            round: room.currentRound + 1,
            total: room.questions.length,
            category: q.categoryName,
        });
        this.scheduleTimer(room, () => this.readNextWord(room), 800);
        if ((0, game_room_1.isBot)(room.playerB)) {
            this.planBotBuzz(room);
        }
    }
    readNextWord(room) {
        const q = room.questions[room.currentRound];
        if (room.wordIndex >= q.words.length) {
            return this.openBuzzWindow(room);
        }
        const word = q.words[room.wordIndex];
        this.emitToRoom(room, 'match:word', {
            word,
            index: room.wordIndex,
            total: q.words.length,
        });
        room.wordIndex++;
        if ((0, game_room_1.isBot)(room.playerB) && room.phase === 'reading') {
            const botPlan = room._botBuzzAt;
            if (botPlan !== undefined && room.wordIndex >= botPlan) {
                this.scheduleTimer(room, () => this.botBuzz(room), 200);
                return;
            }
        }
        if (room.wordIndex >= q.words.length) {
            this.scheduleTimer(room, () => this.openBuzzWindow(room), game_config_1.WORD_BASE_DELAY_MS + word.length * game_config_1.WORD_CHAR_DELAY_MS);
        }
        else {
            const delay = game_config_1.WORD_BASE_DELAY_MS + word.length * game_config_1.WORD_CHAR_DELAY_MS + (/[,.]$/.test(word) ? game_config_1.PUNCTUATION_PAUSE_MS : 0);
            this.scheduleTimer(room, () => this.readNextWord(room), delay);
        }
    }
    openBuzzWindow(room) {
        room.phase = 'buzz_open';
        this.emitToRoom(room, 'match:buzz_open', { duration_ms: game_config_1.BUZZ_WINDOW_MS });
        if ((0, game_room_1.isBot)(room.playerB) && room._botLateBuzz) {
            this.scheduleTimer(room, () => this.botBuzz(room), room._botLateBuzz);
        }
        this.scheduleTimer(room, () => {
            this.bumpEpoch(room);
            this.emitToRoom(room, 'match:round_end', {
                round: room.currentRound + 1,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
                took: 'none',
            });
            room.currentRound++;
            this.scheduleTimer(room, () => this.nextRound(room), 2000);
        }, game_config_1.BUZZ_WINDOW_MS);
    }
    handleBuzz(room, userId, timestamp) {
        if (room.phase !== 'reading' && room.phase !== 'buzz_open')
            return;
        if (room.buzzedSide)
            return;
        const player = room.playerA;
        const side = player.userId === userId ? 'a' : 'b';
        const buzzTime = Date.now() - room.createdAt;
        if (buzzTime < game_config_1.MIN_BUZZ_TIME_MS) {
            this.logger.warn(`Suspicious buzz from ${userId}: ${buzzTime}ms`);
        }
        this.bumpEpoch(room);
        room.buzzedSide = side;
        room.buzzedEarly = room.phase === 'reading';
        room.phase = 'answering';
        const buzzer = side === 'a' ? room.playerA : room.playerB;
        const username = (0, game_room_1.isBot)(buzzer) ? buzzer.username : buzzer.username;
        this.emitToRoom(room, 'match:buzzed', { side, username });
        const q = room.questions[room.currentRound];
        const shuffled = this.shuffleOptions(q.options);
        this.scheduleTimer(room, () => {
            this.emitToSide(room, side, 'match:ask', {
                options: shuffled,
                seconds: game_config_1.ANSWER_WINDOW_S,
            });
            this.scheduleTimer(room, () => {
                this.handleAnswer(room, side, -1);
            }, game_config_1.ANSWER_WINDOW_S * 1000);
        }, 700);
    }
    handleAnswer(room, side, optionIndex) {
        if (room.phase !== 'answering')
            return;
        this.bumpEpoch(room);
        const q = room.questions[room.currentRound];
        const correct = optionIndex >= 0 && optionIndex === 0;
        const correctAnswer = q.options[q.correctIndex];
        const answeredText = optionIndex >= 0 ? room._currentShuffled?.[optionIndex] : null;
        const isCorrect = answeredText === correctAnswer;
        room.answeredCorrectly = isCorrect;
        if (isCorrect) {
            const pts = this.scoring.tossUpPoints(room.buzzedEarly);
            if (side === 'a')
                room.playerA.score += pts;
            else
                room.playerB.score += pts;
            this.emitToRoom(room, 'match:answer_result', {
                correct: true,
                correct_answer: correctAnswer,
                points: pts,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            this.scheduleTimer(room, () => this.startBonus(room, side), 1500);
        }
        else {
            const penalty = room.buzzedEarly ? this.scoring.earlyPenalty() : 0;
            if (penalty) {
                if (side === 'a')
                    room.playerA.score += penalty;
                else
                    room.playerB.score += penalty;
            }
            this.emitToRoom(room, 'match:answer_result', {
                correct: false,
                correct_answer: optionIndex < 0 ? null : correctAnswer,
                points: penalty,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            const otherSide = side === 'a' ? 'b' : 'a';
            this.scheduleTimer(room, () => this.startRebound(room, otherSide, answeredText), 1300);
        }
    }
    startRebound(room, side, struckOption) {
        room.phase = 'rebound';
        if ((0, game_room_1.isBot)(room.playerB) && side === 'b') {
            this.scheduleTimer(room, () => this.botRebound(room), 1600);
            return;
        }
        const q = room.questions[room.currentRound];
        const shuffled = this.shuffleOptions(q.options);
        this.emitToSide(room, side, 'match:rebound', {
            options: shuffled,
            seconds: game_config_1.ANSWER_WINDOW_S,
            struck: struckOption || '',
        });
        this.scheduleTimer(room, () => {
            this.handleRebound(room, side, -1);
        }, game_config_1.ANSWER_WINDOW_S * 1000);
    }
    handleRebound(room, side, optionIndex) {
        if (room.phase !== 'rebound')
            return;
        this.bumpEpoch(room);
        const q = room.questions[room.currentRound];
        const correctAnswer = q.options[q.correctIndex];
        const answeredText = optionIndex >= 0 ? room._currentShuffled?.[optionIndex] : null;
        const isCorrect = answeredText === correctAnswer;
        if (isCorrect) {
            const pts = this.scoring.reboundPoints();
            if (side === 'a')
                room.playerA.score += pts;
            else
                room.playerB.score += pts;
            this.emitToRoom(room, 'match:answer_result', {
                correct: true,
                correct_answer: correctAnswer,
                points: pts,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            this.scheduleTimer(room, () => this.startBonus(room, side), 1500);
        }
        else {
            this.emitToRoom(room, 'match:answer_result', {
                correct: false,
                correct_answer: correctAnswer,
                points: 0,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            this.emitToRoom(room, 'match:round_end', {
                round: room.currentRound + 1,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
                took: 'none',
            });
            room.currentRound++;
            this.scheduleTimer(room, () => this.nextRound(room), 2000);
        }
    }
    startBonus(room, forSide) {
        room.phase = 'bonus';
        const q = room.questions[room.currentRound];
        if (!q.bonusText || !q.bonusOptions) {
            this.endRound(room, forSide);
            return;
        }
        const shuffled = this.shuffleOptions(q.bonusOptions);
        if ((0, game_room_1.isBot)(room.playerB) && forSide === 'b') {
            this.emitToRoom(room, 'match:bonus', {
                text: q.bonusText,
                options: shuffled,
                seconds: game_config_1.BONUS_WINDOW_S,
                for_side: forSide,
            });
            this.scheduleTimer(room, () => this.botBonus(room), 2000);
            return;
        }
        this.emitToRoom(room, 'match:bonus', {
            text: q.bonusText,
            options: shuffled,
            seconds: game_config_1.BONUS_WINDOW_S,
            for_side: forSide,
        });
        this.scheduleTimer(room, () => {
            this.handleBonus(room, forSide, -1);
        }, game_config_1.BONUS_WINDOW_S * 1000);
    }
    handleBonus(room, side, optionIndex) {
        if (room.phase !== 'bonus')
            return;
        this.bumpEpoch(room);
        const q = room.questions[room.currentRound];
        const correctAnswer = q.bonusOptions?.[0] || '';
        const answeredText = optionIndex >= 0 ? room._currentShuffled?.[optionIndex] : null;
        const isCorrect = answeredText === correctAnswer;
        if (isCorrect) {
            const pts = this.scoring.bonusPoints();
            if (side === 'a')
                room.playerA.score += pts;
            else
                room.playerB.score += pts;
        }
        this.emitToRoom(room, 'match:bonus_result', {
            correct: isCorrect,
            correct_answer: correctAnswer,
            points: isCorrect ? 10 : 0,
            score_a: room.playerA.score,
            score_b: room.playerB.score,
        });
        this.scheduleTimer(room, () => this.endRound(room, side), 1800);
    }
    endRound(room, tookSide) {
        this.emitToRoom(room, 'match:round_end', {
            round: room.currentRound + 1,
            score_a: room.playerA.score,
            score_b: room.playerB.score,
            took: tookSide,
        });
        room.currentRound++;
        this.scheduleTimer(room, () => this.nextRound(room), 2000);
    }
    async finishMatch(room) {
        room.phase = 'finished';
        this.bumpEpoch(room);
        const scoreA = room.playerA.score;
        const scoreB = room.playerB.score;
        const playerA = room.playerA;
        const opponentRating = (0, game_room_1.isBot)(room.playerB) ? 1000 : room.playerB.rating;
        const resultA = this.scoring.matchResult(scoreA, scoreB);
        const deltaA = this.scoring.eloChange(playerA.rating, opponentRating, resultA);
        const newRatingA = playerA.rating + deltaA;
        await this.userRepo.update(playerA.userId, {
            rating: newRatingA,
            matches_played: () => 'matches_played + 1',
            matches_won: () => resultA === 1 ? 'matches_won + 1' : 'matches_won',
            matches_lost: () => resultA === 0 ? 'matches_lost + 1' : 'matches_lost',
            matches_drawn: () => resultA === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
        });
        const endDataA = {
            match_id: room.id,
            score_a: scoreA,
            score_b: scoreB,
            rating_before: playerA.rating,
            rating_after: newRatingA,
            rating_delta: deltaA,
            opponent_rating_before: opponentRating,
            rounds_won: 0,
            total_rounds: room.questions.length,
        };
        this.emitToSide(room, 'a', 'match:end', endDataA);
        if (!(0, game_room_1.isBot)(room.playerB)) {
            const playerB = room.playerB;
            const resultB = this.scoring.matchResult(scoreB, scoreA);
            const deltaB = this.scoring.eloChange(playerB.rating, playerA.rating, resultB);
            const newRatingB = playerB.rating + deltaB;
            await this.userRepo.update(playerB.userId, {
                rating: newRatingB,
                matches_played: () => 'matches_played + 1',
                matches_won: () => resultB === 1 ? 'matches_won + 1' : 'matches_won',
                matches_lost: () => resultB === 0 ? 'matches_lost + 1' : 'matches_lost',
                matches_drawn: () => resultB === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
            });
            const endDataB = {
                match_id: room.id,
                score_a: scoreA,
                score_b: scoreB,
                rating_before: playerB.rating,
                rating_after: newRatingB,
                rating_delta: deltaB,
                opponent_rating_before: playerA.rating,
                rounds_won: 0,
                total_rounds: room.questions.length,
            };
            this.emitToSide(room, 'b', 'match:end', endDataB);
        }
        await this.persistMatch(room);
        this.cleanupRoom(room);
    }
    async persistMatch(room) {
        try {
            const match = this.matchRepo.create({
                type: room.type,
                ranked: room.ranked,
                status: 'completed',
                started_at: new Date(room.createdAt),
                ended_at: new Date(),
                question_count: room.questions.length,
            });
            const saved = await this.matchRepo.save(match);
            const playerA = room.playerA;
            const participantA = this.participantRepo.create({
                match_id: saved.id,
                user_id: playerA.userId,
                team_side: 'a',
                score: playerA.score,
                rating_before: playerA.rating,
                rating_after: playerA.rating + this.scoring.eloChange(playerA.rating, (0, game_room_1.isBot)(room.playerB) ? 1000 : room.playerB.rating, this.scoring.matchResult(playerA.score, room.playerB.score)),
            });
            await this.participantRepo.save(participantA);
            if (!(0, game_room_1.isBot)(room.playerB)) {
                const playerB = room.playerB;
                const participantB = this.participantRepo.create({
                    match_id: saved.id,
                    user_id: playerB.userId,
                    team_side: 'b',
                    score: playerB.score,
                    rating_before: playerB.rating,
                    rating_after: playerB.rating + this.scoring.eloChange(playerB.rating, playerA.rating, this.scoring.matchResult(playerB.score, playerA.score)),
                });
                await this.participantRepo.save(participantB);
            }
        }
        catch (err) {
            this.logger.error('Failed to persist match', err);
        }
    }
    cleanupRoom(room) {
        const playerA = room.playerA;
        this.userRooms.delete(playerA.userId);
        if (!(0, game_room_1.isBot)(room.playerB)) {
            this.userRooms.delete(room.playerB.userId);
        }
        this.timers.delete(room.id);
        this.rooms.delete(room.id);
    }
    planBotBuzz(room) {
        const q = room.questions[room.currentRound];
        const bot = room.playerB;
        if (Math.random() >= 0.72) {
            room._botBuzzAt = undefined;
            room._botLateBuzz = undefined;
            return;
        }
        const diffMult = bot.difficulty === 'easy' ? 1.3 : bot.difficulty === 'hard' ? 0.7 : 1.0;
        const at = (0.6 + Math.random() * 0.62) * diffMult;
        if (at <= 1) {
            room._botBuzzAt = Math.max(6, Math.ceil(at * q.words.length));
            room._botLateBuzz = undefined;
        }
        else {
            room._botBuzzAt = undefined;
            room._botLateBuzz = 500 + ((at - 1) / 0.22) * 3400;
        }
    }
    botBuzz(room) {
        if (room.phase !== 'reading' && room.phase !== 'buzz_open')
            return;
        if (room.buzzedSide)
            return;
        this.bumpEpoch(room);
        room.buzzedSide = 'b';
        room.buzzedEarly = room.phase === 'reading';
        room.phase = 'answering';
        this.emitToRoom(room, 'match:buzzed', { side: 'b', username: 'Bot' });
        this.scheduleTimer(room, () => {
            const correct = Math.random() < 0.74;
            if (correct) {
                const pts = this.scoring.tossUpPoints(room.buzzedEarly);
                room.playerB.score += pts;
                const q = room.questions[room.currentRound];
                this.emitToRoom(room, 'match:answer_result', {
                    correct: true,
                    correct_answer: q.options[q.correctIndex],
                    points: pts,
                    score_a: room.playerA.score,
                    score_b: room.playerB.score,
                });
                this.scheduleTimer(room, () => this.startBonus(room, 'b'), 1500);
            }
            else {
                const penalty = room.buzzedEarly ? this.scoring.earlyPenalty() : 0;
                if (penalty)
                    room.playerB.score += penalty;
                const q = room.questions[room.currentRound];
                this.emitToRoom(room, 'match:answer_result', {
                    correct: false,
                    correct_answer: null,
                    points: penalty,
                    score_a: room.playerA.score,
                    score_b: room.playerB.score,
                });
                this.scheduleTimer(room, () => this.startRebound(room, 'a', null), 1300);
            }
        }, 1600);
    }
    botRebound(room) {
        this.bumpEpoch(room);
        const q = room.questions[room.currentRound];
        const correct = Math.random() < 0.5;
        if (correct) {
            const pts = this.scoring.reboundPoints();
            room.playerB.score += pts;
            this.emitToRoom(room, 'match:answer_result', {
                correct: true,
                correct_answer: q.options[q.correctIndex],
                points: pts,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            this.scheduleTimer(room, () => this.startBonus(room, 'b'), 1500);
        }
        else {
            this.emitToRoom(room, 'match:answer_result', {
                correct: false,
                correct_answer: q.options[q.correctIndex],
                points: 0,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
            });
            this.emitToRoom(room, 'match:round_end', {
                round: room.currentRound + 1,
                score_a: room.playerA.score,
                score_b: room.playerB.score,
                took: 'none',
            });
            room.currentRound++;
            this.scheduleTimer(room, () => this.nextRound(room), 2000);
        }
    }
    botBonus(room) {
        this.bumpEpoch(room);
        const q = room.questions[room.currentRound];
        const correct = Math.random() < 0.55;
        if (correct) {
            const pts = this.scoring.bonusPoints();
            room.playerB.score += pts;
        }
        this.emitToRoom(room, 'match:bonus_result', {
            correct,
            correct_answer: q.bonusOptions?.[0] || '',
            points: correct ? 10 : 0,
            score_a: room.playerA.score,
            score_b: room.playerB.score,
        });
        this.scheduleTimer(room, () => this.endRound(room, 'b'), 1800);
    }
    handleDisconnect(userId) {
        const room = this.getRoomByUser(userId);
        if (!room || room.phase === 'finished')
            return;
        const player = room.playerA.userId === userId ? room.playerA : null;
        const playerB = !(0, game_room_1.isBot)(room.playerB) && room.playerB.userId === userId ? room.playerB : null;
        const target = player || playerB;
        if (!target || (0, game_room_1.isBot)(target))
            return;
        target.connected = false;
        target.disconnectedAt = Date.now();
        const otherSide = target.side === 'a' ? 'b' : 'a';
        this.emitToSide(room, otherSide, 'match:opponent_disconnected', undefined);
        this.scheduleTimer(room, () => {
            if (!target.connected) {
                this.emitToSide(room, otherSide, 'match:opponent_forfeited', undefined);
                this.finishMatch(room);
            }
        }, game_config_1.RECONNECT_WINDOW_MS);
    }
    handleReconnect(socket, userId, matchId) {
        const room = this.rooms.get(matchId);
        if (!room)
            return false;
        const player = room.playerA.userId === userId ? room.playerA : null;
        const playerB = !(0, game_room_1.isBot)(room.playerB) && room.playerB.userId === userId ? room.playerB : null;
        const target = player || playerB;
        if (!target || (0, game_room_1.isBot)(target))
            return false;
        target.socket = socket;
        target.connected = true;
        target.disconnectedAt = null;
        socket.join(matchId);
        const otherSide = target.side === 'a' ? 'b' : 'a';
        this.emitToSide(room, otherSide, 'match:opponent_reconnected', undefined);
        return true;
    }
    shuffleOptions(options) {
        const a = options.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(match_entity_1.Match)),
    __param(4, (0, typeorm_1.InjectRepository)(match_participant_entity_1.MatchParticipant)),
    __param(5, (0, typeorm_1.InjectRepository)(round_entity_1.Round)),
    __metadata("design:paramtypes", [scoring_service_1.ScoringService,
        questions_service_1.QuestionsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], GameService);
//# sourceMappingURL=game.service.js.map