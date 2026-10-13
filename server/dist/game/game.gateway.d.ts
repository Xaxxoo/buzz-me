import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';
import { MatchmakingService } from './matchmaking.service';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private gameService;
    private matchmakingService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, gameService: GameService, matchmakingService: MatchmakingService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleSoloMatch(client: Socket, data: {
        categories?: string[];
    }): Promise<void>;
    handleFindMatch(client: Socket, data: {
        categories?: string[];
    }): void;
    handleCancelFind(client: Socket): void;
    handleBuzz(client: Socket, data: {
        timestamp: number;
    }): void;
    handleAnswer(client: Socket, data: {
        option_index: number;
    }): void;
    handleReconnect(client: Socket, data: {
        match_id: string;
    }): void;
}
