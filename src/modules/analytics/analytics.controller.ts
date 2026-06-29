import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('dashboard/employee')
  @ApiOperation({ summary: 'Employee personal dashboard' })
  empDashboard(@CurrentUser() u: any) {
    return this.service.getEmployeeDashboard(u._id.toString(), u.companyId.toString());
  }

  @Get('dashboard/manager')
  @Roles(UserRole.TEAM_LEAD, UserRole.DEPARTMENT_MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Manager/team lead dashboard' })
  managerDashboard(@CurrentUser() u: any) {
    return this.service.getManagerDashboard(u._id.toString(), u.companyId.toString(), u.role);
  }

  @Get('dashboard/admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin company-wide dashboard' })
  adminDashboard(@CurrentUser() u: any) {
    return this.service.getAdminDashboard(u.companyId.toString());
  }

  @Get('eod/trends')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'EOD submission trends over a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-05-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-05-25' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week'] })
  eodTrends(
    @CurrentUser() u: any,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
    @Query('groupBy') groupBy: 'day' | 'week',
  ) {
    return this.service.getEodTrends(u.companyId.toString(), start, end, groupBy);
  }

  @Get('mood/trends')
  @ApiOperation({ summary: 'Mood distribution over the last 30 days' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific user (managers only)' })
  moodTrends(@CurrentUser() u: any, @Query('userId') userId?: string) {
    return this.service.getMoodTrends(u.companyId.toString(), userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'EOD streak leaderboard' })
  leaderboard(@CurrentUser() u: any) {
    return this.service.getLeaderboard(u.companyId.toString());
  }
}
