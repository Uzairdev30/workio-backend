import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'teams' })
export class Team {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Department', required: true }) departmentId: Types.ObjectId;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, uppercase: true, trim: true }) code: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) leadId: Types.ObjectId;
  @Prop({ default: true }) isActive: boolean;
}

export type TeamDocument = Team & Document;
export const TeamSchema = SchemaFactory.createForClass(Team);
TeamSchema.index({ companyId: 1, code: 1 }, { unique: true });
TeamSchema.index({ companyId: 1, departmentId: 1 });
