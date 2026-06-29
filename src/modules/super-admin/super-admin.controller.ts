import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { SubscriptionPlan } from '../../database/schemas/company.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('api/v1/super-admin')
export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  @Get('stats') @ApiOperation({ summary: 'Platform stats' })
  getStats() { return this.service.getPlatformStats(); }

  @Get('companies') @ApiOperation({ summary: 'All companies' })
  getCompanies(@Query() query: PaginationDto & { search?: string; status?: string }) { return this.service.getCompanies(query); }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) { return this.service.getCompanyById(id); }

  @Patch('companies/:id/activate')
  activate(@Param('id') id: string) { return this.service.toggleCompanyStatus(id, true); }

  @Patch('companies/:id/deactivate')
  deactivate(@Param('id') id: string) { return this.service.toggleCompanyStatus(id, false); }

  @Patch('companies/:id/subscription')
  updateSub(@Param('id') id: string, @Body() body: { plan: SubscriptionPlan }) { return this.service.updateSubscription(id, body.plan); }

  @Get('users')
  getUsers(@Query() query: PaginationDto & { search?: string; role?: string }) { return this.service.getAllUsers(query); }

  @Patch('users/:id/block')
  block(@Param('id') id: string) { return this.service.toggleUserBlock(id, true); }

  @Patch('users/:id/unblock')
  unblock(@Param('id') id: string) { return this.service.toggleUserBlock(id, false); }

  @Patch('users/:id/impersonate')
  impersonate(@CurrentUser() admin: any, @Param('id') id: string) { return this.service.impersonate(admin._id.toString(), id); }
}
