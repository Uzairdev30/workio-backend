import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../database/schemas/user.schema';
import { AttendanceStatus } from '../../database/schemas/attendance.schema';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Record check-in for today' })
  checkIn(@CurrentUser() u: any) {
    return this.service.checkIn(u._id.toString(), u.companyId.toString());
  }

  @Post('check-out')
  @ApiOperation({ summary: 'Record check-out for today' })
  checkOut(@CurrentUser() u: any) {
    return this.service.checkOut(u._id.toString(), u.companyId.toString());
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my attendance records' })
  getMyAttendance(
    @CurrentUser() u: any,
    @Query() q: PaginationDto & { month?: string; year?: string },
  ) {
    return this.service.getMyAttendance(u._id.toString(), u.companyId.toString(), q);
  }

  @Get('my/summary')
  @ApiOperation({ summary: 'Get my monthly attendance summary' })
  getMySummary(
    @CurrentUser() u: any,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.service.getMonthlySummary(
      u._id.toString(),
      u.companyId.toString(),
      parseInt(month || String(new Date().getMonth() + 1)),
      parseInt(year || String(new Date().getFullYear())),
    );
  }

  @Patch(':id/correct')
  @Roles(UserRole.ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: 'Correct an attendance record (Admin/HR only)' })
  correct(
    @CurrentUser() u: any,
    @Param('id') id: string,
    @Body() body: { status?: AttendanceStatus; notes?: string },
  ) {
    return this.service.correctAttendance(u.companyId.toString(), id, body);
  }
}
