import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Company, CompanySchema } from '../../database/schemas/company.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../../database/schemas/employee-profile.schema';
import { RefreshToken, RefreshTokenSchema } from '../../database/schemas/refresh-token.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, JwtStrategy],
  exports: [TokenService, OtpService],
})
export class AuthModule {}
