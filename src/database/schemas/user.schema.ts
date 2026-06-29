import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR_MANAGER = 'hr_manager',
  DEPARTMENT_MANAGER = 'department_manager',
  TEAM_LEAD = 'team_lead',
  EMPLOYEE = 'employee',
  INTERN = 'intern',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Company', default: null })
  companyId: Types.ObjectId | null;

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: null })
  avatar: string;

  @Prop({ default: null })
  phone: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: null })
  lastLoginAt: Date;

  @Prop({ default: null })
  passwordChangedAt: Date;

  @Prop({ default: null })
  refreshTokenHash: string;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ default: null })
  lockUntil: Date;

  @Prop({ default: null })
  deletedAt: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ companyId: 1, isActive: 1 });
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
