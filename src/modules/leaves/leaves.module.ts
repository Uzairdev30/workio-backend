import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { Leave, LeaveSchema } from '../../database/schemas/leave.schema';
import { Notification, NotificationSchema } from '../../database/schemas/notification.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Leave.name, schema: LeaveSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LeavesController],
  providers: [LeavesService],
})
export class LeavesModule {}
