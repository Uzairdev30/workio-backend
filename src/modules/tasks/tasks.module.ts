import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task, TaskSchema } from '../../database/schemas/task.schema';
import { Project, ProjectSchema } from '../../database/schemas/project.schema';
import { Notification, NotificationSchema } from '../../database/schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
