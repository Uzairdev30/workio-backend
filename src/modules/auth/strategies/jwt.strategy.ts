import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../database/schemas/user.schema';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: any) {
    if (payload.jti) {
      const isBlacklisted = await this.redisService.exists(`blacklist:${payload.jti}`);
      if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.userModel.findById(payload.sub).select('-passwordHash -refreshTokenHash').lean();
    if (!user || !user.isActive || user.isBlocked) throw new UnauthorizedException('Account not accessible');
    return { ...user, jti: payload.jti };
  }
}
