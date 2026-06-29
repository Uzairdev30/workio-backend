import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LeaveType } from '../../../database/schemas/leave.schema';

export class ApplyLeaveDto {
  @ApiProperty({ enum: LeaveType }) @IsEnum(LeaveType) leaveType: LeaveType;
  @ApiProperty({ example: '2025-06-01' }) @IsDateString() startDate: string;
  @ApiProperty({ example: '2025-06-03' }) @IsDateString() endDate: string;
  @ApiProperty() @IsNumber() @Min(0.5) totalDays: number;
  @ApiProperty() @IsString() reason: string;
}

export class ReviewLeaveDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerNote?: string;
}
