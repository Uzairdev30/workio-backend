import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ required: true }) tokenHash: string;
  @Prop({ default: null }) deviceInfo: string;
  @Prop({ default: null }) ipAddress: string;
  @Prop({ default: false }) isRevoked: boolean;
  @Prop({ required: true }) expiresAt: Date;
}

export type RefreshTokenDocument = RefreshToken & Document;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
