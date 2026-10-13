import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GameService } from './game.service';
import { MATCHMAKING_TIMEOUT_MS, MATCHMAKING_TICK_MS, RATING_RANGE_INITIAL } from '../config/game.config';

interface QueueEntry {
  userId: string;
  username: string;
  rating: number;
  universityId: string | null;
  categories: string[];
  socket: Socket;
  joinedAt: number;
  notifiedTimeout: boolean;
}

@Injectable()
export class MatchmakingService implements OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingService.name);
  private queue: QueueEntry[] = [];
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(private gameService: GameService) {
    this.tickInterval = setInterval(() => this.tick(), MATCHMAKING_TICK_MS);
  }

  onModuleDestroy() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  addToQueue(socket: Socket, user: { id: string; username: string; rating?: number; universityId?: string }, categories: string[] = []) {
    // Remove any existing entry for this user
    this.removeFromQueue(user.id);

    const entry: QueueEntry = {
      userId: user.id,
      username: user.username,
      rating: user.rating || 1000,
      universityId: user.universityId || null,
      categories,
      socket,
      joinedAt: Date.now(),
      notifiedTimeout: false,
    };

    this.queue.push(entry);
    this.logger.log(`${user.username} joined queue (${this.queue.length} in queue)`);

    // Emit position
    socket.emit('matchmaking:status', { position: this.queue.length, elapsed_ms: 0 });
  }

  removeFromQueue(userId: string) {
    this.queue = this.queue.filter((e) => e.userId !== userId);
  }

  private tick() {
    if (this.queue.length < 2) {
      // Check for timeouts even with 1 person
      const now = Date.now();
      for (const entry of this.queue) {
        const elapsed = now - entry.joinedAt;
        if (elapsed >= MATCHMAKING_TIMEOUT_MS && !entry.notifiedTimeout) {
          entry.notifiedTimeout = true;
          entry.socket.emit('matchmaking:timeout', { offer_bot: true });
        }
        entry.socket.emit('matchmaking:status', {
          position: 1,
          elapsed_ms: elapsed,
        });
      }
      return;
    }

    const now = Date.now();
    const matched: Set<string> = new Set();

    // Sort by join time (FIFO)
    const sorted = [...this.queue].sort((a, b) => a.joinedAt - b.joinedAt);

    for (let i = 0; i < sorted.length; i++) {
      if (matched.has(sorted[i].userId)) continue;

      const a = sorted[i];
      let bestMatch: QueueEntry | null = null;
      let bestScore = -1;

      for (let j = i + 1; j < sorted.length; j++) {
        if (matched.has(sorted[j].userId)) continue;

        const b = sorted[j];
        const elapsed = Math.max(now - a.joinedAt, now - b.joinedAt);
        const ratingExpansion = Math.floor(elapsed / 5000) * 50; // Expand range over time
        const maxRange = RATING_RANGE_INITIAL + ratingExpansion;

        const ratingDiff = Math.abs(a.rating - b.rating);
        if (ratingDiff > maxRange) continue;

        // Scoring: prefer different universities + similar rating + overlapping categories
        let score = 100;
        if (a.universityId && b.universityId && a.universityId !== b.universityId) score += 20;
        score -= ratingDiff / 10;

        if (a.categories.length && b.categories.length) {
          const overlap = a.categories.filter((c) => b.categories.includes(c)).length;
          score += overlap * 5;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = b;
        }
      }

      if (bestMatch) {
        matched.add(a.userId);
        matched.add(bestMatch.userId);

        this.logger.log(`Matched ${a.username} vs ${bestMatch.username}`);

        this.gameService.createQuickRoom(
          a.socket, { id: a.userId, username: a.username },
          bestMatch.socket, { id: bestMatch.userId, username: bestMatch.username },
        ).catch((err) => this.logger.error('Failed to create room', err));
      }
    }

    // Remove matched players
    this.queue = this.queue.filter((e) => !matched.has(e.userId));

    // Update remaining positions & check timeouts
    for (let i = 0; i < this.queue.length; i++) {
      const entry = this.queue[i];
      const elapsed = now - entry.joinedAt;

      entry.socket.emit('matchmaking:status', {
        position: i + 1,
        elapsed_ms: elapsed,
      });

      if (elapsed >= MATCHMAKING_TIMEOUT_MS && !entry.notifiedTimeout) {
        entry.notifiedTimeout = true;
        entry.socket.emit('matchmaking:timeout', { offer_bot: true });
      }
    }
  }
}
