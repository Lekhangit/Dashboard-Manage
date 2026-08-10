/**
 * Local preview seed: import the BIM workbook into the DashboardManage_bim
 * database (separate from production DashboardManage). Run once so `npm run dev`
 * (with .env MONGODB_URI -> DashboardManage_bim) shows populated BIM data.
 */
import fs from 'fs';
import mongoose from 'mongoose';
import { importTemplate } from '../src/services/templateImportService';
import {
  ProjectModel, EmployeeModel, ContractModel, IpcModel, BudgetItemModel, IssueModel, TodoModel,
} from '../src/models';

function uri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const src = fs.readFileSync('src/database/index.ts', 'utf8');
  const m = src.match(/'(mongodb(?:\+srv)?:\/\/[^']+)'/);
  if (!m) throw new Error('Could not find base MONGODB_URI');
  return m[1].replace('/DashboardManage?', '/DashboardManage_bim?');
}

(async () => {
  await mongoose.connect(uri(), { dbName: 'DashboardManage_bim' });
  const stats = await importTemplate('public/TPL Project Management BIM (1).xlsx', 'TPL Project Management BIM (1).xlsx', 'local-seed');
  console.log('imported:', JSON.stringify(stats));
  console.log('counts:', JSON.stringify({
    projects: await ProjectModel.countDocuments(),
    employees: await EmployeeModel.countDocuments(),
    contracts: await ContractModel.countDocuments(),
    ipc: await IpcModel.countDocuments(),
    budget: await BudgetItemModel.countDocuments(),
    issues: await IssueModel.countDocuments(),
    todos: await TodoModel.countDocuments(),
  }));
  await mongoose.disconnect();
  console.log('done — DashboardManage_bim seeded');
})().catch((e) => { console.error(e); process.exit(1); });
