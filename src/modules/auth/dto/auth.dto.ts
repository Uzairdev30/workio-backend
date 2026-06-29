import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2) firstName: string;
  @ApiProperty() @IsString() @MinLength(2) lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(50) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Password too weak' }) password: string;
  @ApiProperty() @IsString() @MinLength(2) companyName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

export class VerifyEmailDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() otp: string;
  @ApiProperty() @IsString() @MinLength(8) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Password too weak' }) newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Password too weak' }) newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() refreshToken: string;
}
