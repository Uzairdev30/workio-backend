import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis(config.get<string>('REDIS_URL')!);
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
