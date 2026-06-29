import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EodReport, EodReportSchema } from '../../database/schemas/eod-report.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Attendance, AttendanceSchema } from '../../database/schemas/attendance.schema';
import { Task, TaskSchema } from '../../database/schemas/task.schema';
import { Leave, LeaveSchema } from '../../database/schemas/leave.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../../database/schemas/employee-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EodReport.name, schema: EodReportSchema },
      { name: User.name, schema: UserSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
