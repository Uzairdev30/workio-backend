import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EodReport, EodReportDocument, EodStatus } from '../../database/schemas/eod-report.schema';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../database/schemas/employee-profile.schema';
import { Notification, NotificationDocument, NotificationType } from '../../database/schemas/notification.schema';
import { Company, CompanyDocument } from '../../database/schemas/company.schema';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { CreateEodDto, ReviewEodDto } from './dto/eod.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class EodService {
  constructor(
    @InjectModel(EodReport.name) private eodModel: Model<EodReportDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(EmployeeProfile.name) private profileModel: Model<EmployeeProfileDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private redisService: RedisService,
    private mailService: MailService,
  ) {}

  private getTodayRange() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async createOrUpdateDraft(userId: string, companyId: string, dto: CreateEodDto) {
    const { start, end } = this.getTodayRange();
    const profile = await this.profileModel.findOne({ userId: new Types.ObjectId(userId), companyId: new Types.ObjectId(companyId) }).lean();
    const totalHoursWorked = dto.tasks.reduce((sum, t) => sum + t.hoursSpent, 0);

    const existing = await this.eodModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      reportDate: { $gte: start, $lte: end },
    });

    if (existing && existing.status !== EodStatus.DRAFT) {
      throw new BadRequestException('EOD already submitted for today and cannot be edited');
    }

    const data = {
      ...dto,
      totalHoursWorked,
      tasks: dto.tasks.map(t => ({ ...t, projectId: t.projectId ? new Types.ObjectId(t.projectId) : undefined })),
      departmentId: profile?.departmentId ?? undefined,
      teamId: profile?.teamId ?? undefined,
    };

    if (existing) {
      await this.eodModel.findByIdAndUpdate(existing._id, data);
      return { message: 'Draft updated', data: { id: existing._id } };
    }

    const report = await this.eodModel.create({
      companyId: new Types.ObjectId(companyId),
      userId: new Types.ObjectId(userId),
      reportDate: new Date(start),
      ...data,
    });
    return { message: 'Draft created', data: { id: report._id } };
  }

  async submitEod(userId: string, companyId: string, reportId: string) {
    const report = await this.eodModel.findOne({
      _id: new Types.ObjectId(reportId),
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
    });
    if (!report) throw new NotFoundException('EOD report not found');
    if (report.status === EodStatus.SUBMITTED) throw new BadRequestException('Already submitted');

    const company = await this.companyModel.findById(companyId).lean();
    const [deadlineHour, deadlineMinute] = (company?.settings?.eodDeadlineTime || '18:00').split(':').map(Number);
    const deadline = new Date(); deadline.setHours(deadlineHour, deadlineMinute, 0, 0);
    const graceMinutes = company?.settings?.lateSubmissionGracePeriodMinutes || 60;
    const isLate = new Date() > new Date(deadline.getTime() + graceMinutes * 60000);

    await this.eodModel.findByIdAndUpdate(reportId, {
      status: EodStatus.SUBMITTED,
      submittedAt: new Date(),
      isLate,
    });
    await this.updateStreak(userId, companyId);
    return { message: 'EOD submitted successfully', data: { isLate } };
  }

  private async updateStreak(userId: string, companyId: string) {
    const streakKey = `streak:${companyId}:${userId}`;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday); yesterdayEnd.setHours(23, 59, 59, 999);

    const yesterdayEod = await this.eodModel.findOne({
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
      reportDate: { $gte: yesterday, $lte: yesterdayEnd },
      status: EodStatus.SUBMITTED,
    });

    const currentStreak = parseInt(await this.redisService.get(streakKey) || '0');
    const newStreak = yesterdayEod ? currentStreak + 1 : 1;
    await this.redisService.set(streakKey, newStreak.toString(), 90 * 86400);
  }

  async getStreak(userId: string, companyId: string): Promise<number> {
    const streakKey = `streak:${companyId}:${userId}`;
    return parseInt(await this.redisService.get(streakKey) || '0');
  }

  async getMyReports(
    userId: string,
    companyId: string,
    query: PaginationDto & { status?: string; startDate?: string; endDate?: string },
  ) {
    const { page = 1, limit = 20, status, startDate, endDate } = query;
    const filter: any = {
      userId: new Types.ObjectId(userId),
      companyId: new Types.ObjectId(companyId),
    };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.reportDate = {};
      if (startDate) filter.reportDate.$gte = new Date(startDate);
      if (endDate) filter.reportDate.$lte = new Date(endDate);
    }
    const [data, total] = await Promise.all([
      this.eodModel
        .find(filter)
        .sort({ reportDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.eodModel.countDocuments(filter),
    ]);
    return { message: 'Reports fetched', data: paginate(data, total, page, limit) };
  }

  async getTodayReport(userId: string, companyId: string) {
    const { start, end } = this.getTodayRange();
    const report = await this.eodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        companyId: new Types.ObjectId(companyId),
        reportDate: { $gte: start, $lte: end },
      })
      .lean();
    return { message: "Today's report", data: report };
  }

  async getReportById(id: string, userId: string, companyId: string, role: UserRole) {
    const filter: any = { _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) };
    if (role === UserRole.EMPLOYEE || role === UserRole.INTERN) {
      filter.userId = new Types.ObjectId(userId);
    }
    const report = await this.eodModel
      .findOne(filter)
      .populate('userId', 'firstName lastName email')
      .lean();
    if (!report) throw new NotFoundException('Report not found');
    return { message: 'Report fetched', data: report };
  }

  async getTeamReports(
    leadId: string,
    companyId: string,
    query: PaginationDto & { status?: string; date?: string },
  ) {
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(leadId), companyId: new Types.ObjectId(companyId) })
      .lean();
    if (!profile?.teamId) return { message: 'No team assigned', data: { data: [], total: 0 } };

    const teamMembers = await this.profileModel
      .find({ teamId: profile.teamId, companyId: new Types.ObjectId(companyId) })
      .distinct('userId');

    const { page = 1, limit = 20, status, date } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId), userId: { $in: teamMembers } };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const e = new Date(date); e.setHours(23, 59, 59, 999);
      filter.reportDate = { $gte: d, $lte: e };
    }

    const [data, total] = await Promise.all([
      this.eodModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ reportDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.eodModel.countDocuments(filter),
    ]);
    return { message: 'Team reports', data: paginate(data, total, page, limit) };
  }

  async getDepartmentReports(
    managerId: string,
    companyId: string,
    query: PaginationDto & { status?: string; date?: string },
  ) {
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(managerId), companyId: new Types.ObjectId(companyId) })
      .lean();
    const deptFilter: any = { companyId: new Types.ObjectId(companyId) };
    if (profile?.departmentId) deptFilter.departmentId = profile.departmentId;

    const deptMembers = await this.profileModel.find(deptFilter).distinct('userId');

    const { page = 1, limit = 20, status, date } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId), userId: { $in: deptMembers } };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const e = new Date(date); e.setHours(23, 59, 59, 999);
      filter.reportDate = { $gte: d, $lte: e };
    }

    const [data, total] = await Promise.all([
      this.eodModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ reportDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.eodModel.countDocuments(filter),
    ]);
    return { message: 'Department reports', data: paginate(data, total, page, limit) };
  }

  async getCompanyReports(
    companyId: string,
    query: PaginationDto & { status?: string; startDate?: string; endDate?: string; userId?: string },
  ) {
    const { page = 1, limit = 20, status, startDate, endDate, userId } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId) };
    if (status) filter.status = status;
    if (userId) filter.userId = new Types.ObjectId(userId);
    if (startDate || endDate) {
      filter.reportDate = {};
      if (startDate) filter.reportDate.$gte = new Date(startDate);
      if (endDate) filter.reportDate.$lte = new Date(endDate);
    }
    const [data, total] = await Promise.all([
      this.eodModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ reportDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.eodModel.countDocuments(filter),
    ]);
    return { message: 'Company reports', data: paginate(data, total, page, limit) };
  }

  async reviewEod(reviewerId: string, companyId: string, reportId: string, dto: ReviewEodDto) {
    const report = await this.eodModel.findOne({
      _id: new Types.ObjectId(reportId),
      companyId: new Types.ObjectId(companyId),
      status: EodStatus.SUBMITTED,
    });
    if (!report) throw new NotFoundException('Submitted report not found');

    const newStatus = dto.flag ? EodStatus.FLAGGED : EodStatus.REVIEWED;
    await this.eodModel.findByIdAndUpdate(reportId, {
      status: newStatus,
      reviewedBy: new Types.ObjectId(reviewerId),
      reviewedAt: new Date(),
      reviewerComments: dto.reviewerComments,
      rating: dto.rating,
    });

    const user = await this.userModel.findById(report.userId).lean();
    if (user) {
      await this.notifModel.create({
        companyId: new Types.ObjectId(companyId),
        userId: report.userId,
        title: 'EOD Report Reviewed',
        message: `Your EOD report for ${report.reportDate.toDateString()} has been reviewed. Rating: ${dto.rating}/5`,
        type: NotificationType.EOD_REVIEWED,
        referenceId: reportId,
      });
      const dateStr = report.reportDate.toDateString();
      await this.mailService.sendEodReviewed(
        user.email,
        user.firstName,
        dateStr,
        dto.rating,
        dto.reviewerComments || 'No comments',
      );
    }
    return { message: 'EOD reviewed successfully' };
  }

  async getPendingReviews(reviewerId: string, companyId: string, role: UserRole) {
    const profile = await this.profileModel
      .findOne({ userId: new Types.ObjectId(reviewerId), companyId: new Types.ObjectId(companyId) })
      .lean();
    let memberIds: Types.ObjectId[] = [];

    if (role === UserRole.TEAM_LEAD && profile?.teamId) {
      const members = await this.profileModel.find({ teamId: profile.teamId }).distinct('userId');
      memberIds = members;
    } else if (role === UserRole.DEPARTMENT_MANAGER && profile?.departmentId) {
      const members = await this.profileModel.find({ departmentId: profile.departmentId }).distinct('userId');
      memberIds = members;
    } else if (role === UserRole.ADMIN || role === UserRole.HR_MANAGER) {
      const members = await this.profileModel.find({ companyId: new Types.ObjectId(companyId) }).distinct('userId');
      memberIds = members;
    }

    const reports = await this.eodModel
      .find({
        companyId: new Types.ObjectId(companyId),
        userId: { $in: memberIds },
        status: EodStatus.SUBMITTED,
      })
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: 1 })
      .lean();
    return { message: 'Pending reviews', data: reports };
  }
}
