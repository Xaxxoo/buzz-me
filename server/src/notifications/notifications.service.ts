import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { GameGateway } from '../game/game.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    private gateway: GameGateway,
  ) {}

  /** Create a notification, persist it, and deliver in real-time if the user is online. */
  async send(userId: string, type: string, title: string, body: string, data: Record<string, any> = {}) {
    const notif = this.notifRepo.create({ user_id: userId, type, title, body, data, read: false });
    const saved = await this.notifRepo.save(notif);

    this.gateway.emitToUser(userId, 'notification:new', {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      data: saved.data,
      created_at: saved.created_at,
    });

    this.logger.log(`Notification sent to ${userId}: ${type}`);
    return saved;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.notifRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async markRead(userId: string, notificationId: string) {
    await this.notifRepo.update({ id: notificationId, user_id: userId }, { read: true });
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update({ user_id: userId, read: false }, { read: true });
  }
}
