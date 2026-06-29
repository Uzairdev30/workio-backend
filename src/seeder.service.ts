import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User, UserDocument, UserRole } from './database/schemas/user.schema';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    /* Only ever create ONE super admin — if one already exists, skip */
    const existingCount = await this.userModel.countDocuments({ role: UserRole.SUPER_ADMIN });
    if (existingCount > 0) {
      this.logger.log(`Super admin already exists (${existingCount}). Skipping seed.`);
      return;
    }

    const email    = this.config.get<string>('SUPER_ADMIN_EMAIL')    || 'superadmin@workio.app';
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD') || 'Workio@SuperAdmin2025!';
    const firstName = this.config.get<string>('SUPER_ADMIN_FIRST_NAME') || 'Super';
    const lastName  = this.config.get<string>('SUPER_ADMIN_LAST_NAME')  || 'Admin';

    const exists = await this.userModel.findOne({ email: email.toLowerCase() });
    if (exists) {
      /* email exists but not as super admin — update role */
      await this.userModel.findByIdAndUpdate(exists._id, { role: UserRole.SUPER_ADMIN });
      this.logger.warn(`Existing user ${email} promoted to super_admin`);
      return;
    }

    const passwordHash = await argon2.hash(password);
    await this.userModel.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
      companyId: null,
    });

    this.logger.log(`✅ Super admin seeded: ${email}`);
  }
}
