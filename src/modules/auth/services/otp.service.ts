import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class OtpService {
  constructor(private redisService: RedisService) {}

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOtp(key: string, otp: string, ttlSeconds = 600): Promise<void> {
    await this.redisService.set(`otp:${key}`, otp, ttlSeconds);
  }

  async verifyOtp(key: string, otp: string): Promise<boolean> {
    const stored = await this.redisService.get(`otp:${key}`);
    if (!stored || stored !== otp) return false;
    await this.redisService.del(`otp:${key}`);
    return true;
  }

  async deleteOtp(key: string): Promise<void> {
    await this.redisService.del(`otp:${key}`);
  }
}
