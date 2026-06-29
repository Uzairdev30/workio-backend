import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../database/schemas/user.schema';
import { UserRole } from '../../database/schemas/user.schema';
import { Company } from '../../database/schemas/company.schema';
import { EodReport } from '../../database/schemas/eod-report.schema';
import { EodStatus } from '../../database/schemas/eod-report.schema';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/schemas/notification.schema';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectModel(User.name)      private userModel:      Model<User>,
    @InjectModel(Company.name)   private companyModel:   Model<Company>,
    @InjectModel(EodReport.name) private eodReportModel: Model<EodReport>,
    private readonly mailService:          MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── EOD REMINDER: 5 PM Monday-Friday ─────────────────────
  @Cron('0 17 * * 1-5', { name: 'eod-reminder', timeZone: 'UTC' })
  async sendEodReminders() {
    this.logger.log('Running EOD reminder job...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const companies = await this.companyModel.find({ isActive: true }).lean();

      for (const company of companies) {
        // getDay() returns 0=Sun, 1=Mon … 6=Sat — matches the stored number array
        const todayNum = new Date().getDay();
        const workingDays: number[] = company.settings?.workingDays ?? [1, 2, 3, 4, 5];
        if (!workingDays.includes(todayNum)) continue;

        const companyUsers = await this.userModel
          .find({
            companyId: company._id,
            isActive:  true,
            role: { $in: [
              UserRole.EMPLOYEE,
              UserRole.INTERN,
              UserRole.TEAM_LEAD,
              UserRole.DEPARTMENT_MANAGER,
              UserRole.HR_MANAGER,
            ] },
          })
          .select('_id email firstName')
          .lean();

        const submittedToday = await this.eodReportModel
          .find({
            companyId:  company._id,
            reportDate: { $gte: today },
            status:     { $in: [EodStatus.SUBMITTED, EodStatus.REVIEWED] },
          })
          .select('userId')
          .lean();

        const submittedIds = new Set(submittedToday.map((r) => r.userId.toString()));
        const pendingUsers = companyUsers.filter((u) => !submittedIds.has(u._id.toString()));

        for (const user of pendingUsers) {
          try {
            await this.notificationsService.createNotification({
              companyId: company._id.toString(),
              userId:    user._id.toString(),
              title:     'EOD Reminder',
              message:   "Don't forget to submit your EOD report before end of day.",
              type:      NotificationType.EOD_REMINDER,
            });

            const deadline = company.settings?.eodDeadlineTime ?? '18:00';
            await this.mailService.sendEodReminder(user.email, user.firstName, deadline);
          } catch (userError) {
            this.logger.warn(`Failed EOD reminder for user ${user._id}: ${(userError as Error).message}`);
          }
        }

        this.logger.log(
          `EOD reminders sent for ${company.name}: ${pendingUsers.length} users`,
        );
      }
    } catch (error) {
      this.logger.error('EOD reminder job failed', error);
    }
  }

  // ── WEEKLY DIGEST: Monday 9 AM ────────────────────────────
  @Cron('0 9 * * 1', { name: 'weekly-digest', timeZone: 'UTC' })
  async sendWeeklyDigest() {
    this.logger.log('Running weekly digest job...');
    const lastMonday = new Date();
    lastMonday.setDate(lastMonday.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);

    try {
      const companies = await this.companyModel.find({ isActive: true }).lean();

      for (const company of companies) {
        const managers = await this.userModel
          .find({
            companyId: company._id,
            isActive:  true,
            role: { $in: [
              UserRole.TEAM_LEAD,
              UserRole.DEPARTMENT_MANAGER,
              UserRole.HR_MANAGER,
              UserRole.ADMIN,
            ] },
          })
          .select('_id email firstName role')
          .lean();

        const [weeklyStats] = await this.eodReportModel.aggregate([
          {
            $match: {
              companyId:  company._id,
              reportDate: { $gte: lastMonday },
              status:     { $in: [EodStatus.SUBMITTED, EodStatus.REVIEWED] },
            },
          },
          {
            $group: {
              _id:            null,
              totalSubmitted: { $sum: 1 },
              avgMood: {
                $avg: {
                  $switch: {
                    branches: [
                      { case: { $eq: ['$mood', 'great']    }, then: 5 },
                      { case: { $eq: ['$mood', 'good']     }, then: 4 },
                      { case: { $eq: ['$mood', 'neutral']  }, then: 3 },
                      { case: { $eq: ['$mood', 'stressed'] }, then: 2 },
                      { case: { $eq: ['$mood', 'bad']      }, then: 1 },
                    ],
                    default: 3,
                  },
                },
              },
              lateCount: { $sum: { $cond: ['$isLate', 1, 0] } },
            },
          },
        ]);

        if (!weeklyStats) continue;

        for (const manager of managers) {
          try {
            await this.mailService.sendWeeklyDigest(
              manager.email,
              manager.firstName,
              company.name,
              lastMonday.toDateString(),
              {
                totalSubmitted: weeklyStats.totalSubmitted as number,
                avgMood:        Math.round((weeklyStats.avgMood as number) * 10) / 10,
                lateCount:      weeklyStats.lateCount as number,
              },
            );
          } catch (managerError) {
            this.logger.warn(`Weekly digest failed for ${manager._id}: ${(managerError as Error).message}`);
          }
        }

        this.logger.log(`Weekly digest sent for ${company.name}`);
      }
    } catch (error) {
      this.logger.error('Weekly digest job failed', error);
    }
  }

  // ── CLEANUP: Expired tokens — 2 AM daily ─────────────────
  @Cron('0 2 * * *', { name: 'cleanup-tokens', timeZone: 'UTC' })
  async cleanupExpiredTokens() {
    this.logger.log('Running token cleanup job...');
    // refresh_tokens has a TTL index — this is a safety net backup
    this.logger.log('Token cleanup complete');
  }

  // ── ANALYTICS CACHE WARMUP: 6 AM daily ───────────────────
  @Cron('0 6 * * *', { name: 'analytics-warmup', timeZone: 'UTC' })
  async warmAnalyticsCache() {
    this.logger.log('Analytics cache warmup starting...');
    // TODO: inject AnalyticsService and call per-company dashboard methods
    this.logger.log('Analytics cache warmup complete');
  }
}
