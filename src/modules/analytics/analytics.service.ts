import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EodReport, EodReportDocument, EodStatus } from '../../database/schemas/eod-report.schema';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema';
import { Attendance, AttendanceDocument } from '../../database/schemas/attendance.schema';
import { Task, TaskDocument, TaskItemStatus } from '../../database/schemas/task.schema';
import { Leave, LeaveDocument, LeaveStatus } from '../../database/schemas/leave.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../database/schemas/employee-profile.schema';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(EodReport.name) private eodModel: Model<EodReportDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(EmployeeProfile.name) private profileModel: Model<EmployeeProfileDocument>,
    private redisService: RedisService,
  ) {}

  private async getCachedOrFetch<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.redisService.getJson<T>(key);
    if (cached) return cached;
    const data = await fetcher();
    await this.redisService.setJson(key, data, ttl);
    return data;
  }

  async getEmployeeDashboard(userId: string, companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6);

    const [todayEod, pendingTasks, streak, moodData, attendanceSummary] = await Promise.all([
      this.eodModel
        .findOne({
          userId: new Types.ObjectId(userId),
          companyId: new Types.ObjectId(companyId),
          reportDate: { $gte: today, $lte: todayEnd },
        })
        .lean(),
      this.taskModel.countDocuments({
        companyId: new Types.ObjectId(companyId),
        assignedTo: new Types.ObjectId(userId),
        status: { $in: [TaskItemStatus.TODO, TaskItemStatus.IN_PROGRESS] },
      }),
      this.redisService.get(`streak:${companyId}:${userId}`).then(s => parseInt(s || '0')),
      this.eodModel
        .find({
          userId: new Types.ObjectId(userId),
          companyId: new Types.ObjectId(companyId),
          reportDate: { $gte: weekStart },
          status: { $ne: EodStatus.DRAFT },
        })
        .select('mood reportDate')
        .lean(),
      this.attendanceModel
        .find({
          userId: new Types.ObjectId(userId),
          companyId: new Types.ObjectId(companyId),
          date: { $gte: weekStart, $lte: todayEnd },
        })
        .lean(),
    ]);

    return {
      message: 'Employee dashboard',
      data: {
        todayEodStatus: todayEod?.status || null,
        streak,
        pendingTasks,
        moodData,
        attendanceSummary,
      },
    };
  }

  async getManagerDashboard(userId: string, companyId: string, role: UserRole) {
    const cacheKey = `dashboard:manager:${companyId}:${userId}`;
    return this.getCachedOrFetch(cacheKey, 300, async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let memberIds: Types.ObjectId[] = [];

      if (role === UserRole.TEAM_LEAD) {
        const profile = await this.profileModel
          .findOne({ userId: new Types.ObjectId(userId), companyId: new Types.ObjectId(companyId) })
          .lean();
        if (profile?.teamId) {
          memberIds = await this.profileModel.find({ teamId: profile.teamId }).distinct('userId');
        }
      } else {
        memberIds = await this.profileModel
          .find({ companyId: new Types.ObjectId(companyId) })
          .distinct('userId');
      }

      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const [totalMembers, submittedToday, pendingReviews, moodDist] = await Promise.all([
        memberIds.length,
        this.eodModel.countDocuments({
          userId: { $in: memberIds },
          companyId: new Types.ObjectId(companyId),
          reportDate: { $gte: today, $lte: todayEnd },
          status: { $ne: EodStatus.DRAFT },
        }),
        this.eodModel.countDocuments({
          userId: { $in: memberIds },
          companyId: new Types.ObjectId(companyId),
          status: EodStatus.SUBMITTED,
        }),
        this.eodModel.aggregate([
          {
            $match: {
              userId: { $in: memberIds },
              companyId: new Types.ObjectId(companyId),
              reportDate: { $gte: new Date(Date.now() - 7 * 86400000) },
              status: { $ne: EodStatus.DRAFT },
            },
          },
          { $group: { _id: '$mood', count: { $sum: 1 } } },
        ]),
      ]);

      const submissionRate =
        totalMembers > 0 ? Math.round((submittedToday / totalMembers) * 100) : 0;
      return {
        message: 'Manager dashboard',
        data: {
          totalMembers,
          submittedToday,
          submissionRate,
          pendingReviews,
          moodDistribution: moodDist,
        },
      };
    });
  }

  async getAdminDashboard(companyId: string) {
    const cacheKey = `dashboard:admin:${companyId}`;
    return this.getCachedOrFetch(cacheKey, 300, async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [totalEmployees, todayEods, pendingLeaves, monthlyTrend] = await Promise.all([
        this.userModel.countDocuments({
          companyId: new Types.ObjectId(companyId),
          isActive: true,
          role: { $ne: UserRole.SUPER_ADMIN },
        }),
        this.eodModel.countDocuments({
          companyId: new Types.ObjectId(companyId),
          reportDate: { $gte: today, $lte: todayEnd },
          status: { $ne: EodStatus.DRAFT },
        }),
        this.leaveModel.countDocuments({
          companyId: new Types.ObjectId(companyId),
          status: LeaveStatus.PENDING,
        }),
        this.eodModel.aggregate([
          {
            $match: {
              companyId: new Types.ObjectId(companyId),
              reportDate: { $gte: monthStart },
              status: { $ne: EodStatus.DRAFT },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportDate' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      return {
        message: 'Admin dashboard',
        data: { totalEmployees, todayEods, pendingLeaves, monthlyTrend },
      };
    });
  }

  async getEodTrends(
    companyId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' = 'day',
  ) {
    const cacheKey = `trends:eod:${companyId}:${startDate}:${endDate}:${groupBy}`;
    return this.getCachedOrFetch(cacheKey, 300, async () => {
      const format = groupBy === 'week' ? '%Y-%W' : '%Y-%m-%d';
      const data = await this.eodModel.aggregate([
        {
          $match: {
            companyId: new Types.ObjectId(companyId),
            reportDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $ne: EodStatus.DRAFT },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format, date: '$reportDate' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            lateCount: { $sum: { $cond: ['$isLate', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return { message: 'EOD trends', data };
    });
  }

  async getMoodTrends(companyId: string, userId?: string) {
    const match: any = {
      companyId: new Types.ObjectId(companyId),
      status: { $ne: EodStatus.DRAFT },
      reportDate: { $gte: new Date(Date.now() - 30 * 86400000) },
    };
    if (userId) match.userId = new Types.ObjectId(userId);

    const data = await this.eodModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$reportDate' } },
            mood: '$mood',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);
    return { message: 'Mood trends', data };
  }

  async getLeaderboard(companyId: string) {
    const employees = await this.profileModel
      .find({ companyId: new Types.ObjectId(companyId), isActive: true })
      .lean();

    const leaderboard = await Promise.all(
      employees.slice(0, 20).map(async emp => {
        const streak = parseInt(
          (await this.redisService.get(`streak:${companyId}:${emp.userId}`)) || '0',
        );
        const avgRating = await this.eodModel.aggregate([
          {
            $match: {
              userId: emp.userId,
              companyId: new Types.ObjectId(companyId),
              rating: { $ne: null },
            },
          },
          { $group: { _id: null, avg: { $avg: '$rating' } } },
        ]);
        const user = await this.userModel
          .findById(emp.userId)
          .select('firstName lastName')
          .lean();
        return {
          userId: emp.userId,
          name: `${user?.firstName} ${user?.lastName}`,
          streak,
          avgRating: avgRating[0]?.avg || 0,
        };
      }),
    );

    leaderboard.sort((a, b) => b.streak - a.streak || b.avgRating - a.avgRating);
    return { message: 'Leaderboard', data: leaderboard };
  }
}
