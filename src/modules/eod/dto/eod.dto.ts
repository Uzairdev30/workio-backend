import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EodMood, TaskStatus } from '../../../database/schemas/eod-report.schema';

export class EodTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: TaskStatus }) @IsEnum(TaskStatus) status: TaskStatus;
  @ApiProperty() @IsNumber() @Min(0) @Max(24) hoursSpent: number;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}

export class CreateEodDto {
  @ApiProperty({ type: [EodTaskDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => EodTaskDto) tasks: EodTaskDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() accomplishments?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() blockers?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextDayPlan?: string;
  @ApiProperty({ enum: EodMood }) @IsEnum(EodMood) mood: EodMood;
}

export class ReviewEodDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerComments?: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(5) rating: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() flag?: boolean;
}
