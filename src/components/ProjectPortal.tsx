/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Employee, Contract, Issue, CashFlowMonth, Milestone } from '../types';
import { ProgressRing, LineAreaChart } from './Charts';
import { Calendar, User, DollarSign, ArrowUpRight, ArrowDownRight, Briefcase, FileText, CheckCircle, ShieldAlert, Plus, Layers, Paperclip } from 'lucide-react';
export interface DetailedCashFlowMonth {
  month: string;
  planVolume: number;
  planMaterial: number;
  planLabor: number;
  planMachine: number;
  planOverhead: number;
  actualVolume: number;
  actualMaterial: number;
  actualLabor: number;
  actualMachine: number;
  actualOverhead: number;
  deviation: number;
}
export interface DetailedContractRow {
  id: string;
  name: string;
  contractor: string;
  type: string;
  value: number;
  startDate: string;
  endDate: string;
  paymentStatus: number;
  quality: string;
}
export interface DetailedIssueRow {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  owner: string;
  createdAt: string;
  targetDate: string;
}

interface ProjectPortalProps {
  project: Project;
  team: Employee[];
  contracts: Contract[];
  issues: Issue[];
  cashflow: CashFlowMonth[];
  detailedCashflow?: { params?: any; planned?: any[]; actual?: any[] } | null;
  milestones: Milestone[];
  onAddIssueClick: () => void;
  onViewIssueClick: (issue: Issue) => void;
}

