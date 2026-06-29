import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CompanySize { STARTUP = 'startup', SME = 'sme', ENTERPRISE = 'enterprise' }
export enum SubscriptionPlan { FREE = 'free', BASIC = 'basic', PRO = 'pro', ENTERPRISE = 'enterprise' }
export enum SubscriptionStatus { ACTIVE = 'active', INACTIVE = 'inactive', TRIAL = 'trial', EXPIRED = 'expired' }

@Schema({ timestamps: true, collection: 'companies' })
export class Company {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) slug: string;
  @Prop({ default: null }) logo: string;
  @Prop({ default: null }) industry: string;
  @Prop({ enum: CompanySize, default: CompanySize.STARTUP }) size: CompanySize;
  @Prop({ default: 'UTC' }) timezone: string;
  @Prop({ default: 'PK' }) country: string;
  @Prop({ default: 'PKR' }) currency: string;
  @Prop({ enum: SubscriptionPlan, default: SubscriptionPlan.FREE }) subscriptionPlan: SubscriptionPlan;
  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL }) subscriptionStatus: SubscriptionStatus;
  @Prop({ default: null }) subscriptionExpiresAt: Date;
  @Prop({ default: 50 }) maxEmployees: number;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) ownerId: Types.ObjectId;
  @Prop({
    type: {
      eodDeadlineTime: { type: String, default: '18:00' },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      requireEodOnWeekends: { type: Boolean, default: false },
      allowLateSubmission: { type: Boolean, default: true },
      lateSubmissionGracePeriodMinutes: { type: Number, default: 60 },
    },
    default: {},
  })
  settings: {
    eodDeadlineTime: string;
    workingDays: number[];
    requireEodOnWeekends: boolean;
    allowLateSubmission: boolean;
    lateSubmissionGracePeriodMinutes: number;
  };
}

export type CompanyDocument = Company & Document;
export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.index({ ownerId: 1 });
