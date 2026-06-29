import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) userId: Types.ObjectId;
  @Prop({ required: true }) action: string;
  @Prop({ required: true }) resource: string;
  @Prop({ default: null }) resourceId: string;
  @Prop({ type: Object, default: null }) oldValue: Record<string, any>;
  @Prop({ type: Object, default: null }) newValue: Record<string, any>;
  @Prop({ default: null }) ipAddress: string;
  @Prop({ default: null }) userAgent: string;
  @Prop({ type: Object, default: null }) metadata: Record<string, any>;
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, action: 1 });
