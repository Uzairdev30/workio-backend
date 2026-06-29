import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulerService } from './scheduler.service';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Company, CompanySchema } from '../../database/schemas/company.schema';
import { EodReport, EodReportSchema } from '../../database/schemas/eod-report.schema';
import { MailModule } from '../../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: User.name,      schema: UserSchema },
      { name: Company.name,   schema: CompanySchema },
      { name: EodReport.name, schema: EodReportSchema },
    ]),
    MailModule,
    NotificationsModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
