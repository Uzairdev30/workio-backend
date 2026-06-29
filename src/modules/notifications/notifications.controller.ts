import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  getNotifications(
    @CurrentUser() u: any,
    @Query() q: PaginationDto & { unreadOnly?: string },
  ) {
    return this.service.getNotifications(u._id.toString(), q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() u: any) {
    return this.service.getUnreadCount(u._id.toString());
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.markAsRead(u._id.toString(), id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() u: any) {
    return this.service.markAllAsRead(u._id.toString());
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  delete(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.deleteNotification(u._id.toString(), id);
  }
}
