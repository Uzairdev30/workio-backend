import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Priority, ProjectStatus } from '../../../database/schemas/project.schema';
import { TaskItemStatus } from '../../../database/schemas/task.schema';

export class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() assignedTo: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ example: '2025-06-15' }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
}

export class UpdateTaskDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ example: '2025-06-15' }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() actualHours?: number;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskItemStatus }) @IsEnum(TaskItemStatus) status: TaskItemStatus;
}

export class AddCommentDto {
  @ApiProperty() @IsString() comment: string;
}

export class CreateProjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ example: '2025-06-01' }) @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ example: '2025-12-31' }) @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ProjectStatus }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ example: '2025-12-31' }) @IsOptional() @IsDateString() endDate?: string;
}
