import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { InviteUserDto, AcceptInviteDto, UpdateCompanyDto, UpdateCompanySettingsDto, CreateDepartmentDto, UpdateDepartmentDto, CreateTeamDto, UpdateTeamDto } from './dto/company.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/company')
export class CompanyController {
  constructor(private service: CompanyService) {}

  @Get('profile') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.TEAM_LEAD)
  getProfile(@CurrentUser() user: any) { return this.service.getProfile(user.companyId.toString()); }

  @Patch('profile') @Roles(UserRole.ADMIN)
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) { return this.service.updateProfile(user.companyId.toString(), dto); }

  @Get('settings') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  getSettings(@CurrentUser() user: any) { return this.service.getSettings(user.companyId.toString()); }

  @Patch('settings') @Roles(UserRole.ADMIN)
  updateSettings(@CurrentUser() user: any, @Body() dto: UpdateCompanySettingsDto) { return this.service.updateSettings(user.companyId.toString(), dto); }

  @Post('invite') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  invite(@CurrentUser() user: any, @Body() dto: InviteUserDto) { return this.service.inviteUser(user.companyId.toString(), user._id.toString(), dto); }

  @Public() @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) { return this.service.acceptInvite(dto); }

  @Get('employees') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  getEmployees(@CurrentUser() user: any, @Query() query: PaginationDto & { search?: string; role?: string }) { return this.service.getEmployees(user.companyId.toString(), query); }

  @Patch('employees/:id/role') @Roles(UserRole.ADMIN)
  updateRole(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { role: UserRole }) { return this.service.updateEmployeeRole(user.companyId.toString(), id, body.role); }

  @Patch('employees/:id/deactivate') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  deactivate(@CurrentUser() user: any, @Param('id') id: string) { return this.service.deactivateEmployee(user.companyId.toString(), id); }

  @Delete('employees/:id') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  deleteEmployee(@CurrentUser() user: any, @Param('id') id: string) { return this.service.deactivateEmployee(user.companyId.toString(), id); }

  @Get('employees/:id') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  getEmployee(@CurrentUser() user: any, @Param('id') id: string) { return this.service.getEmployeeById(user.companyId.toString(), id); }

  @Get('departments')
  getDepts(@CurrentUser() user: any) { return this.service.getDepartments(user.companyId.toString()); }

  @Post('departments') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  createDept(@CurrentUser() user: any, @Body() dto: CreateDepartmentDto) { return this.service.createDepartment(user.companyId.toString(), dto); }

  @Patch('departments/:id') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  updateDept(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) { return this.service.updateDepartment(user.companyId.toString(), id, dto); }

  @Delete('departments/:id') @Roles(UserRole.ADMIN)
  deleteDept(@CurrentUser() user: any, @Param('id') id: string) { return this.service.deleteDepartment(user.companyId.toString(), id); }

  @Get('teams')
  getTeams(@CurrentUser() user: any) { return this.service.getTeams(user.companyId.toString()); }

  @Post('teams') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  createTeam(@CurrentUser() user: any, @Body() dto: CreateTeamDto) { return this.service.createTeam(user.companyId.toString(), dto); }

  @Patch('teams/:id') @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  updateTeam(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateTeamDto) { return this.service.updateTeam(user.companyId.toString(), id, dto); }

  @Delete('teams/:id') @Roles(UserRole.ADMIN)
  deleteTeam(@CurrentUser() user: any, @Param('id') id: string) { return this.service.deleteTeam(user.companyId.toString(), id); }
}
