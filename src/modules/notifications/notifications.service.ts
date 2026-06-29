import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from '../../database/schemas/notification.schema';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

export interface CreateNotificationPayload {
  companyId: string;
  userId:    string;
  title:     string;
  message:   string;
  type:      NotificationType;
  referenceId?:    string;
  referenceModel?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
  ) {}

  async createNotification(payload: CreateNotificationPayload): Promise<void> {
    await this.notifModel.create({
      companyId:      new Types.ObjectId(payload.companyId),
      userId:         new Types.ObjectId(payload.userId),
      title:          payload.title,
      message:        payload.message,
      type:           payload.type,
      referenceId:    payload.referenceId ?? undefined,
      referenceModel: payload.referenceModel ?? undefined,
    });
  }

  async getNotifications(userId: string, query: PaginationDto & { unreadOnly?: string }) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (unreadOnly === 'true') filter.isRead = false;

    const [data, total] = await Promise.all([
      this.notifModel
        .find(filter)
        .sort({ isRead: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.notifModel.countDocuments(filter),
    ]);
    return { message: 'Notifications fetched', data: paginate(data, total, page, limit) };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notifModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
    return { message: 'Unread count', data: { count } };
  }

  async markAsRead(userId: string, notifId: string) {
    const notif = await this.notifModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(notifId), userId: new Types.ObjectId(userId) },
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .lean();
    if (!notif) throw new NotFoundException('Notification not found');
    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(userId: string, notifId: string) {
    await this.notifModel.findOneAndDelete({
      _id: new Types.ObjectId(notifId),
      userId: new Types.ObjectId(userId),
    });
    return { message: 'Notification deleted' };
  }
}
