import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskItemStatus } from '../../database/schemas/task.schema';
import { Project, ProjectDocument } from '../../database/schemas/project.schema';
import { Notification, NotificationDocument, NotificationType } from '../../database/schemas/notification.schema';
import { UserRole } from '../../database/schemas/user.schema';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, AddCommentDto, CreateProjectDto, UpdateProjectDto } from './dto/task.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
  ) {}

  async createTask(userId: string, companyId: string, dto: CreateTaskDto) {
    const task = await this.taskModel.create({
      companyId: new Types.ObjectId(companyId),
      assignedBy: new Types.ObjectId(userId),
      assignedTo: new Types.ObjectId(dto.assignedTo),
      title: dto.title,
      description: dto.description,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : undefined,
      priority: dto.priority,
      dueDate: dto.dueDate,
      estimatedHours: dto.estimatedHours || 0,
    });
    await this.notifModel.create({
      companyId: new Types.ObjectId(companyId),
      userId: new Types.ObjectId(dto.assignedTo),
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${dto.title}"`,
      type: NotificationType.TASK_ASSIGNED,
      referenceId: task._id.toString(),
      referenceModel: 'Task',
    });
    return { message: 'Task created', data: task };
  }

  async getTasks(
    companyId: string,
    query: PaginationDto & { assignedTo?: string; status?: string; projectId?: string },
  ) {
    const { page = 1, limit = 20, assignedTo, status, projectId } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId) };
    if (assignedTo) filter.assignedTo = new Types.ObjectId(assignedTo);
    if (status) filter.status = status;
    if (projectId) filter.projectId = new Types.ObjectId(projectId);

    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('assignedTo', 'firstName lastName email')
        .populate('assignedBy', 'firstName lastName')
        .populate('projectId', 'name code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.taskModel.countDocuments(filter),
    ]);
    return { message: 'Tasks fetched', data: paginate(data, total, page, limit) };
  }

  async getMyTasks(userId: string, companyId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const filter: any = {
      companyId: new Types.ObjectId(companyId),
      assignedTo: new Types.ObjectId(userId),
    };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('assignedBy', 'firstName lastName')
        .populate('projectId', 'name code')
        .sort({ dueDate: 1, priority: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.taskModel.countDocuments(filter),
    ]);
    return { message: 'My tasks', data: paginate(data, total, page, limit) };
  }

  async getTaskById(id: string, userId: string, companyId: string, role: UserRole) {
    const filter: any = { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) };
    if (role === UserRole.EMPLOYEE || role === UserRole.INTERN) {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    const task = await this.taskModel
      .findOne(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName')
      .populate('projectId', 'name code')
      .lean();
    if (!task) throw new NotFoundException('Task not found');
    return { message: 'Task fetched', data: task };
  }

  async updateTask(id: string, userId: string, companyId: string, role: UserRole, dto: UpdateTaskDto) {
    const filter: any = { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) };
    if (role === UserRole.EMPLOYEE || role === UserRole.INTERN) {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    const task = await this.taskModel.findOneAndUpdate(filter, dto, { new: true }).lean();
    if (!task) throw new NotFoundException('Task not found');
    return { message: 'Task updated', data: task };
  }

  async updateTaskStatus(id: string, userId: string, companyId: string, dto: UpdateTaskStatusDto) {
    const update: any = { status: dto.status };
    if (dto.status === TaskItemStatus.COMPLETED) update.completedAt = new Date();

    const task = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          companyId: new Types.ObjectId(companyId),
          $or: [
            { assignedTo: new Types.ObjectId(userId) },
            { assignedBy: new Types.ObjectId(userId) },
          ],
        },
        update,
        { new: true },
      )
      .lean();
    if (!task) throw new NotFoundException('Task not found');
    return { message: 'Task status updated', data: task };
  }

  async addComment(id: string, userId: string, companyId: string, dto: AddCommentDto) {
    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
        {
          $push: {
            comments: {
              userId: new Types.ObjectId(userId),
              comment: dto.comment,
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean();
    if (!task) throw new NotFoundException('Task not found');
    return { message: 'Comment added', data: task };
  }

  async deleteTask(id: string, companyId: string) {
    await this.taskModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
    });
    return { message: 'Task deleted' };
  }

  async createProject(userId: string, companyId: string, dto: CreateProjectDto) {
    const project = await this.projectModel.create({
      companyId: new Types.ObjectId(companyId),
      managerId: new Types.ObjectId(userId),
      ...dto,
    });
    return { message: 'Project created', data: project };
  }

  async getProjects(companyId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId), isActive: true };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .populate('managerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.projectModel.countDocuments(filter),
    ]);
    return { message: 'Projects fetched', data: paginate(data, total, page, limit) };
  }

  async getProjectById(id: string, companyId: string) {
    const project = await this.projectModel
      .findOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })
      .populate('managerId', 'firstName lastName email')
      .lean();
    if (!project) throw new NotFoundException('Project not found');
    const taskCount = await this.taskModel.countDocuments({ projectId: new Types.ObjectId(id) });
    return { message: 'Project fetched', data: { ...project, taskCount } };
  }

  async updateProject(id: string, companyId: string, dto: UpdateProjectDto) {
    const project = await this.projectModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
        dto,
        { new: true },
      )
      .lean();
    if (!project) throw new NotFoundException('Project not found');
    return { message: 'Project updated', data: project };
  }

  async deleteProject(id: string, companyId: string) {
    await this.projectModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
      { isActive: false },
    );
    return { message: 'Project deleted' };
  }
}
