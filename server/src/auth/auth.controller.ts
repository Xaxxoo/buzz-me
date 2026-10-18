import {
  Controller, Post, Get, Delete, Body, UseGuards, Req, Param, Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(
    @Body() dto: SignupDto,
    @Headers('x-device-name') deviceName: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.signup(dto, deviceName, userAgent);
  }

  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Headers('x-device-name') deviceName: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, deviceName, userAgent);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  refresh(
    @Body() dto: RefreshDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.refresh(dto.refresh_token, userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  getSessions(@CurrentUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  deleteSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.authService.deleteSession(userId, sessionId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.current_password, dto.new_password);
  }
}
