import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Accepts expired JWTs (signature still verified). Use only for refresh. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
