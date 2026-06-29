import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from './config/config.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { EodModule } from './modules/eod/eod.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('REDIS_URL')!);
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port) || 6379,
            ...(redisUrl.username && { username: decodeURIComponent(redisUrl.username) }),
            ...(redisUrl.password && { password: decodeURIComponent(redisUrl.password) }),
            ...(redisUrl.pathname && redisUrl.pathname !== '/' && { db: parseInt(redisUrl.pathname.slice(1)) || 0 }),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
    MailModule,
    AuthModule,
    CompanyModule,
    EodModule,
    TasksModule,
    AttendanceModule,
    LeavesModule,
    NotificationsModule,
    AnalyticsModule,
    SuperAdminModule,
    AuditModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
