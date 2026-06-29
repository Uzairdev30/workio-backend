import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from '../../database/schemas/attendance.schema';
import { Leave, LeaveSchema } from '../../database/schemas/leave.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../../database/schemas/employee-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: User.name, schema: UserSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
