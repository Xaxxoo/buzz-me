import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { DeviceSession } from '../entities/device-session.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private usersRepo;
    private sessionsRepo;
    private jwtService;
    private profanity;
    constructor(usersRepo: Repository<User>, sessionsRepo: Repository<DeviceSession>, jwtService: JwtService);
    signup(dto: SignupDto, deviceName: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            rating: number;
        };
    }>;
    login(dto: LoginDto, deviceName: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            rating: number;
        };
    }>;
    refresh(refreshToken: string, userId: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string, sessionId?: string): Promise<void>;
    getSessions(userId: string): Promise<DeviceSession[]>;
    deleteSession(userId: string, sessionId: string): Promise<void>;
    private issueAccessToken;
    private createTokenPair;
}