export const ProjectPortal: React.FC<ProjectPortalProps> = ({
  project,
  team,
  contracts,
  issues,
  cashflow,
  detailedCashflow,
  milestones,
  onAddIssueClick,
  onViewIssueClick
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'contracts' | 'issues' | 'team' | 'milestones'>('overview');
  const [cashflowMode, setCashflowMode] = useState<'plan' | 'actual'>('plan');

  // Format currency
  const formatVND = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const formatVNDShort = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' tỷ đ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' triệu đ';
    return val.toLocaleString() + ' đ';
  };

  // Cash flow helper calculations
  const totalPlannedIn = cashflow.reduce((sum, m) => sum + m.plannedIn, 0);
  const totalPlannedOut = cashflow.reduce((sum, m) => sum + m.plannedOut, 0);
  const totalActualIn = cashflow.reduce((sum, m) => sum + m.actualIn, 0);
  const totalActualOut = cashflow.reduce((sum, m) => sum + m.actualOut, 0);

  // Filter issues for this project
  const projectIssues = issues.filter(i => i.projectId === project.id);
  const openIssuesCount = projectIssues.filter(i => i.status !== 'Closed').length;

  return (
    <div className="space-y-6">
      {/* Project Header Banner (Sleek Interface) */}
      <div className="bg-[#111827] text-white rounded-xl p-6 shadow-sm border border-[#1F2937] relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-5 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 L100,0 L100,100 Z" fill="white" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950/55 px-2.5 py-1 rounded border border-blue-900/30 font-mono">
                Mã dự án: {project.id.toUpperCase()}
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                project.status === 'On Track' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                project.status === 'Completed' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' :
                project.status === 'At Risk' ? 'bg-amber-950 text-amber-400 border border-amber-900/40' : 'bg-rose-950 text-rose-400 border border-rose-900/40'
              }`}>
                {project.status === 'On Track' ? 'Đang thực thi' :
                 project.status === 'Completed' ? 'Đã hoàn thành' :
                 project.status === 'At Risk' ? 'Cảnh báo rủi ro' : 'Chậm tiến độ'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-100 leading-tight">{project.fullName}</h2>
            <p className="text-slate-400 text-xs font-semibold flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Chỉ huy trưởng: <b className="text-slate-200">{project.manager}</b>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Thời gian: <b className="text-slate-200">{project.startDate} đến {project.endDate}</b>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#1F2937]/50 p-4 rounded-xl border border-[#2D3748]/20">
            <ProgressRing
              progress={project.progressActual}
              size={64}
              strokeWidth={7}
              colorClass={project.status === 'At Risk' ? 'stroke-amber-500' : project.status === 'Delayed' ? 'stroke-rose-500' : 'stroke-emerald-400'}
            />
            <div className="text-xs font-semibold">
              <span className="block text-slate-400 text-[10px] uppercase">Tiến độ lũy kế</span>
              <span className="block text-lg font-black text-white font-mono mt-0.5">{project.progressActual}%</span>
              <span className="block text-[10px] text-slate-400">Kế hoạch: {project.progressPlanned}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E5E7EB] overflow-x-auto gap-2 scrollbar-none">
        {[
          { key: 'overview', label: 'Tổng Quan' },
          { key: 'cashflow', label: 'Kế Hoạch Dòng Tiền' },
          { key: 'contracts', label: 'Hợp Đồng & Phụ Lục' },
          { key: 'issues', label: `Các Vấn Đề (${projectIssues.length})` },
          { key: 'team', label: `Ban Điều Hành (${team.length})` },
          { key: 'milestones', label: 'Milestone' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Stats Column (Left) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ngân Sách Được Giao</span>
                <p className="text-lg font-black text-blue-600 font-mono">{formatVND(project.budget)}</p>
                <span className="block text-[10px] text-slate-400">Doanh thu dự án: {formatVNDShort(project.revenue)}</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đã Sử Dụng (Commited)</span>
                <p className="text-lg font-black text-slate-800 font-mono">{formatVND(project.spent)}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tỷ lệ giải ngân:</span>
                  <span className="font-bold text-blue-600">{((project.spent / project.budget) * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng Giá Trị Thu Hồi IPC</span>
                <p className="text-lg font-black text-emerald-600 font-mono">{formatVND(project.ipcActual)}</p>
                <span className="block text-[10px] text-slate-400">Tỷ lệ thanh toán/ngân sách: {((project.ipcActual / project.budget) * 100).toFixed(0)}%</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vướng mắc tồn đọng</span>
                <p className={`text-lg font-black font-mono ${openIssuesCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {openIssuesCount} vấn đề
                </p>
                <span className="block text-[10px] text-slate-400">Đã giải quyết: {projectIssues.length - openIssuesCount} / {projectIssues.length}</span>
              </div>
            </div>

            {/* Cashflow preview chart */}
            <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">Dự phóng dòng tiền thu chi</h3>
              <LineAreaChart
                data={cashflow.map(cf => ({
                  label: cf.month.split(' ')[0], // short name
                  planned: cf.plannedIn,
                  actual: cf.actualIn
                }))}
                valueSuffix=" đ"
                height={180}
              />
            </div>
          </div>

          {/* Side Panels (Right) */}
          <div className="space-y-6">
            {/* Risk Warnings */}
            <div className="bg-slate-50 border border-[#E5E7EB] rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Cảnh Báo & Rủi ro kiểm soát
              </h3>
              {project.status === 'At Risk' || project.status === 'Delayed' ? (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-amber-950">Chậm tiến độ thi công hạ tầng</p>
                  <p className="text-amber-800 font-semibold leading-relaxed">
                    Trễ 3% so với kế hoạch mốc san nền lớp 2. Gặp khó khăn bàn giao hố ga kỹ thuật của CĐT.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs flex items-start gap-2 text-emerald-950">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Dự án vận hành an toàn</p>
                    <p className="text-emerald-800 mt-1">Không phát sinh chậm tiến độ nghiêm trọng. Nhân lực và tài chính được cân đối tối ưu.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Contracts quick stats */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-500" />
                Hợp đồng ký kết ({contracts.length})
              </h3>
              <div className="divide-y divide-[#E5E7EB]">
                {contracts.map(cnt => (
                  <div key={cnt.id} className="py-2.5 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[160px]" title={cnt.name}>{cnt.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{cnt.id.split('-')[0]}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Giá trị:</span>
                      <span className="font-bold text-slate-700">{formatVNDShort(cnt.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CASHFLOW PLAN & ACTUAL INTEGRATED */}
      {activeTab === 'cashflow' && (() => {
        // Params lấy ĐÚNG từ file Excel — KHÔNG bịa (không fallback về ngân sách/ngày dự án).
        // Ô nào trống trong file thì để 0/'' và hiển thị "—".
        const dp = detailedCashflow?.params || {};
        const params = {
          contractValue: Number(cashflowMode === 'actual' ? dp.actualContractValue : dp.plannedContractValue) || 0,
          contractDate: (cashflowMode === 'actual' ? dp.actualContractDate : dp.plannedContractDate) || '',
          warningThreshold: Number(dp.warningThreshold) || 0
        };
        const money = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') + ' đ' : '—');

        // CHỈ dùng dữ liệu dòng tiền THẬT từ file Excel — không bao giờ sinh dữ liệu giả.
        // Kỳ nào file không có thì bảng để trống (hiển thị thông báo "chưa có dữ liệu").
        const realRows = (cashflowMode === 'actual' ? detailedCashflow?.actual : detailedCashflow?.planned) || [];
        const activeDetailedCashflow: DetailedCashFlowMonth[] = (realRows as any);

        // Format raw numbers perfectly like a real financial document (e.g., "6,080,646,227")
        const formatValue = (num: number) => {
          if (num === 0) return '-';
          return num.toLocaleString('vi-VN');
        };

        // Calculations of column sums for "Total" / "Lũy kế" column
        const sumInflowsAdvance = activeDetailedCashflow.reduce((sum, item) => sum + item.advanceIn, 0);
        const sumInflowsRecovery = activeDetailedCashflow.reduce((sum, item) => sum + item.advanceRecovery, 0);
        const sumInflowsIpc = activeDetailedCashflow.reduce((sum, item) => sum + item.ipcIn, 0);
        const sumInflowsPkg1 = activeDetailedCashflow.reduce((sum, item) => sum + item.packageIpc.pkg1, 0);
        const sumInflowsPkg2 = activeDetailedCashflow.reduce((sum, item) => sum + item.packageIpc.pkg2, 0);
        const sumInflowsPkg3 = activeDetailedCashflow.reduce((sum, item) => sum + item.packageIpc.pkg3, 0);
        const sumTotalReceived = activeDetailedCashflow.reduce((sum, item) => sum + item.totalInPeriod, 0);

        const sumOutflowsPkg1 = activeDetailedCashflow.reduce((sum, item) => sum + item.directCost.pkg1, 0);
        const sumOutflowsPkg2 = activeDetailedCashflow.reduce((sum, item) => sum + item.directCost.pkg2, 0);
        const sumOutflowsPkg3 = activeDetailedCashflow.reduce((sum, item) => sum + item.directCost.pkg3, 0);
        const sumManagement = activeDetailedCashflow.reduce((sum, item) => sum + item.managementCost, 0);
        const sumUnallocated = activeDetailedCashflow.reduce((sum, item) => sum + item.unallocatedCost, 0);
        const sumSubtotalOut = activeDetailedCashflow.reduce((sum, item) => sum + item.subtotalOut, 0);
        const sumOtherOut = activeDetailedCashflow.reduce((sum, item) => sum + item.otherOut, 0);
        const sumTotalOut = activeDetailedCashflow.reduce((sum, item) => sum + item.totalOutPeriod, 0);

        // For ending balance, we display the final ending balance of the project timeline
        const finalEndingBalance = activeDetailedCashflow[activeDetailedCashflow.length - 1]?.endingBalance || 0;

        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Sheet Sub-Tab Navigator & Mode Selector */}
            <div className="flex border border-slate-200 bg-white p-2 rounded-xl items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setCashflowMode('plan')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                    cashflowMode === 'plan'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Dòng Tiền Kế Hoạch (Plan)
                </button>
                <button
                  onClick={() => setCashflowMode('actual')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${
                    cashflowMode === 'actual'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cashflowMode === 'actual' ? 'bg-green-300 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>Dòng Tiền Thực Tế (Actual)</span>
                </button>
              </div>

              <div className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Chế độ hiển thị: <b className="text-slate-600 font-mono">{cashflowMode === 'plan' ? 'Kế hoạch ngân sách' : 'Thực tế giải ngân'}</b>
              </div>
            </div>

            {/* BIG BLUE EXCEL-STYLE HEADER BANNER */}
            <div className="bg-[#104e8b] text-white p-6 rounded-xl shadow-xs border border-blue-900/40 text-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                <Layers className="w-24 h-24 text-white" />
              </div>
              <h1 className="text-lg md:text-2xl font-black uppercase tracking-wide">
                {project.fullName}
              </h1>
              <p className="text-sm md:text-xl font-bold tracking-wider text-blue-100 uppercase">
                Dòng tiền dự án - {cashflowMode === 'plan' ? 'Kế Hoạch' : 'Thực Tế'}
              </p>
            </div>

            {/* PARAMETERS SECTION ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Giá trị hợp đồng</span>
                <span className="bg-slate-100 px-4 py-2 rounded-lg font-mono text-base font-black text-slate-800 border border-slate-200 w-full text-center">
                  {money(params.contractValue)}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ngày hợp đồng</span>
                <span className="bg-slate-100 px-4 py-2 rounded-lg font-mono text-base font-black text-slate-800 border border-slate-200 w-full text-center">
                  {params.contractDate || '—'}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cảnh báo khi số dư dưới</span>
                <span className="bg-rose-50 text-rose-700 px-4 py-2 rounded-lg font-mono text-base font-black border border-rose-200 w-full text-center">
                  {money(params.warningThreshold)}
                </span>
              </div>
            </div>

            {/* DETAILED SPREADSHEET TABLE CARD */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {activeDetailedCashflow.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm font-medium">
                  Chưa có dữ liệu dòng tiền {cashflowMode === 'plan' ? '(Kế hoạch)' : '(Thực tế)'} cho dự án này trong file Excel.
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#104e8b] text-white text-[11px] uppercase font-black tracking-wider border-b border-[#E5E7EB]">
                      <th className="py-3 px-4 font-bold border-r border-blue-900/30 sticky left-0 z-20 bg-[#104e8b] min-w-[280px]">Hạng mục tài chính</th>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <th key={idx} className="py-3 px-4 text-right font-mono font-bold border-r border-blue-900/30 min-w-[120px]">
                          {cf.month}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right font-bold min-w-[140px] bg-[#0b3c6b]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-200 font-medium text-slate-700">
                    
                    {/* ROW: SỐ DƯ DÒNG TẠI ĐẦU MỖI THÁNG */}
                    <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-600 border-r border-slate-200 sticky left-0 z-10 bg-slate-50">
                        Số dư dòng tại đầu mỗi tháng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-3 px-4 text-right font-mono font-semibold border-r border-slate-200">
                          {cf.beginningBalance > 0 ? formatValue(cf.beginningBalance) : ''}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-mono text-slate-400 bg-slate-100 border-l border-slate-300">-</td>
                    </tr>

                    {/* SECTION HEADER: SỐ TIỀN THU VÀO */}
                    <tr className="bg-blue-50/40 text-blue-900 font-extrabold uppercase tracking-wide">
                      <td colSpan={activeDetailedCashflow.length + 2} className="py-2.5 px-4 text-[10px] flex justify-between items-center bg-blue-100/50">
                        <span className="flex items-center gap-1.5 text-blue-800">
                          <ArrowUpRight className="w-4 h-4 text-blue-600" />
                          Số tiền thu vào
                        </span>
                        <span className="text-[9px] lowercase font-normal text-blue-500 italic pr-4">ĐVT: Đồng</span>
                      </td>
                    </tr>

                    {/* ROW: THU TẠM ỨNG */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 pl-8 text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white">
                        Thu tạm ứng - 20% hợp đồng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono text-slate-600 border-r border-slate-200">
                          {formatValue(cf.advanceIn)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 font-bold bg-slate-50">{formatValue(sumInflowsAdvance)}</td>
                    </tr>

                    {/* ROW: HOÀN TẠM ỨNG */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 pl-8 text-slate-500 border-r border-slate-200 sticky left-0 z-10 bg-white">
                        Hoàn tạm ứng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono text-slate-600 border-r border-slate-200">
                          {formatValue(cf.advanceRecovery)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 font-bold bg-slate-50">{formatValue(sumInflowsRecovery)}</td>
                    </tr>

                    {/* ROW: THU THEO IPC */}
                    <tr className="bg-slate-50/30 font-bold text-slate-800">
                      <td className="py-2.5 px-4 pl-8 border-r border-slate-200 sticky left-0 z-10 bg-slate-50/30">
                        Thu theo IPC
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono border-r border-slate-200 text-slate-800">
                          {formatValue(cf.ipcIn)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800 bg-slate-100">{formatValue(sumInflowsIpc)}</td>
                    </tr>

                    {/* SUB-PACKAGES OF IPC (ITALIC, PURPLE/MAGENTA) */}
                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 1
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.packageIpc.pkg1)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumInflowsPkg1)}</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 2
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.packageIpc.pkg2)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumInflowsPkg2)}</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 3
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.packageIpc.pkg3)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumInflowsPkg3)}</td>
                    </tr>

                    {/* ROW: TỔNG SỐ TIỀN NHẬN TRONG KỲ */}
                    <tr className="bg-[#D2E4F6] text-[#0f3c66] font-black border-y-2 border-slate-300">
                      <td className="py-3 px-4 font-bold border-r border-slate-300 sticky left-0 z-10 bg-[#D2E4F6]">
                        Tổng số tiền nhận trong kỳ
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-3 px-4 text-right font-mono border-r border-slate-300">
                          {formatValue(cf.totalInPeriod)}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-mono text-slate-900 bg-[#BFD7ED]">{formatValue(sumTotalReceived)}</td>
                    </tr>

                    {/* ROW: SỐ TIỀN CÓ ĐẦU THÁNG */}
                    <tr className="bg-[#D2E4F6] text-[#0f3c66] font-black border-b-2 border-slate-300">
                      <td className="py-3 px-4 font-bold border-r border-slate-300 sticky left-0 z-10 bg-[#D2E4F6]">
                        Số tiền có đầu tháng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-3 px-4 text-right font-mono border-r border-slate-300">
                          {formatValue(cf.cashAvailable)}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-mono text-slate-400 bg-[#BFD7ED] border-l border-slate-300">-</td>
                    </tr>

                    {/* SECTION HEADER: SỐ TIỀN DỰ CHI / THỰC CHI */}
                    <tr className="bg-rose-50/40 text-rose-900 font-extrabold uppercase tracking-wide">
                      <td colSpan={activeDetailedCashflow.length + 2} className="py-2.5 px-4 text-[10px] flex justify-between items-center bg-rose-100/50">
                        <span className="flex items-center gap-1.5 text-rose-800">
                          <ArrowDownRight className="w-4 h-4 text-rose-600" />
                          {cashflowMode === 'plan' ? 'Số tiền dự chi (Ngân sách)' : 'Số tiền thực tế chi (Giải ngân)'}
                        </span>
                        <span className="text-[9px] lowercase font-normal text-rose-500 italic pr-4">ĐVT: Đồng</span>
                      </td>
                    </tr>

                    {/* ROW: CHI PHÍ TRỰC TIẾP */}
                    <tr className="bg-slate-50/30 font-bold text-slate-800">
                      <td className="py-2.5 px-4 pl-8 border-r border-slate-200 sticky left-0 z-10 bg-slate-50/30">
                        Chi phí trực tiếp
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => {
                        const directSum = cf.directCost.pkg1 + cf.directCost.pkg2 + cf.directCost.pkg3;
                        return (
                          <td key={idx} className="py-2.5 px-4 text-right font-mono border-r border-slate-200 text-slate-800">
                            {directSum > 0 ? formatValue(directSum) : ''}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800 bg-slate-100">
                        {formatValue(sumOutflowsPkg1 + sumOutflowsPkg2 + sumOutflowsPkg3)}
                      </td>
                    </tr>

                    {/* SUB-PACKAGES OF DIRECT COSTS */}
                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 1
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.directCost.pkg1)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumOutflowsPkg1)}</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 2
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.directCost.pkg2)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumOutflowsPkg2)}</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors text-purple-700 italic">
                      <td className="py-2 px-4 pl-12 border-r border-slate-200 sticky left-0 z-10 bg-white font-serif font-semibold">
                        Package - 3
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2 px-4 text-right font-mono border-r border-slate-200 text-purple-600">
                          {formatValue(cf.directCost.pkg3)}
                        </td>
                      ))}
                      <td className="py-2 px-4 text-right font-mono text-purple-800 bg-slate-50">{formatValue(sumOutflowsPkg3)}</td>
                    </tr>

                    {/* ROW: CHI PHÍ QLDA */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 pl-8 text-slate-700 font-bold border-r border-slate-200 sticky left-0 z-10 bg-white">
                        Chi phí QLDA
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono text-slate-600 border-r border-slate-200">
                          {formatValue(cf.managementCost)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 font-bold bg-slate-50">{formatValue(sumManagement)}</td>
                    </tr>

                    {/* ROW: CHƯA PHÂN BỔ */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 pl-8 text-slate-400 border-r border-slate-200 sticky left-0 z-10 bg-white">
                        Chưa phân bổ
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono text-slate-400 border-r border-slate-200">
                          {formatValue(cf.unallocatedCost)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 bg-slate-50">{formatValue(sumUnallocated)}</td>
                    </tr>

                    {/* ROW: CỘNG */}
                    <tr className="bg-[#D2E4F6] text-[#0f3c66] font-black border-y-2 border-slate-300">
                      <td className="py-3 px-4 font-bold border-r border-slate-300 sticky left-0 z-10 bg-[#D2E4F6]">
                        Cộng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-3 px-4 text-right font-mono border-r border-slate-300">
                          {formatValue(cf.subtotalOut)}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-mono text-slate-900 bg-[#BFD7ED]">{formatValue(sumSubtotalOut)}</td>
                    </tr>

                    {/* ROW: KHÁC */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 pl-8 text-slate-400 border-r border-slate-200 sticky left-0 z-10 bg-white">
                        Khác
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-2.5 px-4 text-right font-mono text-slate-400 border-r border-slate-200">
                          {formatValue(cf.otherOut)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 bg-slate-50">{formatValue(sumOtherOut)}</td>
                    </tr>

                    {/* ROW: TỔNG SỐ TIỀN PHẢI CHI */}
                    <tr className="bg-[#D2E4F6] text-[#0f3c66] font-black border-y-2 border-slate-300">
                      <td className="py-3 px-4 font-bold border-r border-slate-300 sticky left-0 z-10 bg-[#D2E4F6]">
                        Tổng số tiền phải chi
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => (
                        <td key={idx} className="py-3 px-4 text-right font-mono border-r border-slate-300">
                          {formatValue(cf.totalOutPeriod)}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-mono text-slate-900 bg-[#BFD7ED]">{formatValue(sumTotalOut)}</td>
                    </tr>

                    {/* ROW: SỐ TIỀN CUỐI THÁNG */}
                    <tr className="bg-[#D2E4F6] text-slate-900 font-extrabold border-b-2 border-slate-400">
                      <td className="py-3.5 px-4 font-bold border-r border-slate-300 sticky left-0 z-10 bg-[#D2E4F6] text-blue-900 text-[13px]">
                        Số tiền cuối tháng
                      </td>
                      {activeDetailedCashflow.map((cf, idx) => {
                        const isBelowThreshold = cf.endingBalance < params.warningThreshold && cf.endingBalance > 0;
                        return (
                          <td
                            key={idx}
                            className={`py-3.5 px-4 text-right font-mono border-r border-slate-300 text-[13px] ${
                              isBelowThreshold ? 'text-rose-600 bg-rose-100/60 font-black' : 'text-[#0f3c66] font-black'
                            }`}
                          >
                            {formatValue(cf.endingBalance)}
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-4 text-right font-mono text-[#0f3c66] bg-[#BFD7ED] border-l border-slate-300 text-[13px] font-black">
                        {formatValue(finalEndingBalance)}
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* ALERT & NOTIFICATION PANEL FOR LOW CASH BALANCES */}
            {activeDetailedCashflow.some(cf => cf.endingBalance < params.warningThreshold && cf.endingBalance > 0) && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex gap-3 items-start animate-pulse">
                <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-extrabold uppercase tracking-wide">Cảnh báo rủi ro thanh khoản dòng tiền</p>
                  <p className="leading-relaxed text-slate-600 font-medium">
                    Phát hiện một số tháng có số dư dòng tiền cuối kỳ nằm dưới ngưỡng cảnh báo an toàn tối thiểu (<b className="font-mono text-rose-600">{params.warningThreshold.toLocaleString()} đ</b>). Ban điều hành dự án cần tối ưu hoá tiến độ thu hồi công nợ IPC hoặc đàm phán kéo dài chu kỳ thanh toán cho nhà thầu phụ thầu chính của các gói thầu Package 1 & 2.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. CONTRACTS & VO */}
      {activeTab === 'contracts' && (() => {
        // Real contract/appendix/VO rows parsed from the project sheet
        const activeDetailedContracts: any[] = contracts.map((c: any) => ({
          contractId: c.name,
          signDate: c.signDate,
          amount: c.amount || undefined,
          ipcAmount: c.ipcAmount || undefined,
          budget: c.budget || undefined,
          startDate: c.startDate,
          endDate: c.endDate,
          duration: c.duration,
          content: c.content,
          status: c.status,
        }));
        // Real per-project issue rows parsed from the sheet
        const activeDetailedIssues: any[] = issues.map((i: any) => ({
          loggedDate: i.loggedDate,
          category: i.item,
          issueText: i.issueText,
          actionText: i.actionText,
          assignee: i.assignee,
          targetComplete: i.targetComplete,
          actualComplete: i.actualComplete,
          status: i.status,
        }));

        const renderFilterIcon = () => (
          <span className="inline-flex items-center justify-center ml-1 bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-[8px] text-slate-500 hover:bg-slate-200 cursor-pointer shadow-3xs select-none">
            ▼
          </span>
        );

        const formatNum = (val?: number) => {
          if (val === undefined || val === null) return '';
          return val.toLocaleString('en-US');
        };

        return (
          <div className="space-y-8">
            {/* FIRST TABLE: THÔNG TIN HỢP ĐỒNG, PHỤ LỤC VÀ VO */}
            <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
              {/* Maroon Vietnamese Banner */}
              <div className="bg-[#800000] text-white p-5 text-center select-none border-b border-slate-300">
                <div className="text-[14px] tracking-wider font-extrabold uppercase mb-1 font-sans">
                  DỰ ÁN {project.fullName.toUpperCase()}
                </div>
                <div className="text-xl md:text-2xl font-black tracking-wide font-sans">
                  THÔNG TIN HỢP ĐỒNG, PHỤ LỤC VÀ VO
                </div>
              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-[#104e8b] text-white text-[11px] uppercase font-bold tracking-wider border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Hợp đồng {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Ngày ký/Ngày trình {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-right">
                        Số tiền {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-right">
                        IPC {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-right">
                        Ngân sách {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Bắt đầu {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Kết thúc {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Thời gian {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold">
                        Nội dung {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 font-bold text-center">
                        Tình trạng {renderFilterIcon()}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-slate-800 font-semibold divide-y divide-slate-200">
                    {activeDetailedContracts.map((row, idx) => {
                      const isHopDongThucTe = row.contractId === 'Hợp đồng thực tế';
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-100/50 transition-colors ${
                            isHopDongThucTe ? 'bg-slate-200/70 font-bold text-slate-800' :
                            idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          <td className="py-3 px-3 font-semibold text-slate-700 border-r border-slate-200">{row.contractId}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 border-r border-slate-200">{row.signDate}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 border-r border-slate-200">
                            {row.amount !== undefined ? formatNum(row.amount) : ''}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-600 border-r border-slate-200">
                            {row.ipcAmount !== undefined ? formatNum(row.ipcAmount) : (isHopDongThucTe ? '' : '-')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                            {row.budget !== undefined ? formatNum(row.budget) : ''}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200">{row.startDate || ''}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200">{row.endDate || ''}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200">{row.duration || ''}</td>
                          <td className="py-3 px-3 text-slate-700 border-r border-slate-200 font-semibold">{row.content}</td>
                          <td className="py-3 px-3 text-center font-bold">
                            {row.status ? (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-300 rounded text-[10px] font-bold">
                                {row.status}
                              </span>
                            ) : ''}
                          </td>
                        </tr>
                      );
                    })}
                    {activeDetailedContracts.length === 0 && (
                      <tr><td colSpan={10} className="py-10 text-center text-slate-400 italic">Chưa có dữ liệu hợp đồng / phụ lục / VO trong file.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECOND TABLE: THEO DÕI CÁC VẤN ĐỀ PHÁT SINH TẠI DỰ ÁN */}
            <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
              {/* Maroon Vietnamese Banner */}
              <div className="bg-[#800000] text-white p-5 text-center select-none border-b border-slate-300">
                <div className="text-[14px] tracking-wider font-extrabold uppercase mb-1 font-sans">
                  DỰ ÁN {project.fullName.toUpperCase()}
                </div>
                <div className="text-xl md:text-2xl font-black tracking-wide font-sans">
                  THEO DÕI CÁC VẤN ĐỀ PHÁT SINH TẠI DỰ ÁN
                </div>
              </div>

              {/* Table wrapper */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-[#104e8b] text-white text-[11px] uppercase font-bold tracking-wider border-b border-slate-300">
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Ngày ghi nhận {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Hạng mục {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold">
                        Vấn đề phát sinh {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold">
                        Giải pháp hành động {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold">
                        Người phụ trách {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Dự kiến hoàn thành {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 border-r border-[#1a3a5a]/30 font-bold text-center">
                        Thực tế hoàn thành {renderFilterIcon()}
                      </th>
                      <th className="py-2.5 px-3 font-bold text-center">
                        Tình trạng {renderFilterIcon()}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] text-slate-800 font-semibold divide-y divide-slate-200">
                    {activeDetailedIssues.map((row, idx) => {
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-100/50 transition-colors ${
                            idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-600 border-r border-slate-200">{row.loggedDate}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700 border-r border-slate-200">{row.category}</td>
                          <td className="py-3 px-3 text-slate-800 font-semibold border-r border-slate-200">{row.issueText}</td>
                          <td className="py-3 px-3 text-slate-600 font-medium text-xs leading-relaxed border-r border-slate-200">{row.actionText}</td>
                          <td className="py-3 px-3 text-slate-700 font-bold border-r border-slate-200">{row.assignee}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 border-r border-slate-200">{row.targetComplete}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 border-r border-slate-200">{row.actualComplete || ''}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded font-black text-[11px] block text-center ${
                              row.status === 'Opened' ? 'bg-[#ffe4e6] text-[#b91c1c] border border-rose-200' :
                              row.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {activeDetailedIssues.length === 0 && (
                      <tr><td colSpan={8} className="py-10 text-center text-slate-400 italic">Chưa có vấn đề phát sinh trong file.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. ISSUES LIST */}
      {activeTab === 'issues' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Các Vấn Đề Phát Sinh Tại Công Trường</h3>
            <button
              onClick={onAddIssueClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Báo cáo lỗi mới
            </button>
          </div>

          <div className="divide-y divide-[#E5E7EB]">
            {projectIssues.map(iss => (
              <div key={iss.id} className="p-4 hover:bg-slate-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] text-blue-600">{iss.id}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      iss.status === 'Opened' ? 'bg-slate-100 text-slate-700' :
                      iss.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {iss.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">{iss.issueText}</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Hành động: {iss.actionText}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-500 font-mono">
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Người phụ trách</span>
                    <span className="font-bold text-slate-700">{iss.assignee}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Dự chi</span>
                    <span className="font-bold text-blue-600">{iss.budget > 0 ? formatVNDShort(iss.budget) : '-'}</span>
                  </div>
                  <button
                    onClick={() => onViewIssueClick(iss)}
                    className="p-1.5 hover:bg-slate-100 rounded text-blue-600 font-bold transition-colors"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            ))}
            {projectIssues.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-medium text-xs">
                Tuyệt vời! Không ghi nhận sự vụ hỏng hóc hoặc vấn đề phát sinh tại dự án này.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TEAM (BAN ĐIỀU HÀNH) */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map(emp => (
            <div key={emp.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs uppercase border border-blue-100 shadow-inner">
                    {emp.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs leading-none">{emp.name}</h4>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">{emp.title}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-[#E5E7EB] rounded text-[9px] font-bold font-mono">
                  {emp.department}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 h-8">
                {emp.description}
              </p>

              <div className="border-t border-[#E5E7EB] pt-3 flex flex-wrap gap-1.5 text-[9px] font-extrabold text-slate-500">
                <span className="px-1.5 py-0.5 bg-blue-50/50 text-blue-700 rounded border border-blue-100/30">
                  {emp.qualification}
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-50/50 text-emerald-700 rounded border border-emerald-100/30">
                  KPI: {emp.kpi}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded border border-[#E5E7EB] truncate max-w-[150px]" title={emp.certifications}>
                  {emp.certifications}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. MILESTONES & DOCUMENTS */}
      {activeTab === 'milestones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestone List */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Hành trình mốc bàn giao (Milestones)</h3>
            <div className="space-y-4 relative pl-4 border-l border-[#E5E7EB]">
              {milestones.map((ms, idx) => (
                <div key={ms.id} className="relative">
                  <span className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                    ms.status === 'Completed' ? 'bg-emerald-500' :
                    ms.status === 'Overdue' ? 'bg-rose-500' : 'bg-slate-300'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-xs">{ms.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        ms.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        ms.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-slate-50 text-slate-500 border border-[#E5E7EB]'
                      }`}>
                        {ms.status}
                      </span>
                    </div>
                    <span className="block font-mono text-[10px] text-slate-400 font-bold">Hạn hoàn thành: {ms.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Documents Box */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Hồ sơ Thiết kế & Bản vẽ
            </h3>
            <div className="space-y-2 text-xs font-semibold">
              {[
                { name: 'Ban_Ve_Layout_Tong_The_Rev3.dwg', size: '42.5 MB', date: '2026-06-12' },
                { name: 'Thuyet_Minh_Giai_Phap_MEP_v2.pdf', size: '12.8 MB', date: '2026-06-18' },
                { name: 'Nghiem_Thu_Dat_Mong_Ky_Thuat.pdf', size: '8.4 MB', date: '2026-07-15' },
                { name: 'Nhat_Ky_Thi_Cong_Cum_B.xlsx', size: '14.2 MB', date: '2026-07-21' }
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border border-transparent hover:border-[#E5E7EB] cursor-pointer transition-all">
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="font-bold text-slate-700 truncate" title={doc.name}>{doc.name}</span>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-400">
                    <span className="block font-bold">{doc.size}</span>
                    <span className="block">{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
