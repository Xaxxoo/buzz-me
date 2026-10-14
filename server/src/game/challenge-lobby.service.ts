import { Injectable, Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

export interface ChallengePlayer {
  userId: string;
  username: string;
  rating: number;
  universityId: string | null;
  ready: boolean;
  socket: Socket | null;
}

export interface ChallengeLobby {
  challengeId: string;
  hostUniId: string;
  guestUniId: string;
  hostUniName: string;
  guestUniName: string;
  teamSize: number;
  hostPlayers: ChallengePlayer[];
  guestPlayers: ChallengePlayer[];
  hostReady: boolean;
  guestReady: boolean;
}

@Injectable()
export class ChallengeLobbyService {
  private readonly logger = new Logger(ChallengeLobbyService.name);
  private lobbies = new Map<string, ChallengeLobby>();

  getLobby(challengeId: string): ChallengeLobby | undefined {
    return this.lobbies.get(challengeId);
  }

  getLobbyByUser(userId: string): ChallengeLobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if ([...lobby.hostPlayers, ...lobby.guestPlayers].some(p => p.userId === userId)) return lobby;
    }
    return undefined;
  }

  createLobby(
    challengeId: string,
    hostUniId: string,
    guestUniId: string,
    hostUniName: string,
    guestUniName: string,
    teamSize: number,
  ): ChallengeLobby {
    const lobby: ChallengeLobby = {
      challengeId,
      hostUniId,
      guestUniId,
      hostUniName,
      guestUniName,
      teamSize,
      hostPlayers: [],
      guestPlayers: [],
      hostReady: false,
      guestReady: false,
    };
    this.lobbies.set(challengeId, lobby);
    return lobby;
  }

  joinLobby(
    challengeId: string,
    user: { id: string; username: string; rating: number; universityId: string | null },
    socket: Socket,
    server: Server,
  ): ChallengeLobby | undefined {
    const lobby = this.lobbies.get(challengeId);
    if (!lobby) return undefined;

    // Remove existing entry (reconnect)
    lobby.hostPlayers = lobby.hostPlayers.filter(p => p.userId !== user.id);
    lobby.guestPlayers = lobby.guestPlayers.filter(p => p.userId !== user.id);

    const player: ChallengePlayer = {
      userId: user.id,
      username: user.username,
      rating: user.rating,
      universityId: user.universityId,
      ready: false,
      socket,
    };

    // Assign to correct side by university
    if (user.universityId === lobby.hostUniId) {
      if (lobby.hostPlayers.length >= lobby.teamSize) return lobby; // full
      lobby.hostPlayers.push(player);
    } else if (user.universityId === lobby.guestUniId) {
      if (lobby.guestPlayers.length >= lobby.teamSize) return lobby; // full
      lobby.guestPlayers.push(player);
    } else {
      return lobby; // wrong university
    }

    socket.join(`challenge_lobby_${challengeId}`);
    this.emitUpdate(lobby, server);
    this.logger.log(`${user.username} joined challenge lobby ${challengeId}`);
    return lobby;
  }

  leaveLobby(challengeId: string, userId: string, server: Server) {
    const lobby = this.lobbies.get(challengeId);
    if (!lobby) return;

    const find = (arr: ChallengePlayer[]) => arr.find(p => p.userId === userId);
    const p = find(lobby.hostPlayers) || find(lobby.guestPlayers);
    if (p?.socket) p.socket.leave(`challenge_lobby_${challengeId}`);

    lobby.hostPlayers = lobby.hostPlayers.filter(p => p.userId !== userId);
    lobby.guestPlayers = lobby.guestPlayers.filter(p => p.userId !== userId);

    if (lobby.hostPlayers.length === 0 && lobby.guestPlayers.length === 0) {
      this.lobbies.delete(challengeId);
    } else {
      this.emitUpdate(lobby, server);
    }
  }

  setReady(challengeId: string, userId: string, ready: boolean, server: Server) {
    const lobby = this.lobbies.get(challengeId);
    if (!lobby) return;

    const p = [...lobby.hostPlayers, ...lobby.guestPlayers].find(p => p.userId === userId);
    if (p) p.ready = ready;

    // Check side readiness
    lobby.hostReady = lobby.hostPlayers.length > 0 && lobby.hostPlayers.every(p => p.ready);
    lobby.guestReady = lobby.guestPlayers.length > 0 && lobby.guestPlayers.every(p => p.ready);

    this.emitUpdate(lobby, server);
  }

  allReady(challengeId: string): boolean {
    const lobby = this.lobbies.get(challengeId);
    if (!lobby) return false;
    return (
      lobby.hostPlayers.length > 0 &&
      lobby.guestPlayers.length > 0 &&
      lobby.hostReady &&
      lobby.guestReady
    );
  }

  removeLobby(challengeId: string) {
    this.lobbies.delete(challengeId);
  }

  private emitUpdate(lobby: ChallengeLobby, server: Server) {
    const data = {
      challengeId: lobby.challengeId,
      hostUniName: lobby.hostUniName,
      guestUniName: lobby.guestUniName,
      teamSize: lobby.teamSize,
      hostPlayers: lobby.hostPlayers.map(p => ({ userId: p.userId, username: p.username, rating: p.rating, ready: p.ready })),
      guestPlayers: lobby.guestPlayers.map(p => ({ userId: p.userId, username: p.username, rating: p.rating, ready: p.ready })),
      hostReady: lobby.hostReady,
      guestReady: lobby.guestReady,
    };
    server.to(`challenge_lobby_${lobby.challengeId}`).emit('challenge:lobby_update', data);
  }
}
