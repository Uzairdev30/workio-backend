import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Priority } from './project.schema';

export enum TaskItemStatus { TODO = 'todo', IN_PROGRESS = 'in_progress', REVIEW = 'review', COMPLETED = 'completed', CANCELLED = 'cancelled' }

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Project', default: null }) projectId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) assignedTo: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) assignedBy: Types.ObjectId;
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ default: null }) description: string;
  @Prop({ enum: TaskItemStatus, default: TaskItemStatus.TODO }) status: TaskItemStatus;
  @Prop({ enum: Priority, default: Priority.MEDIUM }) priority: Priority;
  @Prop({ default: null }) dueDate: Date;
  @Prop({ default: null }) completedAt: Date;
  @Prop({ default: 0 }) estimatedHours: number;
  @Prop({ default: 0 }) actualHours: number;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, comment: String, createdAt: Date }], default: [] }) comments: { userId: Types.ObjectId; comment: string; createdAt: Date }[];
}

export type TaskDocument = Task & Document;
export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ companyId: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ companyId: 1, projectId: 1 });
TaskSchema.index({ companyId: 1, assignedBy: 1 });
