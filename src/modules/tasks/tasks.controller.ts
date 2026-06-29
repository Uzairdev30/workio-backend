import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  AddCommentDto,
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Tasks & Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1')
export class TasksController {
  constructor(private service: TasksService) {}

  @Post('tasks')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.TEAM_LEAD)
  @ApiOperation({ summary: 'Create a task' })
  createTask(@CurrentUser() u: any, @Body() dto: CreateTaskDto) {
    return this.service.createTask(u._id.toString(), u.companyId.toString(), dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get all tasks (company-wide)' })
  getTasks(
    @CurrentUser() u: any,
    @Query() q: PaginationDto & { assignedTo?: string; status?: string; projectId?: string },
  ) {
    return this.service.getTasks(u.companyId.toString(), q);
  }

  @Get('tasks/my')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  getMyTasks(@CurrentUser() u: any, @Query() q: PaginationDto & { status?: string }) {
    return this.service.getMyTasks(u._id.toString(), u.companyId.toString(), q);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by ID' })
  getTaskById(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.getTaskById(id, u._id.toString(), u.companyId.toString(), u.role);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  updateTask(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.updateTask(id, u._id.toString(), u.companyId.toString(), u.role, dto);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
    return this.service.updateTaskStatus(id, u._id.toString(), u.companyId.toString(), dto);
  }

  @Post('tasks/:id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  addComment(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: AddCommentDto) {
    return this.service.addComment(id, u._id.toString(), u.companyId.toString(), dto);
  }

  @Delete('tasks/:id')
  @Roles(UserRole.ADMIN, UserRole.DEPARTMENT_MANAGER, UserRole.TEAM_LEAD)
  @ApiOperation({ summary: 'Delete task' })
  deleteTask(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.deleteTask(id, u.companyId.toString());
  }

  @Post('projects')
  @Roles(UserRole.ADMIN, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'Create project' })
  createProject(@CurrentUser() u: any, @Body() dto: CreateProjectDto) {
    return this.service.createProject(u._id.toString(), u.companyId.toString(), dto);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get all projects' })
  getProjects(@CurrentUser() u: any, @Query() q: PaginationDto & { status?: string }) {
    return this.service.getProjects(u.companyId.toString(), q);
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get project by ID' })
  getProjectById(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.getProjectById(id, u.companyId.toString());
  }

  @Patch('projects/:id')
  @Roles(UserRole.ADMIN, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'Update project' })
  updateProject(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.updateProject(id, u.companyId.toString(), dto);
  }

  @Delete('projects/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete (soft) project' })
  deleteProject(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.deleteProject(id, u.companyId.toString());
  }
}
