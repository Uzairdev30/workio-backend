import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AttendanceStatus { PRESENT = 'present', ABSENT = 'absent', LATE = 'late', HALF_DAY = 'half_day', LEAVE = 'leave', HOLIDAY = 'holiday' }

@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ required: true, type: Date }) date: Date;
  @Prop({ default: null }) checkInTime: Date;
  @Prop({ default: null }) checkOutTime: Date;
  @Prop({ default: 0 }) totalHours: number;
  @Prop({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT }) status: AttendanceStatus;
  @Prop({ default: null }) notes: string;
}

export type AttendanceDocument = Attendance & Document;
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ companyId: 1, userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1, date: 1, status: 1 });
