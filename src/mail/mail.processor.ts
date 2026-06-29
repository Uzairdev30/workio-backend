import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailJob } from './mail.service';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      secure: config.get<boolean>('SMTP_SECURE'),
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
    });
  }

  async process(job: Job<MailJob>): Promise<void> {
    const { to, subject, template, context } = job.data;
    try {
      const html = this.renderTemplate(template, context);
      await this.transporter.sendMail({
        from: `"${this.config.get('SMTP_FROM_NAME')}" <${this.config.get('SMTP_FROM_EMAIL')}>`,
        to, subject, html,
      });
      this.logger.log(`Email sent to ${to} [${template}]`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${msg}`);
      throw error;
    }
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    const templates: Record<string, string> = {
      'welcome': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><div style="text-align:center;margin-bottom:32px"><h1 style="color:#4F46E5;font-size:28px;margin:0">Workio</h1></div><h2 style="color:#111827;font-size:22px">Welcome, {{name}}!</h2><p style="color:#6B7280;line-height:1.6">You've successfully joined <strong>{{companyName}}</strong> on Workio. Start submitting your daily EOD reports and track your progress.</p><div style="text-align:center;margin-top:32px"><a href="#" style="background:#4F46E5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a></div></div></div>`,
      'verify-email': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#111827">Verify Your Email</h2><p style="color:#6B7280">Hi {{name}}, use this OTP to verify your email. It expires in 10 minutes.</p><div style="text-align:center;margin:32px 0"><div style="background:#F3F4F6;border-radius:12px;padding:24px;display:inline-block"><span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#4F46E5">{{otp}}</span></div></div><p style="color:#9CA3AF;font-size:14px;text-align:center">Never share this OTP with anyone.</p></div></div>`,
      'forgot-password': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#111827">Reset Password</h2><p style="color:#6B7280">Hi {{name}}, use this OTP to reset your password. It expires in 10 minutes.</p><div style="text-align:center;margin:32px 0"><div style="background:#FEF2F2;border-radius:12px;padding:24px;display:inline-block"><span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#EF4444">{{otp}}</span></div></div><p style="color:#9CA3AF;font-size:14px;text-align:center">If you didn't request this, ignore this email.</p></div></div>`,
      'invite': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#111827">You're Invited!</h2><p style="color:#6B7280">{{inviterName}} has invited you to join <strong>{{companyName}}</strong> on Workio as <strong>{{role}}</strong>.</p><div style="text-align:center;margin-top:32px"><a href="{{inviteLink}}" style="background:#4F46E5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Accept Invitation</a></div><p style="color:#9CA3AF;font-size:14px;text-align:center;margin-top:16px">This link expires in 48 hours.</p></div></div>`,
      'eod-reminder': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#F59E0B">&#9200; EOD Reminder</h2><p style="color:#6B7280">Hi {{name}}, don't forget to submit your End of Day report by <strong>{{deadline}}</strong> today.</p><div style="text-align:center;margin-top:32px"><a href="#" style="background:#4F46E5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600">Submit EOD Report</a></div></div></div>`,
      'eod-reviewed': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#10B981">&#10003; EOD Report Reviewed</h2><p style="color:#6B7280">Hi {{name}}, your EOD report for <strong>{{date}}</strong> has been reviewed.</p><p style="color:#6B7280"><strong>Rating:</strong> {{rating}}/5<br><strong>Comments:</strong> {{comments}}</p></div></div>`,
      'leave-approved': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#10B981">Leave Approved</h2><p style="color:#6B7280">Hi {{name}}, your {{leaveType}} leave from {{startDate}} to {{endDate}} has been approved.</p></div></div>`,
      'leave-rejected': `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background:#f9fafb"><div style="background:#fff;border-radius:12px;padding:40px"><h1 style="color:#4F46E5;text-align:center">Workio</h1><h2 style="color:#EF4444">Leave Rejected</h2><p style="color:#6B7280">Hi {{name}}, your {{leaveType}} leave from {{startDate}} to {{endDate}} has been rejected. <strong>Reason:</strong> {{note}}</p></div></div>`,
    };
    let html = templates[template] || `<p>Message for {{name}}</p>`;
    Object.entries(context).forEach(([key, val]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(val ?? ''));
    });
    return html;
  }
}
