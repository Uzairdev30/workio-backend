import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeavesService } from './leaves.service';
import { ApplyLeaveDto, ReviewLeaveDto } from './dto/leave.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { LeaveStatus } from '../../database/schemas/leave.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/leaves')
export class LeavesController {
  constructor(private service: LeavesService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for leave' })
  applyLeave(@CurrentUser() u: any, @Body() dto: ApplyLeaveDto) {
    return this.service.applyLeave(u._id.toString(), u.companyId.toString(), dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my leave requests' })
  getMyLeaves(@CurrentUser() u: any, @Query() q: PaginationDto) {
    return this.service.getMyLeaves(u._id.toString(), u.companyId.toString(), q);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending leave request' })
  cancelLeave(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.cancelLeave(u._id.toString(), u.companyId.toString(), id);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'Get all pending leave requests' })
  getPending(@CurrentUser() u: any, @Query() q: PaginationDto) {
    return this.service.getPendingLeaves(u.companyId.toString(), q);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'Approve a leave request' })
  approve(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ReviewLeaveDto) {
    return this.service.reviewLeave(
      u._id.toString(),
      u.companyId.toString(),
      id,
      LeaveStatus.APPROVED,
      dto,
    );
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.DEPARTMENT_MANAGER)
  @ApiOperation({ summary: 'Reject a leave request' })
  reject(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: ReviewLeaveDto) {
    return this.service.reviewLeave(
      u._id.toString(),
      u.companyId.toString(),
      id,
      LeaveStatus.REJECTED,
      dto,
    );
  }
}
