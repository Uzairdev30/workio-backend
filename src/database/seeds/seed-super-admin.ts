/**
 * Super Admin Seeder
 * Run: npx ts-node -r tsconfig-paths/register src/database/seeds/seed-super-admin.ts
 */

import * as mongoose from 'mongoose';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI!;

/* ── Super Admin credentials ─────────────────────────── */
const SUPER_ADMIN = {
  firstName:       'Super',
  lastName:        'Admin',
  email:           'superadmin@workio.com',
  password:        'SuperAdmin@123',
  role:            'super_admin',
  isEmailVerified: true,
  isActive:        true,
  isBlocked:       false,
  companyId:       null,
};

/* ── Minimal User schema for the seed ───────────────── */
const UserSchema = new mongoose.Schema(
  {
    companyId:           { type: mongoose.Schema.Types.ObjectId, default: null },
    role:                { type: String, required: true },
    firstName:           { type: String, required: true },
    lastName:            { type: String, required: true },
    email:               { type: String, required: true, unique: true, lowercase: true },
    passwordHash:        { type: String, required: true },
    avatar:              { type: String, default: null },
    phone:               { type: String, default: null },
    isEmailVerified:     { type: Boolean, default: false },
    isActive:            { type: Boolean, default: true },
    isBlocked:           { type: Boolean, default: false },
    lastLoginAt:         { type: Date, default: null },
    passwordChangedAt:   { type: Date, default: null },
    refreshTokenHash:    { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil:           { type: Date, default: null },
    deletedAt:           { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const User = mongoose.models['User'] ?? mongoose.model('User', UserSchema);

  /* Check if super admin already exists */
  const existing = await User.findOne({ email: SUPER_ADMIN.email }).lean();
  if (existing) {
    console.log(`ℹ️  Super admin already exists → ${SUPER_ADMIN.email}`);
    console.log('   No changes made.\n');
    await mongoose.disconnect();
    return;
  }

  /* Hash the password */
  console.log('🔐 Hashing password...');
  const passwordHash = await argon2.hash(SUPER_ADMIN.password);

  /* Create the super admin */
  const superAdmin = await User.create({
    companyId:       null,
    role:            SUPER_ADMIN.role,
    firstName:       SUPER_ADMIN.firstName,
    lastName:        SUPER_ADMIN.lastName,
    email:           SUPER_ADMIN.email,
    passwordHash,
    isEmailVerified: SUPER_ADMIN.isEmailVerified,
    isActive:        SUPER_ADMIN.isActive,
    isBlocked:       SUPER_ADMIN.isBlocked,
  });

  console.log('');
  console.log('✅ Super Admin created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   ID       : ${superAdmin._id}`);
  console.log(`   Name     : ${SUPER_ADMIN.firstName} ${SUPER_ADMIN.lastName}`);
  console.log(`   Email    : ${SUPER_ADMIN.email}`);
  console.log(`   Password : ${SUPER_ADMIN.password}`);
  console.log(`   Role     : ${SUPER_ADMIN.role}`);
  console.log('─────────────────────────────────────');
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 Disconnected.\n');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
