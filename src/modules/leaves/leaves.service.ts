import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Leave, LeaveDocument, LeaveStatus } from '../../database/schemas/leave.schema';
import { Notification, NotificationDocument, NotificationType } from '../../database/schemas/notification.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { MailService } from '../../mail/mail.service';
import { ApplyLeaveDto, ReviewLeaveDto } from './dto/leave.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class LeavesService {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailService: MailService,
  ) {}

  async applyLeave(userId: string, companyId: string, dto: ApplyLeaveDto) {
    const overlap = await this.leaveModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      $or: [
        {
          startDate: { $lte: new Date(dto.endDate) },
          endDate: { $gte: new Date(dto.startDate) },
        },
      ],
    });
    if (overlap) throw new BadRequestException('Leave dates overlap with existing request');

    const leave = await this.leaveModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
    return { message: 'Leave request submitted', data: leave };
  }

  async getMyLeaves(userId: string, companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const filter = {
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
    };
    const [data, total] = await Promise.all([
      this.leaveModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.leaveModel.countDocuments(filter),
    ]);
    return { message: 'Leaves fetched', data: paginate(data, total, page, limit) };
  }

  async cancelLeave(userId: string, companyId: string, id: string) {
    const leave = await this.leaveModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      status: LeaveStatus.PENDING,
    });
    if (!leave) throw new NotFoundException('Pending leave not found');
    await this.leaveModel.findByIdAndUpdate(id, { status: LeaveStatus.CANCELLED });
    return { message: 'Leave cancelled' };
  }

  async getPendingLeaves(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const filter = { companyId: new Types.ObjectId(companyId), status: LeaveStatus.PENDING };
    const [data, total] = await Promise.all([
      this.leaveModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.leaveModel.countDocuments(filter),
    ]);
    return { message: 'Pending leaves', data: paginate(data, total, page, limit) };
  }

  async reviewLeave(
    reviewerId: string,
    companyId: string,
    id: string,
    status: LeaveStatus.APPROVED | LeaveStatus.REJECTED,
    dto: ReviewLeaveDto,
  ) {
    const leave = await this.leaveModel.findOne({
      _id: new Types.ObjectId(id),
      companyId: new Types.ObjectId(companyId),
      status: LeaveStatus.PENDING,
    });
    if (!leave) throw new NotFoundException('Pending leave not found');

    await this.leaveModel.findByIdAndUpdate(id, {
      status,
      reviewedBy: new Types.ObjectId(reviewerId),
      reviewedAt: new Date(),
      reviewerNote: dto.reviewerNote,
    });

    const user = await this.userModel.findById(leave.userId).lean();
    if (user) {
      const type =
        status === LeaveStatus.APPROVED
          ? NotificationType.LEAVE_APPROVED
          : NotificationType.LEAVE_REJECTED;
      const msg =
        status === LeaveStatus.APPROVED
          ? 'Your leave request has been approved'
          : 'Your leave request has been rejected';
      await this.notifModel.create({
        companyId: new Types.ObjectId(companyId),
        userId: leave.userId,
        title: `Leave ${status}`,
        message: msg,
        type,
        referenceId: id,
      });
      await this.mailService.sendLeaveStatus(
        user.email,
        user.firstName,
        status,
        leave.leaveType,
        leave.startDate.toDateString(),
        leave.endDate.toDateString(),
        dto.reviewerNote,
      );
    }
    return { message: `Leave ${status}` };
  }
}
