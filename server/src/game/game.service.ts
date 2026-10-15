import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import {
  GameRoom, PlayerSlot, BotSlot, TeamSlot, RoomQuestion, isBot, isTeam,
} from './types/game-room';
import type { TeamLobby } from './types/team-lobby';
import { ScoringService } from './scoring.service';
import { UniversityPointsService } from './university-points.service';
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
  private spectators = new Map<string, Set<import('socket.io').Socket>>(); // roomId -> spectator sockets
  /** Private room codes: code → { roomId, host socket, host user } */
  private privateCodes = new Map<string, { hostSocket: Socket; hostUser: { id: string; username: string } }>();
  /** Pending 1v1 challenges: targetUserId → challenger info */
  private pendingChallenges = new Map<string, { socket: Socket; user: { id: string; username: string }; timer: NodeJS.Timeout }>();

  constructor(
    private scoring: ScoringService,
    private universityPoints: UniversityPointsService,
    private questionsService: QuestionsService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
    @InjectRepository(MatchParticipant) private participantRepo: Repository<MatchParticipant>,
    @InjectRepository(Round) private roundRepo: Repository<Round>,
  ) {}

  async getDbUser(userId: string) {
    return this.userRepo.findOneBy({ id: userId });
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUser(userId: string): GameRoom | undefined {
    const roomId = this.userRooms.get(userId);
    if (roomId) return this.rooms.get(roomId);
    // Fallback: search team player arrays
    for (const room of this.rooms.values()) {
      if (this.findSideByUser(room, userId)) return room;
    }
    return undefined;
  }

  /** Resolve userId to side, searching team players when needed. */
  findSideByUser(room: GameRoom, userId: string): 'a' | 'b' | null {
    const checkSlot = (slot: PlayerSlot | BotSlot | TeamSlot, side: 'a' | 'b'): boolean => {
      if (isBot(slot)) return false;
      if (isTeam(slot)) return slot.players.some(p => p.userId === userId);
      return slot.userId === userId;
    };
    if (checkSlot(room.playerA, 'a')) return 'a';
    if (checkSlot(room.playerB, 'b')) return 'b';
    return null;
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
      buzzOpenAt: null,
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
      buzzOpenAt: null,
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

  /** Create a private (friendly, unranked) room and return the join code. */
  createPrivateCode(socket: Socket, user: { id: string; username: string }): string {
    // Generate a short 6-char alphanumeric code
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.privateCodes.set(code, { hostSocket: socket, hostUser: user });
    // Expire the code after 5 minutes
    setTimeout(() => {
      if (this.privateCodes.has(code)) {
        this.privateCodes.delete(code);
        socket.emit('private:expired', { code });
      }
    }, 5 * 60_000);
    return code;
  }

  /** Join a private room by code. Returns the created room or null if code is invalid. */
  async joinPrivateRoom(code: string, socket: Socket, user: { id: string; username: string }): Promise<GameRoom | null> {
    const entry = this.privateCodes.get(code);
    if (!entry) return null;
    this.privateCodes.delete(code);

    const [dbA, dbB] = await Promise.all([
      this.userRepo.findOneBy({ id: entry.hostUser.id }),
      this.userRepo.findOneBy({ id: user.id }),
    ]);
    const questions = await this.questionsService.getRandomSet(ROUNDS);

    const roomId = `private_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
      ranked: false,
      playerA: {
        userId: entry.hostUser.id,
        username: entry.hostUser.username,
        rating: dbA?.rating || 1000,
        universityId: dbA?.university_id || null,
        socket: entry.hostSocket,
        score: 0,
        side: 'a',
        connected: true,
        disconnectedAt: null,
        rtt: 0,
      },
      playerB: {
        userId: user.id,
        username: user.username,
        rating: dbB?.rating || 1000,
        universityId: dbB?.university_id || null,
        socket,
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
      buzzOpenAt: null,
      wordIndex: 0,
      answeredCorrectly: null,
      answeredOption: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.userRooms.set(entry.hostUser.id, roomId);
    this.userRooms.set(user.id, roomId);
    this.timers.set(roomId, new Map());

    entry.hostSocket.join(roomId);
    socket.join(roomId);

    const opponentInfoForA = { id: user.id, username: user.username, rating: dbB?.rating || 1000 };
    const opponentInfoForB = { id: entry.hostUser.id, username: entry.hostUser.username, rating: dbA?.rating || 1000 };
    entry.hostSocket.emit('match:found', { match_id: roomId, opponent: opponentInfoForA, you_side: 'a' });
    socket.emit('match:found', { match_id: roomId, opponent: opponentInfoForB, you_side: 'b' });

    this.startCountdown(room);
    return room;
  }

  /** Clean up private codes on disconnect. */
  cleanupPrivateCodes(userId: string) {
    for (const [code, entry] of this.privateCodes) {
      if (entry.hostUser.id === userId) {
        this.privateCodes.delete(code);
      }
    }
  }

  /** Send a 1v1 challenge to another player. Returns false if target is offline or busy. */
  sendPlayerChallenge(
    challengerSocket: Socket,
    challenger: { id: string; username: string },
    targetUserId: string,
    gateway: { emitToUser: (userId: string, event: string, data: any) => boolean },
  ): boolean {
    // Can't challenge yourself
    if (challenger.id === targetUserId) return false;
    // Can't if already in a match
    if (this.userRooms.has(challenger.id) || this.userRooms.has(targetUserId)) return false;
    // Cancel any existing outgoing challenge from this user
    this.cancelPlayerChallenge(challenger.id);

    const sent = gateway.emitToUser(targetUserId, 'match:challenge_received', {
      from_user_id: challenger.id,
      from_username: challenger.username,
      from_rating: 1000, // will be enriched by gateway
    });
    if (!sent) return false;

    // Auto-expire after 30 seconds
    const timer = setTimeout(() => {
      this.pendingChallenges.delete(targetUserId);
      challengerSocket.emit('match:challenge_declined', { target_user_id: targetUserId });
    }, 30_000);

    this.pendingChallenges.set(targetUserId, { socket: challengerSocket, user: challenger, timer });
    return true;
  }

  /** Respond to a 1v1 challenge. */
  async respondPlayerChallenge(
    responderSocket: Socket,
    responder: { id: string; username: string },
    fromUserId: string,
    accept: boolean,
  ): Promise<GameRoom | null> {
    const challenge = this.pendingChallenges.get(responder.id);
    if (!challenge || challenge.user.id !== fromUserId) return null;

    clearTimeout(challenge.timer);
    this.pendingChallenges.delete(responder.id);

    if (!accept) {
      challenge.socket.emit('match:challenge_declined', { target_user_id: responder.id });
      return null;
    }

    // Create an unranked quick room
    return this.joinPrivateRoom_internal(
      challenge.socket, challenge.user,
      responderSocket, responder,
    );
  }

  /** Helper: create a private room given two sockets/users directly. */
  private async joinPrivateRoom_internal(
    socketA: Socket, userA: { id: string; username: string },
    socketB: Socket, userB: { id: string; username: string },
  ): Promise<GameRoom> {
    const [dbA, dbB] = await Promise.all([
      this.userRepo.findOneBy({ id: userA.id }),
      this.userRepo.findOneBy({ id: userB.id }),
    ]);
    const questions = await this.questionsService.getRandomSet(ROUNDS);

    const roomId = `duel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
      ranked: false,
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
      buzzOpenAt: null,
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

  /** Cancel outgoing player challenge from this user. */
  cancelPlayerChallenge(userId: string) {
    for (const [targetId, challenge] of this.pendingChallenges) {
      if (challenge.user.id === userId) {
        clearTimeout(challenge.timer);
        this.pendingChallenges.delete(targetId);
        // Notify the target that the challenge was cancelled
        break;
      }
    }
  }

  /** Clean up pending challenges on disconnect. */
  cleanupPlayerChallenges(userId: string) {
    this.cancelPlayerChallenge(userId);
    // Also decline any challenges sent TO this user
    const incoming = this.pendingChallenges.get(userId);
    if (incoming) {
      clearTimeout(incoming.timer);
      incoming.socket.emit('match:challenge_declined', { target_user_id: userId });
      this.pendingChallenges.delete(userId);
    }
  }

  async createTeamRoom(lobbyA: TeamLobby, lobbyB: TeamLobby): Promise<GameRoom> {
    const memberIdsA = lobbyA.members.filter(m => m.socket).map(m => m.userId);
    const memberIdsB = lobbyB.members.filter(m => m.socket).map(m => m.userId);
    const allIds = [...memberIdsA, ...memberIdsB];
    const dbUsers = await Promise.all(allIds.map(id => this.userRepo.findOneBy({ id })));
    const userMap = new Map(dbUsers.filter(Boolean).map(u => [u!.id, u!]));

    const questions = await this.questionsService.getRandomSet(ROUNDS);
    const roomId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const roomQuestions: RoomQuestion[] = questions.map(q => ({
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

    const buildTeamSlot = (lobby: TeamLobby, side: 'a' | 'b'): TeamSlot => ({
      teamId: lobby.teamId,
      teamName: lobby.teamName,
      universityId: lobby.universityId,
      score: 0,
      side,
      players: lobby.members.filter(m => m.socket).map(m => {
        const db = userMap.get(m.userId);
        return {
          userId: m.userId,
          username: m.username,
          rating: db?.rating || m.rating,
          universityId: m.universityId,
          socket: m.socket,
          score: 0,
          side,
          connected: true,
          disconnectedAt: null,
          rtt: 0,
        };
      }),
    });

    const teamSlotA = buildTeamSlot(lobbyA, 'a');
    const teamSlotB = buildTeamSlot(lobbyB, 'b');

    // Ranked if both teams have a uniform university
    const ranked = !!(lobbyA.universityId && lobbyB.universityId);

    const room: GameRoom = {
      id: roomId,
      type: 'team',
      ranked,
      playerA: teamSlotA,
      playerB: teamSlotB,
      questions: roomQuestions,
      currentRound: 0,
      phase: 'countdown',
      epoch: 0,
      buzzedSide: null,
      buzzedEarly: false,
      buzzOpenAt: null,
      wordIndex: 0,
      answeredCorrectly: null,
      answeredOption: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.timers.set(roomId, new Map());

    // Register all players and join room
    for (const p of teamSlotA.players) {
      this.userRooms.set(p.userId, roomId);
      p.socket?.join(roomId);
    }
    for (const p of teamSlotB.players) {
      this.userRooms.set(p.userId, roomId);
      p.socket?.join(roomId);
    }

    // Compute avg ratings for opponent info
    const avgA = teamSlotA.players.reduce((s, p) => s + p.rating, 0) / teamSlotA.players.length;
    const avgB = teamSlotB.players.reduce((s, p) => s + p.rating, 0) / teamSlotB.players.length;

    // Notify all players
    for (const p of teamSlotA.players) {
      p.socket?.emit('match:found', {
        match_id: roomId,
        opponent: { id: lobbyB.teamId, username: lobbyB.teamName, rating: Math.round(avgB) },
        you_side: 'a',
      });
    }
    for (const p of teamSlotB.players) {
      p.socket?.emit('match:found', {
        match_id: roomId,
        opponent: { id: lobbyA.teamId, username: lobbyA.teamName, rating: Math.round(avgA) },
        you_side: 'b',
      });
    }

    this.startCountdown(room);
    return room;
  }

  async createChallengeRoom(
    challengeId: string,
    hostPlayers: { userId: string; username: string; rating: number; universityId: string | null; socket: Socket | null }[],
    guestPlayers: { userId: string; username: string; rating: number; universityId: string | null; socket: Socket | null }[],
    hostUniId: string,
    guestUniId: string,
    hostUniName: string,
    guestUniName: string,
    questionCount: number,
  ): Promise<GameRoom> {
    const allIds = [...hostPlayers, ...guestPlayers].map(p => p.userId);
    const dbUsers = await Promise.all(allIds.map(id => this.userRepo.findOneBy({ id })));
    const userMap = new Map(dbUsers.filter(Boolean).map(u => [u!.id, u!]));

    const questions = await this.questionsService.getRandomSet(questionCount);
    const roomId = `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const roomQuestions: RoomQuestion[] = questions.map(q => ({
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

    const buildTeamSlot = (players: typeof hostPlayers, uniId: string, side: 'a' | 'b'): TeamSlot => ({
      teamId: `challenge_${side}_${challengeId}`,
      teamName: side === 'a' ? hostUniName : guestUniName,
      universityId: uniId,
      score: 0,
      side,
      players: players.filter(p => p.socket).map(p => {
        const db = userMap.get(p.userId);
        return {
          userId: p.userId,
          username: p.username,
          rating: db?.rating || p.rating,
          universityId: p.universityId,
          socket: p.socket,
          score: 0,
          side,
          connected: true,
          disconnectedAt: null,
          rtt: 0,
        };
      }),
    });

    const teamSlotA = buildTeamSlot(hostPlayers, hostUniId, 'a');
    const teamSlotB = buildTeamSlot(guestPlayers, guestUniId, 'b');

    const room: GameRoom = {
      id: roomId,
      type: 'challenge',
      ranked: true,
      challengeId,
      playerA: teamSlotA,
      playerB: teamSlotB,
      questions: roomQuestions,
      currentRound: 0,
      phase: 'countdown',
      epoch: 0,
      buzzedSide: null,
      buzzedEarly: false,
      buzzOpenAt: null,
      wordIndex: 0,
      answeredCorrectly: null,
      answeredOption: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.timers.set(roomId, new Map());

    for (const p of teamSlotA.players) {
      this.userRooms.set(p.userId, roomId);
      p.socket?.join(roomId);
    }
    for (const p of teamSlotB.players) {
      this.userRooms.set(p.userId, roomId);
      p.socket?.join(roomId);
    }

    const avgA = teamSlotA.players.reduce((s, p) => s + p.rating, 0) / (teamSlotA.players.length || 1);
    const avgB = teamSlotB.players.reduce((s, p) => s + p.rating, 0) / (teamSlotB.players.length || 1);

    for (const p of teamSlotA.players) {
      p.socket?.emit('match:found', {
        match_id: roomId,
        opponent: { id: guestUniId, username: guestUniName, rating: Math.round(avgB) },
        you_side: 'a',
      });
    }
    for (const p of teamSlotB.players) {
      p.socket?.emit('match:found', {
        match_id: roomId,
        opponent: { id: hostUniId, username: hostUniName, rating: Math.round(avgA) },
        you_side: 'b',
      });
    }

    this.startCountdown(room);
    return room;
  }

  // ---------- Spectator support ----------

  addSpectator(roomId: string, socket: Socket): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    let set = this.spectators.get(roomId);
    if (!set) { set = new Set(); this.spectators.set(roomId, set); }
    set.add(socket);
    socket.join(`${roomId}_spec`);

    // Send current snapshot
    socket.emit('spectate:state', {
      match_id: roomId,
      score_a: room.playerA.score,
      score_b: room.playerB.score,
      round: room.currentRound + 1,
      total: room.questions.length,
      phase: room.phase,
    });
    return true;
  }

  removeSpectator(roomId: string, socket: Socket) {
    const set = this.spectators.get(roomId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) this.spectators.delete(roomId);
    }
    socket.leave(`${roomId}_spec`);
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
    const emitSlot = (slot: PlayerSlot | BotSlot | TeamSlot) => {
      if (isBot(slot)) return;
      if (isTeam(slot)) {
        for (const p of slot.players) {
          if (p.socket && p.connected) p.socket.emit(event, data);
        }
      } else {
        if (slot.socket && slot.connected) slot.socket.emit(event, data);
      }
    };
    emitSlot(room.playerA);
    emitSlot(room.playerB);

    // Relay to spectators (exclude answer options to prevent cheating)
    const specSet = this.spectators.get(room.id);
    if (specSet && specSet.size > 0 && event !== 'match:ask' && event !== 'match:rebound') {
      for (const s of specSet) {
        if (s.connected) s.emit(event, data);
      }
    }
  }

  private emitToSide(room: GameRoom, side: 'a' | 'b', event: string, data: any) {
    const slot = side === 'a' ? room.playerA : room.playerB;
    if (isBot(slot)) return;
    if (isTeam(slot)) {
      for (const p of slot.players) {
        if (p.socket && p.connected) p.socket.emit(event, data);
      }
    } else {
      if (slot.socket && slot.connected) slot.socket.emit(event, data);
    }
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
    room.buzzOpenAt = null;
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
    room.buzzOpenAt = Date.now();
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

    const side = this.findSideByUser(room, userId) || 'b';

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
    const username = isBot(buzzer) ? buzzer.username : isTeam(buzzer) ? buzzer.teamName : buzzer.username;

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
      const buzzFastMs = room.buzzOpenAt ? Date.now() - room.buzzOpenAt : null;
      const pts = this.scoring.tossUpPoints(room.buzzedEarly, buzzFastMs);
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
    if (!q.bonusText || !q.bonusOptions || q.bonusText.trim().split(/\s+/).length < 4 || q.bonusOptions.length < 2) {
      // No valid bonus question — skip to next round
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
    const scoreA = room.playerA.score;
    const scoreB = room.playerB.score;

    // Sudden-death tiebreaker for non-solo matches (one extra question)
    if (scoreA === scoreB && room.type !== 'solo' && !(room as any)._suddenDeath) {
      (room as any)._suddenDeath = true;
      this.emitToRoom(room, 'match:sudden_death', {});
      try {
        const extra = await this.questionsService.getRandomSet(1);
        if (extra.length > 0) {
          const q = extra[0];
          room.questions.push({
            id: q.id,
            categoryId: q.category_id,
            categoryName: q.category?.name || '',
            text: q.text,
            words: q.text.split(' '),
            options: q.options,
            correctIndex: q.correct_option_index,
            bonusText: q.bonus_text,
            bonusOptions: q.bonus_options,
          });
          // Continue with the extra round
          this.scheduleTimer(room, () => this.nextRound(room), 2500);
          return;
        }
      } catch {
        this.logger.warn('Failed to fetch sudden-death question, proceeding with draw');
      }
    }

    room.phase = 'finished';
    this.bumpEpoch(room);

    if (room.type === 'team' && isTeam(room.playerA) && isTeam(room.playerB)) {
      return this.finishTeamMatch(room, room.playerA, room.playerB);
    }

    const playerA = room.playerA as PlayerSlot;
    const isRanked = room.type !== 'solo';

    // Calculate Elo (solo matches do NOT change rating per C3)
    const opponentRating = isBot(room.playerB) ? 1000 : (room.playerB as PlayerSlot).rating;
    const resultA = this.scoring.matchResult(scoreA, scoreB);
    const deltaA = isRanked ? this.scoring.eloChange(playerA.rating, opponentRating, resultA) : 0;
    const newRatingA = playerA.rating + deltaA;

    // Update player A in DB
    const updateA: any = {
      matches_played: () => 'matches_played + 1',
      matches_won: () => resultA === 1 ? 'matches_won + 1' : 'matches_won',
      matches_lost: () => resultA === 0 ? 'matches_lost + 1' : 'matches_lost',
      matches_drawn: () => resultA === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
    };
    if (isRanked) updateA.rating = newRatingA;
    await this.userRepo.update(playerA.userId, updateA);

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
      const playerB = room.playerB as PlayerSlot;
      const resultB = this.scoring.matchResult(scoreB, scoreA);
      const deltaB = isRanked ? this.scoring.eloChange(playerB.rating, playerA.rating, resultB) : 0;
      const newRatingB = playerB.rating + deltaB;

      const updateB: any = {
        matches_played: () => 'matches_played + 1',
        matches_won: () => resultB === 1 ? 'matches_won + 1' : 'matches_won',
        matches_lost: () => resultB === 0 ? 'matches_lost + 1' : 'matches_lost',
        matches_drawn: () => resultB === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
      };
      if (isRanked) updateB.rating = newRatingB;
      await this.userRepo.update(playerB.userId, updateB);

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

    // Award university points for ranked non-solo matches
    if (room.ranked && room.type !== 'solo') {
      const pA = room.playerA as PlayerSlot;
      const dbA = await this.userRepo.findOneBy({ id: pA.userId });
      if (dbA) {
        await this.universityPoints.awardMatchPoints(pA.userId, dbA.university_id, dbA.university_verified, scoreA > scoreB);
      }
      if (!isBot(room.playerB)) {
        const pB = room.playerB as PlayerSlot;
        const dbB = await this.userRepo.findOneBy({ id: pB.userId });
        if (dbB) {
          await this.universityPoints.awardMatchPoints(pB.userId, dbB.university_id, dbB.university_verified, scoreB > scoreA);
        }
      }
    }

    // Persist match to DB
    await this.persistMatch(room);

    // Cleanup
    this.cleanupRoom(room);
  }

  private async finishTeamMatch(room: GameRoom, teamA: TeamSlot, teamB: TeamSlot) {
    const scoreA = teamA.score;
    const scoreB = teamB.score;

    const avgRatingA = teamA.players.reduce((s, p) => s + p.rating, 0) / teamA.players.length;
    const avgRatingB = teamB.players.reduce((s, p) => s + p.rating, 0) / teamB.players.length;

    const resultA = this.scoring.matchResult(scoreA, scoreB);
    const resultB = this.scoring.matchResult(scoreB, scoreA);
    const deltaA = this.scoring.eloChange(avgRatingA, avgRatingB, resultA);
    const deltaB = this.scoring.eloChange(avgRatingB, avgRatingA, resultB);

    // Apply same Elo delta to all team members
    for (const p of teamA.players) {
      const newRating = p.rating + deltaA;
      await this.userRepo.update(p.userId, {
        rating: newRating,
        matches_played: () => 'matches_played + 1',
        matches_won: () => resultA === 1 ? 'matches_won + 1' : 'matches_won',
        matches_lost: () => resultA === 0 ? 'matches_lost + 1' : 'matches_lost',
        matches_drawn: () => resultA === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
      } as any);

      p.socket?.emit('match:end', {
        match_id: room.id,
        score_a: scoreA,
        score_b: scoreB,
        rating_before: p.rating,
        rating_after: newRating,
        rating_delta: deltaA,
        opponent_rating_before: Math.round(avgRatingB),
        rounds_won: 0,
        total_rounds: room.questions.length,
      });
    }

    for (const p of teamB.players) {
      const newRating = p.rating + deltaB;
      await this.userRepo.update(p.userId, {
        rating: newRating,
        matches_played: () => 'matches_played + 1',
        matches_won: () => resultB === 1 ? 'matches_won + 1' : 'matches_won',
        matches_lost: () => resultB === 0 ? 'matches_lost + 1' : 'matches_lost',
        matches_drawn: () => resultB === 0.5 ? 'matches_drawn + 1' : 'matches_drawn',
      } as any);

      p.socket?.emit('match:end', {
        match_id: room.id,
        score_a: scoreA,
        score_b: scoreB,
        rating_before: p.rating,
        rating_after: newRating,
        rating_delta: deltaB,
        opponent_rating_before: Math.round(avgRatingA),
        rounds_won: 0,
        total_rounds: room.questions.length,
      });
    }

    // Award university points for each team member
    if (room.ranked) {
      for (const p of teamA.players) {
        const db = await this.userRepo.findOneBy({ id: p.userId });
        if (db) await this.universityPoints.awardMatchPoints(p.userId, db.university_id, db.university_verified, scoreA > scoreB);
      }
      for (const p of teamB.players) {
        const db = await this.userRepo.findOneBy({ id: p.userId });
        if (db) await this.universityPoints.awardMatchPoints(p.userId, db.university_id, db.university_verified, scoreB > scoreA);
      }
    }

    // Award challenge points if this is a challenge match
    if (room.type === 'challenge' && teamA.universityId && teamB.universityId) {
      await this.universityPoints.awardChallengePoints(teamA.universityId, scoreA > scoreB);
      await this.universityPoints.awardChallengePoints(teamB.universityId, scoreB > scoreA);
    }

    await this.persistMatch(room);
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

      if (room.type === 'team' && isTeam(room.playerA) && isTeam(room.playerB)) {
        // Persist participants for all team members
        const teamA = room.playerA as TeamSlot;
        const teamB = room.playerB as TeamSlot;
        const avgA = teamA.players.reduce((s, p) => s + p.rating, 0) / teamA.players.length;
        const avgB = teamB.players.reduce((s, p) => s + p.rating, 0) / teamB.players.length;
        const resultA = this.scoring.matchResult(teamA.score, teamB.score);
        const resultB = this.scoring.matchResult(teamB.score, teamA.score);
        const deltaA = this.scoring.eloChange(avgA, avgB, resultA);
        const deltaB = this.scoring.eloChange(avgB, avgA, resultB);

        for (const p of teamA.players) {
          await this.participantRepo.save(this.participantRepo.create({
            match_id: saved.id, user_id: p.userId, team_side: 'a',
            score: teamA.score, rating_before: p.rating, rating_after: p.rating + deltaA,
          }));
        }
        for (const p of teamB.players) {
          await this.participantRepo.save(this.participantRepo.create({
            match_id: saved.id, user_id: p.userId, team_side: 'b',
            score: teamB.score, rating_before: p.rating, rating_after: p.rating + deltaB,
          }));
        }
      } else {
        const playerA = room.playerA as PlayerSlot;
        const participantA = this.participantRepo.create({
          match_id: saved.id,
          user_id: playerA.userId,
          team_side: 'a',
          score: playerA.score,
          rating_before: playerA.rating,
          rating_after: playerA.rating + this.scoring.eloChange(
            playerA.rating,
            isBot(room.playerB) ? 1000 : (room.playerB as PlayerSlot).rating,
            this.scoring.matchResult(playerA.score, room.playerB.score),
          ),
        });
        await this.participantRepo.save(participantA);

        if (!isBot(room.playerB)) {
          const playerB = room.playerB as PlayerSlot;
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
      }
    } catch (err) {
      this.logger.error('Failed to persist match', err);
    }
  }

  private cleanupRoom(room: GameRoom) {
    const cleanSlot = (slot: PlayerSlot | BotSlot | TeamSlot) => {
      if (isBot(slot)) return;
      if (isTeam(slot)) {
        for (const p of slot.players) this.userRooms.delete(p.userId);
      } else {
        this.userRooms.delete(slot.userId);
      }
    };
    cleanSlot(room.playerA);
    cleanSlot(room.playerB);
    this.timers.delete(room.id);
    this.rooms.delete(room.id);
    this.spectators.delete(room.id);
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
        const buzzFastMs = room.buzzOpenAt ? Date.now() - room.buzzOpenAt : null;
        const pts = this.scoring.tossUpPoints(room.buzzedEarly, buzzFastMs);
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

    const target = this.findPlayerSlot(room, userId);
    if (!target) return;

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
    if (!room || room.phase === 'finished') return false;

    const target = this.findPlayerSlot(room, userId);
    if (!target) return false;

    // Enforce reconnect window
    if (target.disconnectedAt && Date.now() - target.disconnectedAt > RECONNECT_WINDOW_MS) {
      return false;
    }

    target.socket = socket;
    target.connected = true;
    target.disconnectedAt = null;
    socket.join(matchId);

    const otherSide = target.side === 'a' ? 'b' : 'a';
    this.emitToSide(room, otherSide, 'match:opponent_reconnected', undefined);

    // Send current match state snapshot so the client can re-render
    socket.emit('match:reconnect_state', {
      match_id: room.id,
      round: room.currentRound + 1,
      total: room.questions.length,
      score_a: room.playerA.score,
      score_b: room.playerB.score,
      phase: room.phase,
    });

    return true;
  }

  /** Find the PlayerSlot for a userId, searching team players if needed. */
  private findPlayerSlot(room: GameRoom, userId: string): PlayerSlot | null {
    for (const slot of [room.playerA, room.playerB]) {
      if (isBot(slot)) continue;
      if (isTeam(slot)) {
        const found = slot.players.find(p => p.userId === userId);
        if (found) return found;
      } else if (slot.userId === userId) {
        return slot;
      }
    }
    return null;
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
