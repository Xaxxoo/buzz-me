import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import {
  GameRoom, PlayerSlot, BotSlot, RoomQuestion, isBot,
} from './types/game-room';
import { ScoringService } from './scoring.service';
import { QuestionsService } from '../questions/questions.service';
import { User } from '../entities/user.entity';
import { Match } from '../entities/match.entity';
import { MatchParticipant } from '../entities/match-participant.entity';
import { Round } from '../entities/round.entity';
import {
  ROUNDS, BUZZ_WINDOW_MS, ANSWER_WINDOW_S, BONUS_WINDOW_S,
  WORD_BASE_DELAY_MS, WORD_CHAR_DELAY_MS, PUNCTUATION_PAUSE_MS,
  MIN_BUZZ_TIME_MS, RECONNECT_WINDOW_MS,
} from '../config/game.config';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private rooms = new Map<string, GameRoom>();
  private userRooms = new Map<string, string>(); // userId -> roomId
  private timers = new Map<string, Map<number, NodeJS.Timeout>>(); // roomId -> epoch -> timer

  constructor(
    private scoring: ScoringService,
    private questionsService: QuestionsService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(MatchParticipant) private participantRepo: Repository<MatchParticipant>,
    @InjectRepository(Round) private roundRepo: Repository<Round>,
  ) {}

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUser(userId: string): GameRoom | undefined {
    const roomId = this.userRooms.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  async createSoloRoom(socket: Socket, user: { id: string; username: string }): Promise<GameRoom> {
    const dbUser = await this.userRepo.findOneBy({ id: user.id });
    const questions = await this.questionsService.getRandomSet(ROUNDS);

    const roomId = `solo_${user.id}_${Date.now()}`;
    const roomQuestions: RoomQuestion[] = questions.map((q) => ({
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

    const room: GameRoom = {
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

  async createQuickRoom(
    socketA: Socket, userA: { id: string; username: string },
    socketB: Socket, userB: { id: string; username: string },
  ): Promise<GameRoom> {
    const [dbA, dbB] = await Promise.all([
      this.userRepo.findOneBy({ id: userA.id }),
      this.userRepo.findOneBy({ id: userB.id }),
    ]);
    const questions = await this.questionsService.getRandomSet(ROUNDS);

    const roomId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const roomQuestions: RoomQuestion[] = questions.map((q) => ({
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

    const room: GameRoom = {
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

    // Notify both players
    const opponentInfoForA = { id: userB.id, username: userB.username, rating: dbB?.rating || 1000 };
    const opponentInfoForB = { id: userA.id, username: userA.username, rating: dbA?.rating || 1000 };
    socketA.emit('match:found', { match_id: roomId, opponent: opponentInfoForA, you_side: 'a' });
    socketB.emit('match:found', { match_id: roomId, opponent: opponentInfoForB, you_side: 'b' });

    this.startCountdown(room);
    return room;
  }

  // ---------- Game loop ----------

  private scheduleTimer(room: GameRoom, fn: () => void, ms: number) {
    const epoch = room.epoch;
    const timer = setTimeout(() => {
      if (room.epoch === epoch) fn();
    }, ms);
    this.timers.get(room.id)?.set(epoch, timer);
  }

  private bumpEpoch(room: GameRoom) {
    room.epoch++;
  }

  private emitToRoom(room: GameRoom, event: string, data: any) {
    const a = room.playerA as PlayerSlot;
    if (a.socket && a.connected) a.socket.emit(event, data);

    if (!isBot(room.playerB)) {
      const b = room.playerB;
      if (b.socket && b.connected) b.socket.emit(event, data);
    }
  }

  private emitToSide(room: GameRoom, side: 'a' | 'b', event: string, data: any) {
    const player = side === 'a' ? room.playerA : room.playerB;
    if (isBot(player)) return;
    if (player.socket && player.connected) player.socket.emit(event, data);
  }

  private startCountdown(room: GameRoom) {
    room.phase = 'countdown';
    this.emitToRoom(room, 'match:countdown', { seconds: 3 });
    this.scheduleTimer(room, () => this.nextRound(room), 3000);
  }

  private nextRound(room: GameRoom) {
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

    // Bot planning for solo matches
    if (isBot(room.playerB)) {
      this.planBotBuzz(room);
    }
  }

  private readNextWord(room: GameRoom) {
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

    // Check if bot should buzz now
    if (isBot(room.playerB) && room.phase === 'reading') {
      const botPlan = (room as any)._botBuzzAt;
      if (botPlan !== undefined && room.wordIndex >= botPlan) {
        this.scheduleTimer(room, () => this.botBuzz(room), 200);
        return;
      }
    }

    if (room.wordIndex >= q.words.length) {
      this.scheduleTimer(room, () => this.openBuzzWindow(room), WORD_BASE_DELAY_MS + word.length * WORD_CHAR_DELAY_MS);
    } else {
      const delay = WORD_BASE_DELAY_MS + word.length * WORD_CHAR_DELAY_MS + (/[,.]$/.test(word) ? PUNCTUATION_PAUSE_MS : 0);
      this.scheduleTimer(room, () => this.readNextWord(room), delay);
    }
  }

  private openBuzzWindow(room: GameRoom) {
    room.phase = 'buzz_open';
    this.emitToRoom(room, 'match:buzz_open', { duration_ms: BUZZ_WINDOW_MS });

    // Bot late buzz
    if (isBot(room.playerB) && (room as any)._botLateBuzz) {
      this.scheduleTimer(room, () => this.botBuzz(room), (room as any)._botLateBuzz);
    }

    this.scheduleTimer(room, () => {
      this.bumpEpoch(room);
      // Nobody buzzed
      this.emitToRoom(room, 'match:round_end', {
        round: room.currentRound + 1,
        score_a: room.playerA.score,
        score_b: room.playerB.score,
        took: 'none',
      });
      room.currentRound++;
      this.scheduleTimer(room, () => this.nextRound(room), 2000);
    }, BUZZ_WINDOW_MS);
  }

  handleBuzz(room: GameRoom, userId: string, timestamp: number) {
    if (room.phase !== 'reading' && room.phase !== 'buzz_open') return;
    if (room.buzzedSide) return; // Someone already buzzed

    const player = room.playerA as PlayerSlot;
    const side = player.userId === userId ? 'a' : 'b';

    // Anti-cheat: flag impossibly fast buzzes
    const buzzTime = Date.now() - room.createdAt;
    if (buzzTime < MIN_BUZZ_TIME_MS) {
      this.logger.warn(`Suspicious buzz from ${userId}: ${buzzTime}ms`);
    }

    this.bumpEpoch(room);
    room.buzzedSide = side;
    room.buzzedEarly = room.phase === 'reading';
    room.phase = 'answering';

    const buzzer = side === 'a' ? room.playerA : room.playerB;
    const username = isBot(buzzer) ? buzzer.username : buzzer.username;

    this.emitToRoom(room, 'match:buzzed', { side, username });

    // Send options only AFTER buzz accepted (anti-cheat)
    const q = room.questions[room.currentRound];
    const shuffled = this.shuffleOptions(q.options);

    this.scheduleTimer(room, () => {
      this.emitToSide(room, side, 'match:ask', {
        options: shuffled,
        seconds: ANSWER_WINDOW_S,
      });

      // Timer for answer timeout
      this.scheduleTimer(room, () => {
        this.handleAnswer(room, side, -1); // timeout
      }, ANSWER_WINDOW_S * 1000);
    }, 700);
  }

  handleAnswer(room: GameRoom, side: 'a' | 'b', optionIndex: number) {
    if (room.phase !== 'answering') return;

    this.bumpEpoch(room);
    const q = room.questions[room.currentRound];
    // optionIndex -1 means timeout
    const correct = optionIndex >= 0 && optionIndex === 0; // index 0 is always correct before shuffle
    // Actually, we need to map back from shuffled. Let's track the correct answer text.
    const correctAnswer = q.options[q.correctIndex];
    const answeredText = optionIndex >= 0 ? (room as any)._currentShuffled?.[optionIndex] : null;
    const isCorrect = answeredText === correctAnswer;

    room.answeredCorrectly = isCorrect;

    if (isCorrect) {
      const pts = this.scoring.tossUpPoints(room.buzzedEarly);
      if (side === 'a') room.playerA.score += pts;
      else room.playerB.score += pts;

      this.emitToRoom(room, 'match:answer_result', {
        correct: true,
        correct_answer: correctAnswer,
        points: pts,
        score_a: room.playerA.score,
        score_b: room.playerB.score,
      });

      // Go to bonus
      this.scheduleTimer(room, () => this.startBonus(room, side), 1500);
    } else {
      const penalty = room.buzzedEarly ? this.scoring.earlyPenalty() : 0;
      if (penalty) {
        if (side === 'a') room.playerA.score += penalty;
        else room.playerB.score += penalty;
      }

      this.emitToRoom(room, 'match:answer_result', {
        correct: false,
        correct_answer: optionIndex < 0 ? null : correctAnswer,
        points: penalty,
        score_a: room.playerA.score,
        score_b: room.playerB.score,
      });

      // Rebound to other side
      const otherSide = side === 'a' ? 'b' : 'a';
      this.scheduleTimer(room, () => this.startRebound(room, otherSide, answeredText), 1300);
    }
  }

  private startRebound(room: GameRoom, side: 'a' | 'b', struckOption: string | null) {
    room.phase = 'rebound';

    if (isBot(room.playerB) && side === 'b') {
      // Bot rebound
      this.scheduleTimer(room, () => this.botRebound(room), 1600);
      return;
    }

    const q = room.questions[room.currentRound];
    const shuffled = this.shuffleOptions(q.options);
    this.emitToSide(room, side, 'match:rebound', {
      options: shuffled,
      seconds: ANSWER_WINDOW_S,
      struck: struckOption || '',
    });

    this.scheduleTimer(room, () => {
      this.handleRebound(room, side, -1);
    }, ANSWER_WINDOW_S * 1000);
  }

  handleRebound(room: GameRoom, side: 'a' | 'b', optionIndex: number) {
    if (room.phase !== 'rebound') return;

    this.bumpEpoch(room);
    const q = room.questions[room.currentRound];
    const correctAnswer = q.options[q.correctIndex];
    const answeredText = optionIndex >= 0 ? (room as any)._currentShuffled?.[optionIndex] : null;
    const isCorrect = answeredText === correctAnswer;

    if (isCorrect) {
      const pts = this.scoring.reboundPoints();
      if (side === 'a') room.playerA.score += pts;
      else room.playerB.score += pts;

      this.emitToRoom(room, 'match:answer_result', {
        correct: true,
        correct_answer: correctAnswer,
        points: pts,
        score_a: room.playerA.score,
        score_b: room.playerB.score,
      });

      this.scheduleTimer(room, () => this.startBonus(room, side), 1500);
    } else {
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

  private startBonus(room: GameRoom, forSide: 'a' | 'b') {
    room.phase = 'bonus';
    const q = room.questions[room.currentRound];
    if (!q.bonusText || !q.bonusOptions) {
      // No bonus question — skip to next round
      this.endRound(room, forSide);
      return;
    }

    const shuffled = this.shuffleOptions(q.bonusOptions);

    if (isBot(room.playerB) && forSide === 'b') {
      // Bot bonus
      this.emitToRoom(room, 'match:bonus', {
        text: q.bonusText,
        options: shuffled,
        seconds: BONUS_WINDOW_S,
        for_side: forSide,
      });
      this.scheduleTimer(room, () => this.botBonus(room), 2000);
      return;
    }

    this.emitToRoom(room, 'match:bonus', {
      text: q.bonusText,
      options: shuffled,
      seconds: BONUS_WINDOW_S,
      for_side: forSide,
    });

    this.scheduleTimer(room, () => {
      this.handleBonus(room, forSide, -1);
    }, BONUS_WINDOW_S * 1000);
  }

  handleBonus(room: GameRoom, side: 'a' | 'b', optionIndex: number) {
    if (room.phase !== 'bonus') return;

    this.bumpEpoch(room);
    const q = room.questions[room.currentRound];
    const correctAnswer = q.bonusOptions?.[0] || '';
    const answeredText = optionIndex >= 0 ? (room as any)._currentShuffled?.[optionIndex] : null;
    const isCorrect = answeredText === correctAnswer;

    if (isCorrect) {
      const pts = this.scoring.bonusPoints();
      if (side === 'a') room.playerA.score += pts;
      else room.playerB.score += pts;
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

  private endRound(room: GameRoom, tookSide: 'a' | 'b') {
    this.emitToRoom(room, 'match:round_end', {
      round: room.currentRound + 1,
      score_a: room.playerA.score,
      score_b: room.playerB.score,
      took: tookSide,
    });
    room.currentRound++;
    this.scheduleTimer(room, () => this.nextRound(room), 2000);
  }

  private async finishMatch(room: GameRoom) {
    room.phase = 'finished';
    this.bumpEpoch(room);

    const scoreA = room.playerA.score;
    const scoreB = room.playerB.score;
    const playerA = room.playerA as PlayerSlot;

    // Calculate Elo
    const opponentRating = isBot(room.playerB) ? 1000 : room.playerB.rating;
    const resultA = this.scoring.matchResult(scoreA, scoreB);
    const deltaA = this.scoring.eloChange(playerA.rating, opponentRating, resultA);
    const newRatingA = playerA.rating + deltaA;

    // Update player A rating in DB
    await this.userRepo.update(playerA.userId, {
      rating: newRatingA,
      matches_played: () => 'matches_played + 1',
      matches_won: () => resultA === 1 ? 'matches_won + 1' : 'matches_won',
      matches_lost: () => resultA === 0 ? 'matches_lost + 1' : 'matches_lost',
      matches_drawn: () => resultA === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
    } as any);

    const endDataA = {
      match_id: room.id,
      score_a: scoreA,
      score_b: scoreB,
      rating_before: playerA.rating,
      rating_after: newRatingA,
      rating_delta: deltaA,
      opponent_rating_before: opponentRating,
      rounds_won: 0, // simplified
      total_rounds: room.questions.length,
    };

    this.emitToSide(room, 'a', 'match:end', endDataA);

    if (!isBot(room.playerB)) {
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
      } as any);

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

    // Persist match to DB
    await this.persistMatch(room);

    // Cleanup
    this.cleanupRoom(room);
  }

  private async persistMatch(room: GameRoom) {
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

      const playerA = room.playerA as PlayerSlot;
      const participantA = this.participantRepo.create({
        match_id: saved.id,
        user_id: playerA.userId,
        team_side: 'a',
        score: playerA.score,
        rating_before: playerA.rating,
        rating_after: playerA.rating + this.scoring.eloChange(
          playerA.rating,
          isBot(room.playerB) ? 1000 : room.playerB.rating,
          this.scoring.matchResult(playerA.score, room.playerB.score),
        ),
      });
      await this.participantRepo.save(participantA);

      if (!isBot(room.playerB)) {
        const playerB = room.playerB;
        const participantB = this.participantRepo.create({
          match_id: saved.id,
          user_id: playerB.userId,
          team_side: 'b',
          score: playerB.score,
          rating_before: playerB.rating,
          rating_after: playerB.rating + this.scoring.eloChange(
            playerB.rating, playerA.rating,
            this.scoring.matchResult(playerB.score, playerA.score),
          ),
        });
        await this.participantRepo.save(participantB);
      }
    } catch (err) {
      this.logger.error('Failed to persist match', err);
    }
  }

  private cleanupRoom(room: GameRoom) {
    const playerA = room.playerA as PlayerSlot;
    this.userRooms.delete(playerA.userId);
    if (!isBot(room.playerB)) {
      this.userRooms.delete(room.playerB.userId);
    }
    this.timers.delete(room.id);
    this.rooms.delete(room.id);
  }

  // ---------- Bot logic ----------

  private planBotBuzz(room: GameRoom) {
    const q = room.questions[room.currentRound];
    const bot = room.playerB as BotSlot;

    // 72% chance bot knows the answer (matches frontend)
    if (Math.random() >= 0.72) {
      (room as any)._botBuzzAt = undefined;
      (room as any)._botLateBuzz = undefined;
      return;
    }

    const diffMult = bot.difficulty === 'easy' ? 1.3 : bot.difficulty === 'hard' ? 0.7 : 1.0;
    const at = (0.6 + Math.random() * 0.62) * diffMult;

    if (at <= 1) {
      (room as any)._botBuzzAt = Math.max(6, Math.ceil(at * q.words.length));
      (room as any)._botLateBuzz = undefined;
    } else {
      (room as any)._botBuzzAt = undefined;
      (room as any)._botLateBuzz = 500 + ((at - 1) / 0.22) * 3400;
    }
  }

  private botBuzz(room: GameRoom) {
    if (room.phase !== 'reading' && room.phase !== 'buzz_open') return;
    if (room.buzzedSide) return;

    this.bumpEpoch(room);
    room.buzzedSide = 'b';
    room.buzzedEarly = room.phase === 'reading';
    room.phase = 'answering';

    this.emitToRoom(room, 'match:buzzed', { side: 'b', username: 'Bot' });

    this.scheduleTimer(room, () => {
      // Bot answers: 74% correct (matches frontend)
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
      } else {
        const penalty = room.buzzedEarly ? this.scoring.earlyPenalty() : 0;
        if (penalty) room.playerB.score += penalty;
        const q = room.questions[room.currentRound];

        this.emitToRoom(room, 'match:answer_result', {
          correct: false,
          correct_answer: null,
          points: penalty,
          score_a: room.playerA.score,
          score_b: room.playerB.score,
        });

        // Rebound to player A
        this.scheduleTimer(room, () => this.startRebound(room, 'a', null), 1300);
      }
    }, 1600);
  }

  private botRebound(room: GameRoom) {
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
    } else {
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

  private botBonus(room: GameRoom) {
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

  // ---------- Disconnect / reconnect ----------

  handleDisconnect(userId: string) {
    const room = this.getRoomByUser(userId);
    if (!room || room.phase === 'finished') return;

    const player = room.playerA.userId === userId ? room.playerA as PlayerSlot : null;
    const playerB = !isBot(room.playerB) && room.playerB.userId === userId ? room.playerB : null;
    const target = player || playerB;
    if (!target || isBot(target)) return;

    target.connected = false;
    target.disconnectedAt = Date.now();

    const otherSide = target.side === 'a' ? 'b' : 'a';
    this.emitToSide(room, otherSide, 'match:opponent_disconnected', undefined);

    // Start reconnection timer
    this.scheduleTimer(room, () => {
      if (!target.connected) {
        this.emitToSide(room, otherSide, 'match:opponent_forfeited', undefined);
        this.finishMatch(room);
      }
    }, RECONNECT_WINDOW_MS);
  }

  handleReconnect(socket: Socket, userId: string, matchId: string): boolean {
    const room = this.rooms.get(matchId);
    if (!room) return false;

    const player = room.playerA.userId === userId ? room.playerA as PlayerSlot : null;
    const playerB = !isBot(room.playerB) && room.playerB.userId === userId ? room.playerB : null;
    const target = player || playerB;
    if (!target || isBot(target)) return false;

    target.socket = socket;
    target.connected = true;
    target.disconnectedAt = null;
    socket.join(matchId);

    const otherSide = target.side === 'a' ? 'b' : 'a';
    this.emitToSide(room, otherSide, 'match:opponent_reconnected', undefined);

    return true;
  }

  // ---------- Utility ----------

  private shuffleOptions(options: string[]): string[] {
    const a = options.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
