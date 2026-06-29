import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from '../../database/schemas/audit-log.schema';

export enum AuditAction {
  // Auth
  USER_LOGIN              = 'USER_LOGIN',
  USER_LOGOUT             = 'USER_LOGOUT',
  USER_LOGOUT_ALL         = 'USER_LOGOUT_ALL',
  USER_ACCOUNT_LOCKED     = 'USER_ACCOUNT_LOCKED',
  PASSWORD_CHANGED        = 'PASSWORD_CHANGED',
  PASSWORD_RESET          = 'PASSWORD_RESET',
  // Company
  COMPANY_SETTINGS_UPDATED = 'COMPANY_SETTINGS_UPDATED',
  COMPANY_PROFILE_UPDATED  = 'COMPANY_PROFILE_UPDATED',
  EMPLOYEE_ROLE_CHANGED    = 'EMPLOYEE_ROLE_CHANGED',
  EMPLOYEE_DEACTIVATED     = 'EMPLOYEE_DEACTIVATED',
  EMPLOYEE_ACTIVATED       = 'EMPLOYEE_ACTIVATED',
  INVITE_SENT              = 'INVITE_SENT',
  DEPARTMENT_CREATED       = 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED       = 'DEPARTMENT_UPDATED',
  DEPARTMENT_DELETED       = 'DEPARTMENT_DELETED',
  TEAM_CREATED             = 'TEAM_CREATED',
  TEAM_UPDATED             = 'TEAM_UPDATED',
  TEAM_DELETED             = 'TEAM_DELETED',
  // Leaves
  LEAVE_APPROVED           = 'LEAVE_APPROVED',
  LEAVE_REJECTED           = 'LEAVE_REJECTED',
  LEAVE_APPLIED            = 'LEAVE_APPLIED',
  LEAVE_CANCELLED          = 'LEAVE_CANCELLED',
  // EOD
  EOD_REVIEWED             = 'EOD_REVIEWED',
  EOD_FLAGGED              = 'EOD_FLAGGED',
  // Tasks
  TASK_CREATED             = 'TASK_CREATED',
  TASK_DELETED             = 'TASK_DELETED',
  TASK_STATUS_CHANGED      = 'TASK_STATUS_CHANGED',
  PROJECT_DELETED          = 'PROJECT_DELETED',
  // Super Admin
  COMPANY_DEACTIVATED      = 'COMPANY_DEACTIVATED',
  COMPANY_ACTIVATED        = 'COMPANY_ACTIVATED',
  SUBSCRIPTION_CHANGED     = 'SUBSCRIPTION_CHANGED',
  USER_BLOCKED             = 'USER_BLOCKED',
  USER_UNBLOCKED           = 'USER_UNBLOCKED',
}

export interface AuditLogPayload {
  userId:      string | Types.ObjectId;
  companyId?:  string | Types.ObjectId;
  action:      AuditAction;
  resource:    string;
  resourceId?: string | Types.ObjectId;
  oldValue?:   Record<string, unknown>;
  newValue?:   Record<string, unknown>;
  ipAddress?:  string;
  userAgent?:  string;
  metadata?:   Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async log(payload: AuditLogPayload): Promise<void> {
    try {
      await this.auditLogModel.create({
        userId:     payload.userId,
        companyId:  payload.companyId,
        action:     payload.action,
        resource:   payload.resource,
        resourceId: payload.resourceId?.toString(),
        oldValue:   payload.oldValue,
        newValue:   payload.newValue,
        ipAddress:  payload.ipAddress,
        userAgent:  payload.userAgent,
        metadata:   payload.metadata,
      });
    } catch (error) {
      // Audit log failure must NEVER crash the main operation
      this.logger.error(`Failed to write audit log: ${error.message}`, { payload, error });
    }
  }

  async getCompanyLogs(
    companyId: string,
    options: {
      page?:     number;
      limit?:    number;
      action?:   AuditAction;
      userId?:   string;
      resource?: string;
      from?:     Date;
      to?:       Date;
    } = {},
  ) {
    const { page = 1, limit = 50, action, userId, resource, from, to } = options;

    const filter: Record<string, unknown> = { companyId };
    if (action)   filter.action = action;
    if (userId)   filter.userId = userId;
    if (resource) filter.resource = resource;
    if (from || to) {
      filter.createdAt = {};
      if (from) (filter.createdAt as Record<string, unknown>)['$gte'] = from;
      if (to)   (filter.createdAt as Record<string, unknown>)['$lte'] = to;
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
