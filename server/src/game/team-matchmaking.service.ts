import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { GameService } from './game.service';
import { TeamLobbyService } from './team-lobby.service';
import { TeamLobby } from './types/team-lobby';
import { MATCHMAKING_TICK_MS } from '../config/game.config';

const TEAM_MATCH_TIMEOUT_MS = 30_000;

interface TeamQueueEntry {
  teamId: string;
  teamName: string;
  members: { userId: string; username: string; rating: number; universityId: string | null; socket: any }[];
  avgRating: number;
  universityId: string | null;
  categories: string[];
  joinedAt: number;
  notifiedTimeout: boolean;
}

@Injectable()
export class TeamMatchmakingService implements OnModuleDestroy {
  private readonly logger = new Logger(TeamMatchmakingService.name);
  private queue: TeamQueueEntry[] = [];
  private tickInterval: NodeJS.Timeout | null = null;
  /** Tracks pending challenges: challengerTeamId -> targetInviteCode */
  private challenges = new Map<string, string>();

  constructor(
    private gameService: GameService,
    private lobbyService: TeamLobbyService,
  ) {
    this.tickInterval = setInterval(() => this.tick(), MATCHMAKING_TICK_MS);
  }

  onModuleDestroy() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  addToQueue(lobby: TeamLobby, categories: string[] = []) {
    this.removeFromQueue(lobby.teamId);

    const members = lobby.members
      .filter(m => m.socket)
      .map(m => ({
        userId: m.userId,
        username: m.username,
        rating: m.rating,
        universityId: m.universityId,
        socket: m.socket!,
      }));

    const avgRating = members.reduce((sum, m) => sum + m.rating, 0) / members.length;

    const entry: TeamQueueEntry = {
      teamId: lobby.teamId,
      teamName: lobby.teamName,
      members,
      avgRating,
      universityId: lobby.universityId,
      categories,
      joinedAt: Date.now(),
      notifiedTimeout: false,
    };

    this.queue.push(entry);
    this.logger.log(`Team ${lobby.teamName} joined queue (${this.queue.length} in queue)`);

    // Notify lobby
    for (const m of members) {
      m.socket.emit('team:finding');
    }
  }

  removeFromQueue(teamId: string) {
    this.queue = this.queue.filter(e => e.teamId !== teamId);
    this.challenges.delete(teamId);
  }

  challengeByCode(lobby: TeamLobby, opponentInviteCode: string) {
    // Find opponent lobby by invite code
    // We need to check if the opponent has also issued a challenge back to us
    const opponentLobby = this.findLobbyByInvite(opponentInviteCode);
    if (!opponentLobby) {
      // Notify challenger that opponent not found
      for (const m of lobby.members) {
        m.socket?.emit('error', { message: 'No team with that code is in a lobby' });
      }
      return;
    }

    if (opponentLobby.teamId === lobby.teamId) {
      for (const m of lobby.members) {
        m.socket?.emit('error', { message: 'Cannot challenge your own team' });
      }
      return;
    }

    // Record this challenge
    this.challenges.set(lobby.teamId, opponentInviteCode);

    // Check if opponent has challenged us back
    const theirChallenge = this.challenges.get(opponentLobby.teamId);
    if (theirChallenge === lobby.inviteCode) {
      // Mutual challenge — match immediately
      this.challenges.delete(lobby.teamId);
      this.challenges.delete(opponentLobby.teamId);
      this.removeFromQueue(lobby.teamId);
      this.removeFromQueue(opponentLobby.teamId);
      this.matchTeams(lobby, opponentLobby);
    } else {
      // Wait for opponent to challenge back
      for (const m of lobby.members) {
        m.socket?.emit('team:finding');
      }
    }
  }

  private findLobbyByInvite(code: string): TeamLobby | undefined {
    // Search through active lobbies
    // The lobbyService holds all active lobbies, but we need to iterate
    // We'll do a simple approach: iterate queue + active lobbies
    for (const entry of this.queue) {
      const lobby = this.lobbyService.getLobby(entry.teamId);
      if (lobby && lobby.inviteCode === code.toUpperCase()) return lobby;
    }
    // Also check lobbies not in queue
    // We need access to all lobbies — check via invite code
    // Since lobbyService is a Map by teamId, we need to search
    return undefined; // fallback — only matchable if in queue or lobby
  }

  private tick() {
    if (this.queue.length < 2) {
      const now = Date.now();
      for (const entry of this.queue) {
        const elapsed = now - entry.joinedAt;
        if (elapsed >= TEAM_MATCH_TIMEOUT_MS && !entry.notifiedTimeout) {
          entry.notifiedTimeout = true;
          for (const m of entry.members) {
            m.socket.emit('team:match_timeout');
          }
        }
      }
      return;
    }

    const now = Date.now();
    const matched = new Set<string>();
    const sorted = [...this.queue].sort((a, b) => a.joinedAt - b.joinedAt);

    for (let i = 0; i < sorted.length; i++) {
      if (matched.has(sorted[i].teamId)) continue;

      const a = sorted[i];
      let bestMatch: TeamQueueEntry | null = null;
      let bestScore = -1;

      for (let j = i + 1; j < sorted.length; j++) {
        if (matched.has(sorted[j].teamId)) continue;

        const b = sorted[j];
        const elapsed = Math.max(now - a.joinedAt, now - b.joinedAt);
        const ratingExpansion = Math.floor(elapsed / 5000) * 50;
        const maxRange = 200 + ratingExpansion;

        const ratingDiff = Math.abs(a.avgRating - b.avgRating);
        if (ratingDiff > maxRange) continue;

        let score = 100;
        if (a.universityId && b.universityId && a.universityId !== b.universityId) score += 20;
        score -= ratingDiff / 10;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = b;
        }
      }

      if (bestMatch) {
        matched.add(a.teamId);
        matched.add(bestMatch.teamId);

        const lobbyA = this.lobbyService.getLobby(a.teamId);
        const lobbyB = this.lobbyService.getLobby(bestMatch.teamId);
        if (lobbyA && lobbyB) {
          this.logger.log(`Matched team ${a.teamName} vs ${bestMatch.teamName}`);
          this.matchTeams(lobbyA, lobbyB);
        }
      }
    }

    this.queue = this.queue.filter(e => !matched.has(e.teamId));

    // Timeout check for remaining
    for (const entry of this.queue) {
      const elapsed = now - entry.joinedAt;
      if (elapsed >= TEAM_MATCH_TIMEOUT_MS && !entry.notifiedTimeout) {
        entry.notifiedTimeout = true;
        for (const m of entry.members) {
          m.socket.emit('team:match_timeout');
        }
      }
    }
  }

  private matchTeams(lobbyA: TeamLobby, lobbyB: TeamLobby) {
    this.gameService.createTeamRoom(lobbyA, lobbyB).catch(err => {
      this.logger.error('Failed to create team room', err);
    });

    // Clean up lobbies
    this.lobbyService.removeLobby(lobbyA.teamId);
    this.lobbyService.removeLobby(lobbyB.teamId);
  }
}
