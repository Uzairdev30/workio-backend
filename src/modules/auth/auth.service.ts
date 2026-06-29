import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema';
import { Company, CompanyDocument } from '../../database/schemas/company.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../database/schemas/employee-profile.schema';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { MailService } from '../../mail/mail.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(EmployeeProfile.name) private profileModel: Model<EmployeeProfileDocument>,
    private tokenService: TokenService,
    private otpService: OtpService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto, ip?: string) {
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) throw new ConflictException('Email already registered');

    const slug = dto.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const passwordHash = await argon2.hash(dto.password);

    const company = await this.companyModel.create({ name: dto.companyName, slug, industry: dto.industry || undefined, ownerId: new Types.ObjectId() });

    const user = await this.userModel.create({
      companyId: company._id,
      role: UserRole.ADMIN,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
    });

    await this.companyModel.findByIdAndUpdate(company._id, { ownerId: user._id });

    await this.profileModel.create({
      userId: user._id,
      companyId: company._id,
      employeeId: 'EMP-001',
      designation: 'Company Admin',
    });

    const otp = this.otpService.generateOtp();
    await this.otpService.saveOtp(dto.email, otp);
    try {
      await this.mailService.sendVerifyEmail(dto.email, dto.firstName, otp);
    } catch (e) {
      this.logger.error(`Failed to queue verification email for ${dto.email}: ${(e as Error).message}`);
    }

    const accessToken = this.tokenService.generateAccessToken({ sub: user._id.toString(), companyId: company._id.toString(), role: user.role, email: user.email });
    const refreshToken = await this.tokenService.generateRefreshToken(user._id.toString(), ip);

    return { message: 'Registration successful. Please verify your email.', data: { accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, isEmailVerified: user.isEmailVerified, companyId: company._id } } };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase(), deletedAt: null });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update: any = { failedLoginAttempts: attempts };
      if (attempts >= 5) update.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await this.userModel.findByIdAndUpdate(user._id, update);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) throw new UnauthorizedException('Account has been blocked');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    await this.userModel.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockUntil: null, lastLoginAt: new Date() });

    const companyId = user.companyId?.toString() || null;
    const accessToken = this.tokenService.generateAccessToken({ sub: user._id.toString(), companyId, role: user.role, email: user.email });
    const refreshToken = await this.tokenService.generateRefreshToken(user._id.toString(), ip);

    return { message: 'Login successful', data: { accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, isEmailVerified: user.isEmailVerified, companyId: user.companyId } } };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');

    const isValid = await this.otpService.verifyOtp(dto.email, dto.otp);
    if (!isValid) throw new BadRequestException('Invalid or expired OTP');

    await this.userModel.findByIdAndUpdate(user._id, { isEmailVerified: true });
    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');

    const otp = this.otpService.generateOtp();
    await this.otpService.saveOtp(email, otp);
    try {
      await this.mailService.sendVerifyEmail(email, user.firstName, otp);
    } catch (e) {
      this.logger.error(`Failed to queue verification email for ${email}: ${(e as Error).message}`);
    }
    return { message: 'Verification email sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) return { message: 'If this email exists, you will receive an OTP' };

    const otp = this.otpService.generateOtp();
    await this.otpService.saveOtp(`reset:${dto.email}`, otp);
    try {
      await this.mailService.sendForgotPassword(dto.email, user.firstName, otp);
    } catch (e) {
      this.logger.error(`Failed to queue password reset email for ${dto.email}: ${(e as Error).message}`);
    }
    return { message: 'If this email exists, you will receive an OTP' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await this.otpService.verifyOtp(`reset:${dto.email}`, dto.otp);
    if (!isValid) throw new BadRequestException('Invalid or expired OTP');

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.userModel.findByIdAndUpdate(user._id, { passwordHash, passwordChangedAt: new Date() });
    await this.tokenService.revokeAllUserTokens(user._id.toString());
    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const isSame = await argon2.verify(user.passwordHash, dto.newPassword);
    if (isSame) throw new BadRequestException('New password must be different from current password');

    const passwordHash = await argon2.hash(dto.newPassword);
    await this.userModel.findByIdAndUpdate(userId, { passwordHash, passwordChangedAt: new Date() });
    return { message: 'Password changed successfully' };
  }

  async refresh(refreshToken: string, userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user || !user.isActive || user.isBlocked) throw new UnauthorizedException('Account not accessible');

    const storedToken = await this.tokenService.verifyRefreshToken(refreshToken, userId);
    if (!storedToken) throw new UnauthorizedException('Invalid or expired refresh token');

    await this.tokenService.revokeRefreshToken(storedToken._id.toString());
    const newRefreshToken = await this.tokenService.generateRefreshToken(userId);
    const companyId = user.companyId?.toString() || null;
    const accessToken = this.tokenService.generateAccessToken({ sub: userId, companyId, role: user.role, email: user.email });

    return { message: 'Token refreshed', data: { accessToken, refreshToken: newRefreshToken } };
  }

  async logout(_userId: string, jti: string) {
    await this.tokenService.blacklistAccessToken(jti);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string, jti: string) {
    await this.tokenService.revokeAllUserTokens(userId);
    await this.tokenService.blacklistAccessToken(jti);
    return { message: 'Logged out from all devices' };
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash -refreshTokenHash -lockUntil -failedLoginAttempts').lean();
    if (!user) throw new NotFoundException('User not found');
    return { message: 'Profile fetched', data: user };
  }
}
