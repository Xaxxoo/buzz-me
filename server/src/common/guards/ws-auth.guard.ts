import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token as string;
    if (!token) throw new WsException('Missing auth token');
    try {
      const payload = await this.jwtService.verifyAsync(token);
      (client as any).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid auth token');
    }
  }
}
