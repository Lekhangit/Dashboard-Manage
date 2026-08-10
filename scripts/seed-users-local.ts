/** Seed preview accounts into DashboardManage_bim (local preview only). */
import fs from 'fs';
import mongoose from 'mongoose';
import { UserModel } from '../src/models';
import { hashPassword } from '../src/services/authService';

function uri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const src = fs.readFileSync('src/database/index.ts', 'utf8');
  const m = src.match(/'(mongodb(?:\+srv)?:\/\/[^']+)'/)!;
  return m[1].replace('/DashboardManage?', '/DashboardManage_bim?');
}

const ACCOUNTS = [
  { username: 'admin', fullName: 'Quản trị viên', role: 'admin', permissions: ['view_compensation'] },
  { username: 'dovietphuong', fullName: 'Đỗ Việt Phương', role: 'gddh', permissions: ['view_compensation'] },
  { username: 'cht01', fullName: 'Chỉ huy trưởng', role: 'cht', permissions: [] },
];

(async () => {
  await mongoose.connect(uri(), { dbName: 'DashboardManage_bim' });
  for (const a of ACCOUNTS) {
    const { salt, hash } = hashPassword('admin123');
    await UserModel.updateOne(
      { username: a.username },
      { $set: { ...a, salt, hash, active: true } },
      { upsert: true },
    );
  }
  const users = await UserModel.find({}).lean();
  console.log('users:', users.map((u: any) => `${u.username}:${u.role}`).join(', '));
  await mongoose.disconnect();
  console.log('done — all passwords: admin123');
})().catch((e) => { console.error(e); process.exit(1); });
