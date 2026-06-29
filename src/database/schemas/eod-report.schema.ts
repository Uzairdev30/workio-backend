import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EodStatus { DRAFT = 'draft', SUBMITTED = 'submitted', REVIEWED = 'reviewed', FLAGGED = 'flagged' }
export enum EodMood { GREAT = 'great', GOOD = 'good', NEUTRAL = 'neutral', STRESSED = 'stressed', BAD = 'bad' }
export enum TaskStatus { COMPLETED = 'completed', IN_PROGRESS = 'in_progress', BLOCKED = 'blocked', CARRIED_FORWARD = 'carried_forward' }

class EodTask {
  @Prop({ required: true }) title: string;
  @Prop({ default: null }) description: string;
  @Prop({ enum: TaskStatus, default: TaskStatus.COMPLETED }) status: TaskStatus;
  @Prop({ default: 0, min: 0, max: 24 }) hoursSpent: number;
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null }) projectId: Types.ObjectId;
}

@Schema({ timestamps: true, collection: 'eod_reports' })
export class EodReport {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Department', default: null }) departmentId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null }) teamId: Types.ObjectId;
  @Prop({ required: true, type: Date }) reportDate: Date;
  @Prop({ type: [{ title: String, description: String, status: String, hoursSpent: Number, projectId: { type: Types.ObjectId, ref: 'Project' } }], default: [] }) tasks: EodTask[];
  @Prop({ default: 0 }) totalHoursWorked: number;
  @Prop({ default: null }) accomplishments: string;
  @Prop({ default: null }) blockers: string;
  @Prop({ default: null }) nextDayPlan: string;
  @Prop({ enum: EodMood, default: EodMood.NEUTRAL }) mood: EodMood;
  @Prop({ enum: EodStatus, default: EodStatus.DRAFT }) status: EodStatus;
  @Prop({ default: null }) submittedAt: Date;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reviewedBy: Types.ObjectId;
  @Prop({ default: null }) reviewedAt: Date;
  @Prop({ default: null }) reviewerComments: string;
  @Prop({ default: null, min: 1, max: 5 }) rating: number;
  @Prop({ default: false }) isLate: boolean;
}

export type EodReportDocument = EodReport & Document;
export const EodReportSchema = SchemaFactory.createForClass(EodReport);
EodReportSchema.index({ companyId: 1, userId: 1, reportDate: 1 }, { unique: true });
EodReportSchema.index({ companyId: 1, status: 1 });
EodReportSchema.index({ companyId: 1, departmentId: 1, reportDate: 1 });
EodReportSchema.index({ companyId: 1, teamId: 1, reportDate: 1 });
