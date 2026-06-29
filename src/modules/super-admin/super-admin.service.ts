import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument, SubscriptionPlan } from '../../database/schemas/company.schema';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema';
import { EodReport, EodReportDocument, EodStatus } from '../../database/schemas/eod-report.schema';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { TokenService } from '../auth/services/token.service';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(EodReport.name) private eodModel: Model<EodReportDocument>,
    private tokenService: TokenService,
  ) {}

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async getCompanies(query: PaginationDto & { search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const filter: any = {};
    if (search) {
      const s = this.escapeRegex(search);
      filter.$or = [{ name: { $regex: s, $options: 'i' } }, { slug: { $regex: s, $options: 'i' } }];
    }
    if (status) filter.isActive = status === 'active';

    const [data, total] = await Promise.all([
      this.companyModel.find(filter).populate('ownerId', 'firstName lastName email').skip((page - 1) * limit).limit(limit).lean(),
      this.companyModel.countDocuments(filter),
    ]);
    return { message: 'Companies fetched', data: paginate(data, total, page, limit) };
  }

  async getCompanyById(id: string) {
    const company = await this.companyModel.findById(id).populate('ownerId', 'firstName lastName email').lean();
    if (!company) throw new NotFoundException('Company not found');
    const employeeCount = await this.userModel.countDocuments({ companyId: new Types.ObjectId(id), isActive: true });
    const eodCount = await this.eodModel.countDocuments({ companyId: new Types.ObjectId(id) });
    return { message: 'Company details', data: { ...company, stats: { employeeCount, eodCount } } };
  }

  async toggleCompanyStatus(id: string, isActive: boolean) {
    await this.companyModel.findByIdAndUpdate(id, { isActive });
    return { message: `Company ${isActive ? 'activated' : 'deactivated'}` };
  }

  async updateSubscription(id: string, plan: SubscriptionPlan) {
    await this.companyModel.findByIdAndUpdate(id, { subscriptionPlan: plan });
    return { message: 'Subscription updated' };
  }

  async getAllUsers(query: PaginationDto & { search?: string; role?: string }) {
    const { page = 1, limit = 20, search, role } = query;
    const filter: any = { role: { $ne: UserRole.SUPER_ADMIN } };
    if (search) {
      const s = this.escapeRegex(search);
      filter.$or = [{ firstName: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }
    if (role) filter.role = role;

    const [data, total] = await Promise.all([
      this.userModel.find(filter).select('-passwordHash').skip((page - 1) * limit).limit(limit).lean(),
      this.userModel.countDocuments(filter),
    ]);
    return { message: 'Users fetched', data: paginate(data, total, page, limit) };
  }

  async toggleUserBlock(id: string, isBlocked: boolean) {
    await this.userModel.findByIdAndUpdate(id, { isBlocked });
    return { message: `User ${isBlocked ? 'blocked' : 'unblocked'}` };
  }

  async impersonate(_adminId: string, targetUserId: string) {
    const user = await this.userModel.findById(targetUserId).lean();
    if (!user) throw new NotFoundException('User not found');
    const accessToken = this.tokenService.generateAccessToken({ sub: user._id.toString(), companyId: user.companyId?.toString() || null, role: user.role, email: user.email });
    return { message: 'Impersonation token generated', data: { accessToken, user: { id: user._id, email: user.email, role: user.role } } };
  }

  async getPlatformStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalCompanies, activeCompanies, totalUsers, todayEods, totalEods] = await Promise.all([
      this.companyModel.countDocuments(),
      this.companyModel.countDocuments({ isActive: true }),
      this.userModel.countDocuments({ role: { $ne: UserRole.SUPER_ADMIN } }),
      this.eodModel.countDocuments({ submittedAt: { $gte: today }, status: { $ne: EodStatus.DRAFT } } as any),
      this.eodModel.countDocuments({ status: { $ne: EodStatus.DRAFT } } as any),
    ]);
    return { message: 'Platform stats', data: { totalCompanies, activeCompanies, totalUsers, todayEods, totalEods } };
  }
}
