import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company, CompanySchema } from '../../database/schemas/company.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { Department, DepartmentSchema } from '../../database/schemas/department.schema';
import { Team, TeamSchema } from '../../database/schemas/team.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../../database/schemas/employee-profile.schema';
import { CustomRole, CustomRoleSchema } from '../../database/schemas/custom-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Team.name, schema: TeamSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: CustomRole.name, schema: CustomRoleSchema },
    ]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
