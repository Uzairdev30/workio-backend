import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { Company, CompanySchema } from '../../database/schemas/company.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { EodReport, EodReportSchema } from '../../database/schemas/eod-report.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: EodReport.name, schema: EodReportSchema },
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
