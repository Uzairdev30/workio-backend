import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../database/schemas/user.schema';

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() eodDeadlineTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() workingDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requireEodOnWeekends?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowLateSubmission?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() lateSubmissionGracePeriodMinutes?: number;
}

export class InviteUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() teamId?: string;
}

export class AcceptInviteDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(2) firstName: string;
  @ApiProperty() @IsString() @MinLength(2) lastName: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
}

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty() @IsString() @MinLength(2) code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
}

export class CreateTeamDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() departmentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
}

export class UpdateTeamDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leadId?: string;
}
