import { User } from './user.entity';
export declare class DeviceSession {
    id: string;
    user_id: string;
    user: User;
    refresh_token_hash: string;
    device_name: string;
    last_seen: Date;
    created_at: Date;
}
