import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EodController } from './eod.controller';
import { EodService } from './eod.service';
import { EodReport, EodReportSchema } from '../../database/schemas/eod-report.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../../database/schemas/employee-profile.schema';
import { Notification, NotificationSchema } from '../../database/schemas/notification.schema';
import { Company, CompanySchema } from '../../database/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EodReport.name, schema: EodReportSchema },
      { name: User.name, schema: UserSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [EodController],
  providers: [EodService],
  exports: [EodService],
})
export class EodModule {}
