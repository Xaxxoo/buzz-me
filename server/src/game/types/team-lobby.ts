import { Socket } from 'socket.io';

export interface LobbyMember {
  userId: string;
  username: string;
  rating: number;
  universityId: string | null;
  ready: boolean;
  socket: Socket | null;
}

export interface TeamLobby {
  teamId: string;
  teamName: string;
  inviteCode: string;
  universityId: string | null;
  captainId: string;
  members: LobbyMember[];
}
