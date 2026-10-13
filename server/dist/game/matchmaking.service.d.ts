import { OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GameService } from './game.service';
export declare class MatchmakingService implements OnModuleDestroy {
    private gameService;
    private readonly logger;
    private queue;
    private tickInterval;
    constructor(gameService: GameService);
    onModuleDestroy(): void;
    addToQueue(socket: Socket, user: {
        id: string;
        username: string;
        rating?: number;
        universityId?: string;
    }, categories?: string[]): void;
    removeFromQueue(userId: string): void;
    private tick;
}
