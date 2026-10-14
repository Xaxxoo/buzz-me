import { Controller, Get, Put, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationsService.getForUser(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationsService.markRead(req.user.id, id);
    return { ok: true };
  }

  @Put('read-all')
  async markAllRead(@Req() req: any) {
    await this.notificationsService.markAllRead(req.user.id);
    return { ok: true };
  }
}
