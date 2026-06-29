import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EmploymentType { FULL_TIME = 'full_time', PART_TIME = 'part_time', CONTRACT = 'contract', INTERN = 'intern' }

@Schema({ timestamps: true, collection: 'employee_profiles' })
export class EmployeeProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true }) userId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true }) companyId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Department', default: null }) departmentId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Team', default: null }) teamId: Types.ObjectId;
  @Prop({ required: true }) employeeId: string;
  @Prop({ default: null }) designation: string;
  @Prop({ default: null }) joiningDate: Date;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null }) reportingManagerId: Types.ObjectId;
  @Prop({ enum: EmploymentType, default: EmploymentType.FULL_TIME }) employmentType: EmploymentType;
  @Prop({ default: true }) isActive: boolean;
}

export type EmployeeProfileDocument = EmployeeProfile & Document;
export const EmployeeProfileSchema = SchemaFactory.createForClass(EmployeeProfile);
EmployeeProfileSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
EmployeeProfileSchema.index({ companyId: 1, departmentId: 1 });
EmployeeProfileSchema.index({ companyId: 1, teamId: 1 });
