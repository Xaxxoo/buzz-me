import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webPush from 'web-push';
import { Notification } from '../entities/notification.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import { GameGateway } from '../game/game.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private pushEnabled = false;

  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(PushSubscription) private pushRepo: Repository<PushSubscription>,
    private gateway: GameGateway,
    private config: ConfigService,
  ) {
    const vapidPublic = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivate = this.config.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail = this.config.get<string>('VAPID_EMAIL', 'mailto:admin@buzzme.app');
    if (vapidPublic && vapidPrivate) {
      webPush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
      this.pushEnabled = true;
      this.logger.log('Web Push enabled');
    } else {
      this.logger.warn('VAPID keys not set — Web Push disabled');
    }
  }

  /** Create a notification, persist it, and deliver in real-time if the user is online. Falls back to push if offline. */
  async send(userId: string, type: string, title: string, body: string, data: Record<string, any> = {}) {
    const notif = this.notifRepo.create({ user_id: userId, type, title, body, data, read: false });
    const saved = await this.notifRepo.save(notif);

    const delivered = this.gateway.emitToUser(userId, 'notification:new', {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      data: saved.data,
      created_at: saved.created_at,
    });

    // If user is not connected via WebSocket, try push notification
    if (!delivered && this.pushEnabled) {
      this.sendPush(userId, title, body, data).catch(err =>
        this.logger.error(`Push failed for ${userId}: ${err.message}`),
      );
    }

    this.logger.log(`Notification sent to ${userId}: ${type}`);
    return saved;
  }

  /** Subscribe a user's browser for push notifications. */
  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    // Remove existing subscription with same endpoint
    await this.pushRepo.delete({ user_id: userId, endpoint: subscription.endpoint });
    const sub = this.pushRepo.create({
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
    return this.pushRepo.save(sub);
  }

  /** Unsubscribe a push endpoint. */
  async unsubscribe(userId: string, endpoint: string) {
    await this.pushRepo.delete({ user_id: userId, endpoint });
  }

  /** Get VAPID public key for client-side subscription. */
  getVapidPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  private async sendPush(userId: string, title: string, body: string, data: Record<string, any>) {
    const subs = await this.pushRepo.find({ where: { user_id: userId } });
    const payload = JSON.stringify({ title, body, data });

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
        );
      } catch (err: any) {
        // 410 Gone or 404 means the subscription is no longer valid
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.pushRepo.delete({ id: sub.id });
          this.logger.log(`Removed stale push subscription ${sub.id}`);
        }
      }
    }
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
