import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TeamLobby, LobbyMember } from './types/team-lobby';
import type { TeamLobbyUpdate } from './types/game-events';

@Injectable()
export class TeamLobbyService {
  private readonly logger = new Logger(TeamLobbyService.name);
  private lobbies = new Map<string, TeamLobby>();

  getLobby(teamId: string): TeamLobby | undefined {
    return this.lobbies.get(teamId);
  }

  getLobbyByUser(userId: string): TeamLobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (lobby.members.some(m => m.userId === userId)) return lobby;
    }
    return undefined;
  }

  joinLobby(
    teamId: string,
    teamName: string,
    inviteCode: string,
    universityId: string | null,
    captainId: string,
    user: { id: string; username: string; rating: number; universityId: string | null },
    socket: Socket,
  ): TeamLobby {
    let lobby = this.lobbies.get(teamId);
    if (!lobby) {
      lobby = {
        teamId,
        teamName,
        inviteCode,
        universityId,
        captainId,
        members: [],
      };
      this.lobbies.set(teamId, lobby);
    }

    // Remove existing entry for this user (reconnect case)
    lobby.members = lobby.members.filter(m => m.userId !== user.id);

    const member: LobbyMember = {
      userId: user.id,
      username: user.username,
      rating: user.rating,
      universityId: user.universityId,
      ready: false,
      socket,
    };
    lobby.members.push(member);

    socket.join(`team_lobby_${teamId}`);
    this.emitUpdate(lobby, socket.server);
    this.logger.log(`${user.username} joined lobby for team ${teamName}`);

    return lobby;
  }

  leaveLobby(teamId: string, userId: string, server?: any) {
    const lobby = this.lobbies.get(teamId);
    if (!lobby) return;

    const member = lobby.members.find(m => m.userId === userId);
    if (member?.socket) {
      member.socket.leave(`team_lobby_${teamId}`);
    }

    lobby.members = lobby.members.filter(m => m.userId !== userId);

    if (lobby.members.length === 0) {
      this.lobbies.delete(teamId);
    } else if (server) {
      this.emitUpdate(lobby, server);
    }
  }

  setReady(teamId: string, userId: string, ready: boolean, server?: any): boolean {
    const lobby = this.lobbies.get(teamId);
    if (!lobby) return false;

    const member = lobby.members.find(m => m.userId === userId);
    if (!member) return false;

    member.ready = ready;
    if (server) this.emitUpdate(lobby, server);
    return true;
  }

  allReady(teamId: string): boolean {
    const lobby = this.lobbies.get(teamId);
    if (!lobby || lobby.members.length < 2) return false;
    return lobby.members.every(m => m.ready);
  }

  removeLobby(teamId: string) {
    this.lobbies.delete(teamId);
  }

  private emitUpdate(lobby: TeamLobby, server: any) {
    const update: TeamLobbyUpdate = {
      teamId: lobby.teamId,
      teamName: lobby.teamName,
      inviteCode: lobby.inviteCode,
      members: lobby.members.map(m => ({
        userId: m.userId,
        username: m.username,
        rating: m.rating,
        ready: m.ready,
        isCaptain: m.userId === lobby.captainId,
      })),
    };
    server.to(`team_lobby_${lobby.teamId}`).emit('team:lobby_update', update);
  }
}
