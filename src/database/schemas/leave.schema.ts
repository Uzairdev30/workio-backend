import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LeaveType { ANNUAL = 'annual', SICK = 'sick', CASUAL = 'casual', UNPAID = 'unpaid', MATERNITY = 'maternity', PATERNITY = 'paternity', COMP_OFF = 'comp_off' }
export enum LeaveStatus { PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected', CANCELLED = 'cancelled' }

@Schema({ timestamps: true, collection: 'leaves' })
export class Leave {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ enum: LeaveType, required: true }) leaveType: LeaveType;
  @Prop({ required: true, type: Date }) startDate: Date;
  @Prop({ required: true, type: Date }) endDate: Date;
  @Prop({ required: true, min: 0.5 }) totalDays: number;
  @Prop({ required: true }) reason: string;
  @Prop({ enum: LeaveStatus, default: LeaveStatus.PENDING }) status: LeaveStatus;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reviewedBy: Types.ObjectId;
  @Prop({ default: null }) reviewedAt: Date;
  @Prop({ default: null }) reviewerNote: string;
}

export type LeaveDocument = Leave & Document;
export const LeaveSchema = SchemaFactory.createForClass(Leave);
LeaveSchema.index({ companyId: 1, userId: 1, startDate: 1 });
LeaveSchema.index({ companyId: 1, status: 1 });
