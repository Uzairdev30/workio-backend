import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import { Company, CompanyDocument } from '../../database/schemas/company.schema';
import { User, UserDocument, UserRole } from '../../database/schemas/user.schema';
import { Department, DepartmentDocument } from '../../database/schemas/department.schema';
import { Team, TeamDocument } from '../../database/schemas/team.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../database/schemas/employee-profile.schema';
import { CustomRole, CustomRoleDocument } from '../../database/schemas/custom-role.schema';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { InviteUserDto, AcceptInviteDto, UpdateCompanyDto, UpdateCompanySettingsDto, CreateDepartmentDto, UpdateDepartmentDto, CreateTeamDto, UpdateTeamDto } from './dto/company.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(EmployeeProfile.name) private profileModel: Model<EmployeeProfileDocument>,
    @InjectModel(CustomRole.name) private roleModel: Model<CustomRoleDocument>,
    private redisService: RedisService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async getProfile(companyId: string) {
    const company = await this.companyModel.findById(companyId).populate('ownerId', 'firstName lastName email').lean();
    if (!company) throw new NotFoundException('Company not found');
    return { message: 'Company profile', data: company };
  }

  async updateProfile(companyId: string, dto: UpdateCompanyDto) {
    const company = await this.companyModel.findByIdAndUpdate(companyId, dto, { new: true }).lean();
    return { message: 'Company updated', data: company };
  }

  async getSettings(companyId: string) {
    const company = await this.companyModel.findById(companyId).select('settings').lean();
    return { message: 'Settings fetched', data: company?.settings };
  }

  async updateSettings(companyId: string, dto: UpdateCompanySettingsDto) {
    const update = Object.fromEntries(Object.entries(dto).filter(([_, v]) => v !== undefined).map(([k, v]) => [`settings.${k}`, v]));
    await this.companyModel.findByIdAndUpdate(companyId, { $set: update });
    return { message: 'Settings updated' };
  }

  async inviteUser(companyId: string, inviterId: string, dto: InviteUserDto) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new BadRequestException('Email already registered');

    const inviter = await this.userModel.findById(inviterId).lean();
    const company = await this.companyModel.findById(companyId).lean();

    const token = uuidv4();
    const inviteData = { email: dto.email, role: dto.role, companyId, departmentId: dto.departmentId, teamId: dto.teamId, invitedBy: inviterId };
    await this.redisService.setJson(`invite:${token}`, inviteData, 48 * 3600);

    const appUrl = this.config.get('APP_URL');
    const inviteLink = `${appUrl}/accept-invite/${token}`;
    await this.mailService.sendInvite(dto.email, `${inviter?.firstName} ${inviter?.lastName}`, company?.name || 'Company', inviteLink, dto.role);

    return { message: 'Invitation sent', data: { token } };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const inviteData = await this.redisService.getJson<any>(`invite:${dto.token}`);
    if (!inviteData) throw new BadRequestException('Invalid or expired invitation');

    const existing = await this.userModel.findOne({ email: inviteData.email.toLowerCase() });
    if (existing) throw new BadRequestException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const empCount = await this.userModel.countDocuments({ companyId: new Types.ObjectId(inviteData.companyId) });

    const user = await this.userModel.create({
      companyId: new Types.ObjectId(inviteData.companyId),
      role: inviteData.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: inviteData.email.toLowerCase(),
      passwordHash,
      isEmailVerified: true,
    });

    await this.profileModel.create({
      userId: user._id,
      companyId: new Types.ObjectId(inviteData.companyId),
      departmentId: inviteData.departmentId ? new Types.ObjectId(inviteData.departmentId) : undefined,
      teamId: inviteData.teamId ? new Types.ObjectId(inviteData.teamId) : undefined,
      employeeId: `EMP-${String(empCount + 1).padStart(3, '0')}`,
    });

    await this.redisService.del(`invite:${dto.token}`);
    return { message: 'Account created successfully. Please login.', data: { email: user.email } };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async getEmployees(companyId: string, query: PaginationDto & { search?: string; role?: string }) {
    const { page = 1, limit = 20, search, role } = query;
    const filter: any = { companyId: new Types.ObjectId(companyId), isActive: true, role: { $ne: UserRole.SUPER_ADMIN } };
    if (search) {
      const s = this.escapeRegex(search);
      filter.$or = [{ firstName: { $regex: s, $options: 'i' } }, { lastName: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }
    if (role) filter.role = role;

    const [data, total] = await Promise.all([
      this.userModel.find(filter).select('-passwordHash -refreshTokenHash').skip((page - 1) * limit).limit(limit).lean(),
      this.userModel.countDocuments(filter),
    ]);
    return { message: 'Employees fetched', data: paginate(data, total, page, limit) };
  }

  async updateEmployeeRole(companyId: string, employeeId: string, role: UserRole) {
    await this.userModel.findOneAndUpdate({ _id: new Types.ObjectId(employeeId), companyId: new Types.ObjectId(companyId) }, { role });
    return { message: 'Role updated' };
  }

  async deactivateEmployee(companyId: string, employeeId: string) {
    await this.userModel.findOneAndUpdate({ _id: new Types.ObjectId(employeeId), companyId: new Types.ObjectId(companyId) }, { isActive: false });
    return { message: 'Employee deactivated' };
  }

  async getEmployeeById(companyId: string, employeeId: string) {
    const employee = await this.userModel.findOne({ _id: new Types.ObjectId(employeeId), companyId: new Types.ObjectId(companyId) })
      .select('-password -refreshTokens')
      .lean();
    if (!employee) throw new NotFoundException('Employee not found');
    return { message: 'Employee fetched', data: employee };
  }

  async createDepartment(companyId: string, dto: CreateDepartmentDto) {
    const dept = await this.deptModel.create({ companyId: new Types.ObjectId(companyId), ...dto, managerId: dto.managerId ? new Types.ObjectId(dto.managerId) : undefined });
    return { message: 'Department created', data: dept };
  }

  async getDepartments(companyId: string) {
    const depts = await this.deptModel.find({ companyId: new Types.ObjectId(companyId), isActive: true }).populate('managerId', 'firstName lastName email').lean();
    return { message: 'Departments fetched', data: depts };
  }

  async updateDepartment(companyId: string, deptId: string, dto: UpdateDepartmentDto) {
    const dept = await this.deptModel.findOneAndUpdate({ _id: new Types.ObjectId(deptId), companyId: new Types.ObjectId(companyId) }, dto, { new: true }).lean();
    if (!dept) throw new NotFoundException('Department not found');
    return { message: 'Department updated', data: dept };
  }

  async deleteDepartment(companyId: string, deptId: string) {
    await this.deptModel.findOneAndUpdate({ _id: new Types.ObjectId(deptId), companyId: new Types.ObjectId(companyId) }, { isActive: false });
    return { message: 'Department deleted' };
  }

  async createTeam(companyId: string, dto: CreateTeamDto) {
    const team = await this.teamModel.create({ companyId: new Types.ObjectId(companyId), ...dto, departmentId: new Types.ObjectId(dto.departmentId), leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined });
    return { message: 'Team created', data: team };
  }

  async getTeams(companyId: string) {
    const teams = await this.teamModel.find({ companyId: new Types.ObjectId(companyId), isActive: true }).populate('leadId', 'firstName lastName email').populate('departmentId', 'name code').lean();
    return { message: 'Teams fetched', data: teams };
  }

  async updateTeam(companyId: string, teamId: string, dto: UpdateTeamDto) {
    const team = await this.teamModel.findOneAndUpdate({ _id: new Types.ObjectId(teamId), companyId: new Types.ObjectId(companyId) }, dto, { new: true }).lean();
    if (!team) throw new NotFoundException('Team not found');
    return { message: 'Team updated', data: team };
  }

  async deleteTeam(companyId: string, teamId: string) {
    await this.teamModel.findOneAndUpdate({ _id: new Types.ObjectId(teamId), companyId: new Types.ObjectId(companyId) }, { isActive: false });
    return { message: 'Team deleted' };
  }

  /* ─── Custom Roles ─── */
  async getRoles(companyId: string) {
    const roles = await this.roleModel.find({ companyId: new Types.ObjectId(companyId) }).lean();
    return { message: 'Roles fetched', data: roles };
  }

  async createRole(companyId: string, dto: { name: string; description?: string; permissions?: string[] }) {
    const role = await this.roleModel.create({ companyId: new Types.ObjectId(companyId), ...dto });
    return { message: 'Role created', data: role };
  }

  async updateRole(companyId: string, roleId: string, dto: { name?: string; description?: string; permissions?: string[] }) {
    const role = await this.roleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(roleId), companyId: new Types.ObjectId(companyId) },
      dto, { new: true }
    ).lean();
    if (!role) throw new NotFoundException('Role not found');
    return { message: 'Role updated', data: role };
  }

  async deleteRole(companyId: string, roleId: string) {
    await this.roleModel.findOneAndDelete({ _id: new Types.ObjectId(roleId), companyId: new Types.ObjectId(companyId) });
    return { message: 'Role deleted' };
  }
}
