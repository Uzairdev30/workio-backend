import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ProjectStatus { PLANNING = 'planning', ACTIVE = 'active', ON_HOLD = 'on_hold', COMPLETED = 'completed', CANCELLED = 'cancelled' }
export enum Priority { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, uppercase: true, trim: true }) code: string;
  @Prop({ default: null }) description: string;
  @Prop({ enum: ProjectStatus, default: ProjectStatus.PLANNING }) status: ProjectStatus;
  @Prop({ enum: Priority, default: Priority.MEDIUM }) priority: Priority;
  @Prop({ default: null }) startDate: Date;
  @Prop({ default: null }) endDate: Date;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) managerId: Types.ObjectId;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Team' }], default: [] }) teamIds: Types.ObjectId[];
  @Prop({ default: true }) isActive: boolean;
}

export type ProjectDocument = Project & Document;
export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ companyId: 1, code: 1 }, { unique: true });
ProjectSchema.index({ companyId: 1, status: 1 });
