import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomRoleDocument = CustomRole & Document;

@Schema({ timestamps: true, collection: 'custom_roles' })
export class CustomRole {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

export const CustomRoleSchema = SchemaFactory.createForClass(CustomRole);
CustomRoleSchema.index({ companyId: 1 });
