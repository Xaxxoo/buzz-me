import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.getForUser(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.markRead(req.user.id, id);
    return { ok: true };
  }

  @Put('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllRead(@Req() req: any) {
    await this.notificationsService.markAllRead(req.user.id);
    return { ok: true };
  }

  /** Get VAPID public key for client-side push subscription. */
  @Get('push/vapid-key')
  getVapidKey() {
    return { key: this.notificationsService.getVapidPublicKey() };
  }

  /** Register a push subscription for the current user. */
  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard)
  async pushSubscribe(@Req() req: any, @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await this.notificationsService.subscribe(req.user.id, body);
    return { ok: true };
  }

  /** Remove a push subscription. */
  @Delete('push/subscribe')
  @UseGuards(JwtAuthGuard)
  async pushUnsubscribe(@Req() req: any, @Body() body: { endpoint: string }) {
    await this.notificationsService.unsubscribe(req.user.id, body.endpoint);
    return { ok: true };
  }
}
