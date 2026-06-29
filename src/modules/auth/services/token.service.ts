import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import { RefreshToken, RefreshTokenDocument } from '../../../database/schemas/refresh-token.schema';
import { RedisService } from '../../../redis/redis.service';
import { UserRole } from '../../../database/schemas/user.schema';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private redisService: RedisService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  generateAccessToken(payload: { sub: string; companyId: string | null; role: UserRole; email: string }): string {
    const jti = uuidv4();
    return this.jwtService.sign({ ...payload, jti }, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  async generateRefreshToken(userId: string, ipAddress?: string, deviceInfo?: string): Promise<string> {
    const token = uuidv4();
    const tokenHash = await argon2.hash(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash,
      ipAddress,
      deviceInfo,
      expiresAt,
    });

    return token;
  }

  async verifyRefreshToken(token: string, userId: string): Promise<RefreshTokenDocument | null> {
    const tokens = await this.refreshTokenModel.find({
      userId: new Types.ObjectId(userId),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    for (const storedToken of tokens) {
      const isValid = await argon2.verify(storedToken.tokenHash, token);
      if (isValid) return storedToken;
    }
    return null;
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenModel.findByIdAndUpdate(tokenId, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { isRevoked: true },
    );
  }

  async blacklistAccessToken(jti: string, expiresIn = 900): Promise<void> {
    await this.redisService.set(`blacklist:${jti}`, '1', expiresIn);
  }
}
