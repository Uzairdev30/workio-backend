import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument, AttendanceStatus } from '../../database/schemas/attendance.schema';
import { Leave, LeaveDocument, LeaveStatus } from '../../database/schemas/leave.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../database/schemas/employee-profile.schema';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(EmployeeProfile.name) private profileModel: Model<EmployeeProfileDocument>,
  ) {}

  async checkIn(userId: string, companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const existing = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      date: { $gte: today, $lte: todayEnd },
    });
    if (existing?.checkInTime) throw new BadRequestException('Already checked in today');

    const now = new Date();
    const attendance = existing
      ? await this.attendanceModel
          .findByIdAndUpdate(
            existing._id,
            { checkInTime: now, status: AttendanceStatus.PRESENT },
            { new: true },
          )
          .lean()
      : await this.attendanceModel.create({
          companyId: new Types.ObjectId(companyId),
          userId: new Types.ObjectId(userId),
          date: today,
          checkInTime: now,
          status: AttendanceStatus.PRESENT,
        });

    return { message: 'Checked in', data: attendance };
  }

  async checkOut(userId: string, companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const attendance = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      date: { $gte: today, $lte: todayEnd },
      checkInTime: { $ne: null },
    });
    if (!attendance) throw new NotFoundException('No check-in found for today');
    if (attendance.checkOutTime) throw new BadRequestException('Already checked out today');

    const now = new Date();
    const totalHours = (now.getTime() - attendance.checkInTime!.getTime()) / (1000 * 60 * 60);
    const updated = await this.attendanceModel
      .findByIdAndUpdate(
        attendance._id,
        { checkOutTime: now, totalHours: Math.round(totalHours * 100) / 100 },
        { new: true },
      )
      .lean();
    return { message: 'Checked out', data: updated };
  }

  async markPresentFromEod(userId: string, companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const existing = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      date: { $gte: today, $lte: todayEnd },
    });
    if (!existing) {
      await this.attendanceModel.create({
        companyId: new Types.ObjectId(companyId),
        userId: new Types.ObjectId(userId),
        date: today,
        status: AttendanceStatus.PRESENT,
      });
    }
  }

  async getMyAttendance(
    userId: string,
    companyId: string,
    query: PaginationDto & { month?: string; year?: string },
  ) {
    const { page = 1, limit = 31, month, year } = query;
    const filter: any = {
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
    };
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }
    const [data, total] = await Promise.all([
      this.attendanceModel
        .find(filter)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.attendanceModel.countDocuments(filter),
    ]);
    return { message: 'Attendance fetched', data: paginate(data, total, page, limit) };
  }

  async getMonthlySummary(userId: string, companyId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const records = await this.attendanceModel
      .find({
        userId: new Types.ObjectId(userId),
        companyId: new Types.ObjectId(companyId),
        date: { $gte: start, $lte: end },
      })
      .lean();
    const summary = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    return {
      message: 'Monthly summary',
      data: {
        ...summary,
        totalHours: Math.round(totalHours * 100) / 100,
        totalDays: records.length,
      },
    };
  }

  async correctAttendance(
    companyId: string,
    id: string,
    update: { status?: AttendanceStatus; notes?: string },
  ) {
    const record = await this.attendanceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) },
        update,
        { new: true },
      )
      .lean();
    if (!record) throw new NotFoundException('Attendance record not found');
    return { message: 'Attendance corrected', data: record };
  }
}
