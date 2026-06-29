import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'departments' })
export class Department {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, uppercase: true, trim: true }) code: string;
  @Prop({ default: null }) description: string;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) managerId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Department', default: null }) parentDepartmentId: Types.ObjectId;
  @Prop({ default: true }) isActive: boolean;
}

export type DepartmentDocument = Department & Document;
export const DepartmentSchema = SchemaFactory.createForClass(Department);
DepartmentSchema.index({ companyId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ companyId: 1, isActive: 1 });
