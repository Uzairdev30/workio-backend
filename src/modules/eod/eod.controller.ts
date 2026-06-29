import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EodService } from './eod.service';
import { CreateEodDto, ReviewEodDto } from './dto/eod.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('EOD Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/eod')
export class EodController {
  constructor(private service: EodService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update draft EOD' })
  createDraft(@CurrentUser() user: any, @Body() dto: CreateEodDto) {
    return this.service.createOrUpdateDraft(user._id.toString(), user.companyId.toString(), dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit EOD report' })
  submit(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.submitEod(user._id.toString(), user.companyId.toString(), id);
  }

  @Get('my')
  @ApiOperation({ summary: 'My EOD reports' })
  getMyReports(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & { status?: string; startDate?: string; endDate?: string },
  ) {
    return this.service.getMyReports(user._id.toString(), user.companyId.toString(), query);
  }

  @Get('my/today')
  @ApiOperation({ summary: "Today's EOD report" })
  getToday(@CurrentUser() user: any) {
    return this.service.getTodayReport(user._id.toString(), user.companyId.toString());
  }

  @Get('my/streak')
  @ApiOperation({ summary: 'My EOD streak' })
  async getStreak(@CurrentUser() user: any) {
    const streak = await this.service.getStreak(user._id.toString(), user.companyId.toString());
    return { message: 'Streak', data: { streak } };
  }

  @Get('team')
  @Roles(UserRole.TEAM_LEAD, UserRole.DEPARTMENT_MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Team EOD reports' })
  getTeamReports(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & { status?: string; date?: string },
  ) {
    return this.service.getTeamReports(user._id.toString(), user.companyId.toString(), query);
  }

  @Get('department')
  @Roles(UserRole.DEPARTMENT_MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Department EOD reports' })
  getDeptReports(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & { status?: string; date?: string },
  ) {
    return this.service.getDepartmentReports(user._id.toString(), user.companyId.toString(), query);
  }

  @Get('company')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: 'All company EOD reports' })
  getCompanyReports(
    @CurrentUser() user: any,
    @Query() query: PaginationDto & { status?: string; startDate?: string; endDate?: string; userId?: string },
  ) {
    return this.service.getCompanyReports(user.companyId.toString(), query);
  }

  @Get('pending-review')
  @Roles(UserRole.TEAM_LEAD, UserRole.DEPARTMENT_MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Pending EOD reviews' })
  getPending(@CurrentUser() user: any) {
    return this.service.getPendingReviews(user._id.toString(), user.companyId.toString(), user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get EOD report by ID' })
  getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getReportById(id, user._id.toString(), user.companyId.toString(), user.role);
  }

  @Post(':id/review')
  @Roles(UserRole.TEAM_LEAD, UserRole.DEPARTMENT_MANAGER, UserRole.HR_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Review an EOD report' })
  review(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ReviewEodDto) {
    return this.service.reviewEod(user._id.toString(), user.companyId.toString(), id, dto);
  }
}
