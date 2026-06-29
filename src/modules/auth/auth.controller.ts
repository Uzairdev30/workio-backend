import { Body, Controller, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public() @Post('register') @ApiOperation({ summary: 'Register company + admin' })
  register(@Body() dto: RegisterDto, @Req() req: any) { return this.authService.register(dto, req.ip); }

  @Public() @Post('login') @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto, @Req() req: any) { return this.authService.login(dto, req.ip); }

  @Public() @Post('verify-email') @ApiOperation({ summary: 'Verify email with OTP' })
  verifyEmail(@Body() dto: VerifyEmailDto) { return this.authService.verifyEmail(dto); }

  @Public() @Post('resend-verification') @ApiOperation({ summary: 'Resend email verification OTP' })
  resendVerification(@Body() body: { email: string }) { return this.authService.resendVerification(body.email); }

  @Public() @Post('forgot-password') @ApiOperation({ summary: 'Request password reset OTP' })
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.authService.forgotPassword(dto); }

  @Public() @Post('reset-password') @ApiOperation({ summary: 'Reset password with OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) { return this.authService.resetPassword(dto); }

  @Public() @Post('refresh') @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshTokenDto & { userId: string }) { return this.authService.refresh(dto.refreshToken, dto.userId); }

  @UseGuards(JwtAuthGuard) @Post('logout') @ApiBearerAuth() @ApiOperation({ summary: 'Logout current device' })
  logout(@CurrentUser() user: any) { return this.authService.logout(user._id.toString(), user.jti); }

  @UseGuards(JwtAuthGuard) @Post('logout-all') @ApiBearerAuth() @ApiOperation({ summary: 'Logout all devices' })
  logoutAll(@CurrentUser() user: any) { return this.authService.logoutAll(user._id.toString(), user.jti); }

  @UseGuards(JwtAuthGuard) @Post('change-password') @ApiBearerAuth() @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) { return this.authService.changePassword(user._id.toString(), dto); }

  @UseGuards(JwtAuthGuard) @Get('me') @ApiBearerAuth() @ApiOperation({ summary: 'Get current user' })
  getMe(@CurrentUser() user: any) { return this.authService.getMe(user._id.toString()); }

  @UseGuards(JwtAuthGuard) @Patch('profile') @ApiBearerAuth() @ApiOperation({ summary: 'Update profile' })
  updateProfile(@CurrentUser() user: any, @Body() dto: any) { return this.authService.updateProfile(user._id.toString(), dto); }

  @UseGuards(JwtAuthGuard) @Post('avatar') @ApiBearerAuth() @ApiOperation({ summary: 'Upload avatar' })
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: any) { return this.authService.uploadAvatar(user._id.toString(), file); }
}
