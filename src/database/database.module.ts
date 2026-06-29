import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { Company, CompanySchema } from './schemas/company.schema';
import { Department, DepartmentSchema } from './schemas/department.schema';
import { Team, TeamSchema } from './schemas/team.schema';
import { EmployeeProfile, EmployeeProfileSchema } from './schemas/employee-profile.schema';
import { EodReport, EodReportSchema } from './schemas/eod-report.schema';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB_NAME'),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Team.name, schema: TeamSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EodReport.name, schema: EodReportSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
