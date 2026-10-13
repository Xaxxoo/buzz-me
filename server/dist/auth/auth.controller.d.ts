import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(dto: RefreshDto, userId: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    logout(userId: string): Promise<void>;
    getSessions(userId: string): Promise<import("../entities").DeviceSession[]>;
    deleteSession(userId: string, sessionId: string): Promise<void>;
}
