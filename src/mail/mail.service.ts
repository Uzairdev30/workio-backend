import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export interface MailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async sendMail(job: MailJob): Promise<void> {
    await this.mailQueue.add('send-mail', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async sendWelcome(to: string, name: string, companyName: string) {
    await this.sendMail({ to, subject: `Welcome to Workio — ${companyName}`, template: 'welcome', context: { name, companyName } });
  }

  async sendVerifyEmail(to: string, name: string, otp: string) {
    await this.sendMail({ to, subject: 'Verify Your Email — Workio', template: 'verify-email', context: { name, otp } });
  }

  async sendForgotPassword(to: string, name: string, otp: string) {
    await this.sendMail({ to, subject: 'Reset Your Password — Workio', template: 'forgot-password', context: { name, otp } });
  }

  async sendInvite(to: string, inviterName: string, companyName: string, inviteLink: string, role: string) {
    await this.sendMail({ to, subject: `You're invited to join ${companyName} on Workio`, template: 'invite', context: { inviterName, companyName, inviteLink, role } });
  }

  async sendWelcomeCredentials(to: string, name: string, companyName: string, password: string, loginUrl: string) {
    await this.sendMail({
      to,
      subject: `Welcome to ${companyName} — Your Workio Login Credentials`,
      template: 'welcome-credentials',
      context: { name, companyName, email: to, password, loginUrl },
    });
  }

  async sendEodReminder(to: string, name: string, deadline: string) {
    await this.sendMail({ to, subject: 'Reminder: Submit your EOD Report', template: 'eod-reminder', context: { name, deadline } });
  }

  async sendEodReviewed(to: string, name: string, date: string, rating: number, comments: string) {
    await this.sendMail({ to, subject: 'Your EOD Report has been reviewed', template: 'eod-reviewed', context: { name, date, rating, comments } });
  }

  async sendLeaveStatus(to: string, name: string, status: string, leaveType: string, startDate: string, endDate: string, note?: string) {
    const subject = status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
    await this.sendMail({ to, subject, template: `leave-${status}`, context: { name, leaveType, startDate, endDate, note } });
  }

  async sendWeeklyDigest(to: string, firstName: string, companyName: string, weekOf: string, stats: { totalSubmitted: number; avgMood: number; lateCount: number }) {
    await this.sendMail({
      to,
      subject: `Workio Weekly Digest — ${companyName}`,
      template: 'weekly-digest',
      context: { firstName, companyName, weekOf, ...stats },
    });
  }
}
