import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType { EOD_REMINDER = 'eod_reminder', EOD_REVIEWED = 'eod_reviewed', EOD_FLAGGED = 'eod_flagged', TASK_ASSIGNED = 'task_assigned', TASK_UPDATED = 'task_updated', LEAVE_APPROVED = 'leave_approved', LEAVE_REJECTED = 'leave_rejected', LEAVE_REQUEST = 'leave_request', ATTENDANCE_CORRECTED = 'attendance_corrected', ANNOUNCEMENT = 'announcement' }

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) message: string;
  @Prop({ enum: NotificationType, required: true }) type: NotificationType;
  @Prop({ default: null }) referenceId: string;
  @Prop({ default: null }) referenceModel: string;
  @Prop({ default: false }) isRead: boolean;
  @Prop({ default: null }) readAt: Date;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
