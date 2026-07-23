/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Project, Employee, Contract, Issue, CashFlowMonth, Milestone, RiskAndKpi, AuthUser, ROLE_LABELS, hasPerm } from './types';
import { BarChart, DonutChart, ResourceHeatmap, ProgressRing } from './components/Charts';
import { TimelineView } from './components/TimelineView';
import { IssueKanban } from './components/IssueKanban';
import { ProjectPortal } from './components/ProjectPortal';
import { HeadcountStats } from './components/HeadcountStats';
import { RiskKpiManager } from './components/RiskKpiManager';
import { ExcelReader } from './components/ExcelReader';
import { AuthScreen } from './components/AuthScreen';
import { UserAdmin } from './components/UserAdmin';
import { CompensationView } from './components/CompensationView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { apiMe, clearToken, getToken } from './authClient';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  Layers,
  Search,
  Bell,
  Moon,
  Sun,
  FileText,
  CheckCircle,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  LogOut,
  Briefcase,
  Sliders,
  X,
  Undo2,
  Lock,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  FileDown,
  Sparkles,
  FileSpreadsheet,
  UserCog,
  KeyRound,
  Loader2,
  Wallet,
  Menu
} from 'lucide-react';

export default function App() {
  // Global States
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false); // mobile drawer
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<RiskAndKpi[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [resourceSummary, setResourceSummary] = useState<any[]>([]);
  const [cashflowData, setCashflowData] = useState<Record<string, CashFlowMonth[]>>({});
  const [detailedCashflow, setDetailedCashflow] = useState<Record<string, any>>({});
  const [issuesSubTab, setIssuesSubTab] = useState<'kanban' | 'riskkpi'>('kanban');
  const [focusedIssueId, setFocusedIssueId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; visible: boolean; undoAction?: () => void } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auth states
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [showChangePw, setShowChangePw] = useState<boolean>(false);

  // Validate an existing token on load
  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const u = await apiMe();
          if (u) setAuthUser(u);
        }
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const handleLogout = () => {
    clearToken();
    setAuthUser(null);
    setActiveModule('dashboard');
  };

  useEffect(() => {
    if (!authUser) return; // only load data after authentication
    const fetchData = async () => {
      try {
        const [projRes, empRes, conRes, issRes, msRes, riskRes, resRes, cfRes, actRes, cfdRes] = await Promise.all([
          fetch('/api/data/Projects'),
          fetch('/api/data/Employees'),
          fetch('/api/data/Contracts'),
          fetch('/api/data/Issues'),
          fetch('/api/data/Milestones'),
          fetch('/api/data/Risks'),
          fetch('/api/data/ResourceSummary'),
          fetch('/api/data/CashFlow'),
          fetch('/api/data/Activity'),
          fetch('/api/data/CashflowDetail')
        ]);

        if (projRes.ok) setProjects(await projRes.json());
        if (empRes.ok) setEmployees(await empRes.json());
        if (conRes.ok) setContracts(await conRes.json());
        if (issRes.ok) setIssues(await issRes.json());
        if (msRes.ok) setMilestones(await msRes.json());
        if (riskRes.ok) setRisks(await riskRes.json());
        if (resRes.ok) setResourceSummary(await resRes.json());
        if (actRes.ok) setActivityLogs(await actRes.json());
        if (cfRes.ok) {
          const cfRows: any[] = await cfRes.json();
          const grouped: Record<string, CashFlowMonth[]> = {};
          cfRows.forEach((r) => {
            (grouped[r.projectId] = grouped[r.projectId] || []).push(r);
          });
          setCashflowData(grouped);
        }
        if (cfdRes.ok) {
          const rows: any[] = await cfdRes.json();
          const map: Record<string, any> = {};
          rows.forEach((r) => { map[r.projectId] = r; });
          setDetailedCashflow(map);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, [authUser]);

  // UX State demonstrator (allows users to toggle between all requested states in design system!)
  const [uxStateMode, setUxStateMode] = useState<'normal' | 'loading' | 'skeleton' | 'empty' | 'permission' | 'error' | '404'>('normal');

  // Backup state for Undo action
  const [previousIssuesState, setPreviousIssuesState] = useState<Issue[] | null>(null);

  // Currency utility
  const formatVND = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const formatVNDShort = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' tỷ đ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' triệu đ';
    return val.toLocaleString() + ' đ';
  };

  // Format a money value that may arrive as a string ("100000000") or number -> "100.000.000 đ"
  const formatMoneyStr = (v: any): string => {
    const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
    return n > 0 ? Math.round(n).toLocaleString('vi-VN') + ' đ' : '—';
  };

  // Toast helper
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success', undo?: () => void) => {
    setToast({ message, type, visible: true, undoAction: undo });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
  };

  // Undo action trigger
  const handleUndo = () => {
    if (previousIssuesState) {
      setIssues(previousIssuesState);
      setPreviousIssuesState(null);
      triggerToast('Đã khôi phục trạng thái dữ liệu thành công!', 'info');
    }
  };

  // Issues mutation handlers
  const handleAddIssue = (newIssue: Issue) => {
    setPreviousIssuesState([...issues]);
    setIssues([newIssue, ...issues]);
    triggerToast(`Ghi nhận vấn đề phát sinh ${newIssue.id} thành công!`, 'success', handleUndo);
  };

  const handleUpdateIssue = (updatedIssue: Issue) => {
    setPreviousIssuesState([...issues]);
    setIssues(issues.map(iss => iss.id === updatedIssue.id ? updatedIssue : iss));
    triggerToast(`Đã cập nhật sự vụ ${updatedIssue.id} thành công!`, 'success', handleUndo);
  };

  const handleDeleteIssue = (id: string) => {
    setPreviousIssuesState([...issues]);
    setIssues(issues.filter(iss => iss.id !== id));
    setDeleteConfirmId(null);
    triggerToast(`Đã xoá hồ sơ issue ${id}!`, 'error', handleUndo);
  };

  // Risks & KPI mutation handlers
  const handleAddRisk = (newRisk: RiskAndKpi) => {
    setRisks([newRisk, ...risks]);
    triggerToast(`Ghi nhận hồ sơ khó khăn & KPI thành công!`, 'success');
  };

  const handleUpdateRisk = (updatedRisk: RiskAndKpi) => {
    setRisks(risks.map(r => r.id === updatedRisk.id ? updatedRisk : r));
    triggerToast(`Đã cập nhật hồ sơ khó khăn ${updatedRisk.id} thành công!`, 'success');
  };

  const handleDeleteRisk = (id: string) => {
    setRisks(risks.filter(r => r.id !== id));
    triggerToast(`Đã xoá hồ sơ khó khăn rủi ro ${id}!`, 'error');
  };

  // Financial summary metrics
  const financialSummary = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.spent, 0);
    const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
    const totalIPC = projects.reduce((sum, p) => sum + p.ipcActual, 0);
    const outstanding = totalBudget - totalSpent;
    return { totalBudget, totalSpent, totalRevenue, totalIPC, outstanding };
  }, [projects]);

  // Global search handler
  const searchResults = useMemo(() => {
    if (!globalSearchTerm.trim()) return [];
    const term = globalSearchTerm.toLowerCase();

    const matchedProjects = projects.filter(p => p.fullName.toLowerCase().includes(term) || p.name.toLowerCase().includes(term));
    const matchedStaff = employees.filter(e => e.name.toLowerCase().includes(term) || e.title.toLowerCase().includes(term));
    const matchedIssues = issues.filter(i => i.issueText.toLowerCase().includes(term) || i.id.toLowerCase().includes(term));

    return { projects: matchedProjects, staff: matchedStaff, issues: matchedIssues };
  }, [globalSearchTerm, projects, employees, issues]);

  // Module switcher breadcrumbs
  const getBreadcrumbs = () => {
    const root = 'Corporate Management';
    const nodes: Record<string, string> = {
      dashboard: 'Dashboard Điều Hành',
      resource: 'Quản Lý Nhân Lực Khối Dự Án',
      budget: 'Quản Lý Ngân Sách & Tài Chính',
      timeline: 'Tiến Độ Dự Án & Lịch Trình',
      issues: 'Kiểm Soát Vướng Mắc & Bảo Hành',
      'excel-reader': 'Bộ Đọc File Excel',
      compensation: 'Chi Phí & Lương Đãi Ngộ',
      users: 'Quản Lý Tài Khoản & Phân Quyền'
    };

    // Dynamic project names
    const matchedProject = projects.find(p => p.id === activeModule);
    if (matchedProject) {
      nodes[activeModule] = matchedProject.fullName || matchedProject.name;
    }

    return [root, nodes[activeModule] || 'Hồ sơ chuyên sâu'];
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // ---- Auth gate: chờ kiểm tra token, chưa đăng nhập -> màn hình đăng nhập ----
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải...
      </div>
    );
  }
  if (!authUser) {
    return <AuthScreen onAuthenticated={(u) => { setAuthUser(u); setAuthChecked(true); }} />;
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-[#F3F4F6] text-[#1A1C1E]'}`}>
      {/* Mobile backdrop when drawer is open */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 1. LEFT SIDEBAR (drawer on mobile/tablet, static on desktop) */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between select-none shrink-0 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo Brand Frame — logo phủ hết phần trên sidebar */}
          <div className="relative p-3 border-b border-[#1F2937]">
            <div className="rounded-lg bg-white p-2 flex items-center justify-center">
              <img src="/uploads/images/logo1-1775554290.png" alt="Logo" className="w-full max-h-20 object-contain" />
            </div>
            {/* Realtime Live Pulse */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[9px] font-bold text-emerald-500 uppercase drop-shadow">Live</span>
            </div>
          </div>

          {/* Workspace selector */}
          <div className="px-3 pt-4">
            <div className="bg-[#1F2937] border border-[#2D3748]/30 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-[#253041] transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                  {(authUser.fullName || authUser.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <span className="block text-[10px] font-black text-white uppercase truncate max-w-[150px]">{authUser.fullName || authUser.username}</span>
                  <span className="block text-[8px] text-[#9CA3AF] font-bold">{ROLE_LABELS[authUser.role]}</span>
                </div>
              </div>
              <ShieldAlert className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </div>
          </div>

          {/* Navigation Items (Modules 1-5) */}
          <nav className="p-3 space-y-1">
            <span className="block text-[9px] uppercase font-extrabold text-[#6B7280] px-3 mb-2 tracking-widest">Tân Phát Long DashBoard Manage</span>
            {[
              { id: 'dashboard', label: 'Dashboard Tổng Quan', icon: LayoutDashboard },
              { id: 'resource', label: 'Hồ Sơ Nhân Sự', icon: Users },
              { id: 'budget', label: 'Ngân Sách & Tài Chính', icon: DollarSign },
              { id: 'timeline', label: 'Tiến Độ & Lịch Trình', icon: Calendar },
              { id: 'issues', label: 'Vướng Mắc & Bảo Hành', icon: AlertTriangle },
              { id: 'excel-reader', label: 'Bộ Đọc File Excel', icon: FileSpreadsheet },
              ...(authUser.role === 'admin' ? [{ id: 'users', label: 'Quản Lý Tài Khoản', icon: UserCog }] : [])
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setUxStateMode('normal'); // Reset state demonstrator
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${isActive
                      ? 'bg-[#1F2937] text-white border-l-4 border-blue-500 shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'issues' && (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                      {issues.filter(i => i.status !== 'Closed').length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Navigation Projects (Modules 6-10) */}
          <div className="p-3 space-y-1 border-t border-[#1F2937]">
            <span className="block text-[9px] uppercase font-extrabold text-[#6B7280] px-3 mb-2 tracking-widest">Danh mục công trình</span>
            {projects.map((proj) => {
              const isActive = activeModule === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    setActiveModule(proj.id);
                    setUxStateMode('normal');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${isActive
                      ? 'bg-[#1F2937] text-white border-l-4 border-emerald-500 shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${proj.status === 'On Track' ? 'bg-emerald-500' :
                        proj.status === 'Completed' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                    <span className="truncate max-w-[140px]">{proj.fullName}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
                </button>
              );
            })}
          </div>
        </div>

        {/* User Account Info Bottom */}
        <div className="p-4 border-t border-[#1F2937] bg-[#111827] space-y-2">
          <div className="flex items-center gap-3 bg-[#1F2937] p-3 rounded-lg border border-[#2D3748]/20">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/30 shrink-0 uppercase">
              {(authUser.fullName || authUser.username).slice(0, 2)}
            </div>
            <div className="text-left truncate flex-1">
              <span className="block text-xs font-bold text-white leading-none truncate">{authUser.fullName || authUser.username}</span>
              <span className="block text-[9px] text-blue-300 font-bold truncate mt-1">{ROLE_LABELS[authUser.role]}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowChangePw(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1F2937] hover:bg-[#253041] text-[#9CA3AF] hover:text-white text-[11px] font-bold transition-colors border border-[#2D3748]/20">
              <KeyRound className="w-3.5 h-3.5" /> Đổi mật khẩu
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold transition-colors border border-rose-500/20">
              <LogOut className="w-3.5 h-3.5" /> Thoát
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top bar with Breadcrumbs & Global Utility (Sleek Interface) */}
        <header className={`h-14 border-b flex items-center justify-between gap-3 flex-shrink-0 transition-all px-4 sm:px-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#E5E7EB]'
          }`}>
          {/* Breadcrumb Navigation + mobile menu button */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4B5563] select-none min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0"
              title="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              {getBreadcrumbs().map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3 h-3 text-[#9CA3AF] shrink-0" />}
                  <span className={`truncate ${i === getBreadcrumbs().length - 1 ? 'text-[#111827] font-bold' : 'hover:text-blue-600 cursor-pointer transition-colors hidden sm:inline'}`}>{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Global Utility Actions */}
          <div className="flex items-center gap-3">
            {/* Search inputs */}
            <div className="relative max-w-xs hidden md:block">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Tìm kiếm dự án, nhân lực..."
                className="pl-8 pr-4 py-1.5 bg-[#F9FAFB] border border-[#D1D5DB] rounded text-xs w-60 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium placeholder-slate-400"
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
              />
            </div>

            {/* Notification triggers */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-1.5 border border-[#D1D5DB] rounded hover:bg-slate-50 text-slate-600 relative"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              </button>

              {/* Notification dropdown dropdown panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 z-50 bg-white border border-[#E5E7EB] rounded shadow-xl w-80 overflow-hidden font-sans text-xs">
                  <div className="p-3 bg-slate-50 border-b border-[#E5E7EB] flex justify-between items-center font-bold text-[#111827]">
                    <span>Hộp Cảnh Báo Điều Hành</span>
                    <button onClick={() => setShowNotifications(false)} className="text-[#9CA3AF] hover:text-[#111827]">×</button>
                  </div>
                  <div className="divide-y divide-[#E5E7EB] max-h-80 overflow-y-auto">
                    <div className="p-3 space-y-1.5 hover:bg-slate-50 transition-colors">
                      <p className="text-[#4B5563] leading-relaxed font-semibold italic text-center py-4">
                        Không có cảnh báo mới
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 border border-[#D1D5DB] rounded hover:bg-slate-50 text-[#4B5563]"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Global Search Results Layer overlay */}
        {globalSearchTerm.trim() && (
          <div className="bg-white border-b border-slate-100 p-6 z-40 relative shadow-md divide-y divide-slate-100">
            <div className="flex justify-between items-center pb-3">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                Kết quả tìm kiếm cho: &quot;{globalSearchTerm}&quot;
              </span>
              <button onClick={() => setGlobalSearchTerm('')} className="p-1 hover:bg-slate-50 rounded">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {searchResults.projects?.length === 0 && searchResults.staff?.length === 0 && searchResults.issues?.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">Không tìm thấy dữ liệu phù hợp.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs">
                {/* Projects Result */}
                <div className="space-y-2">
                  <span className="block font-bold text-slate-400 text-[10px] uppercase">Dự Án ({searchResults.projects?.length})</span>
                  {searchResults.projects?.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setActiveModule(p.id); setGlobalSearchTerm(''); }}
                      className="p-2 hover:bg-blue-50/50 rounded border border-transparent hover:border-blue-100 cursor-pointer transition-colors font-bold text-slate-800"
                    >
                      {p.fullName}
                    </div>
                  ))}
                </div>

                {/* Staff Result */}
                <div className="space-y-2">
                  <span className="block font-bold text-slate-400 text-[10px] uppercase">Hồ Sơ Nhân Sự ({searchResults.staff?.length})</span>
                  {searchResults.staff?.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedEmployee(s); setGlobalSearchTerm(''); setActiveModule('resource'); }}
                      className="p-2 hover:bg-blue-50/50 rounded border border-transparent hover:border-blue-100 cursor-pointer transition-colors"
                    >
                      <span className="block font-bold text-slate-800">{s.name}</span>
                      <span className="block text-[10px] text-slate-400">{s.title} • {s.department}</span>
                    </div>
                  ))}
                </div>

                {/* Issues Result */}
                <div className="space-y-2">
                  <span className="block font-bold text-slate-400 text-[10px] uppercase">Vướng Mắc Tồn Đọng ({searchResults.issues?.length})</span>
                  {searchResults.issues?.map(i => (
                    <div
                      key={i.id}
                      onClick={() => { setActiveModule('issues'); setGlobalSearchTerm(''); }}
                      className="p-2 hover:bg-blue-50/50 rounded border border-transparent hover:border-blue-100 cursor-pointer transition-colors"
                    >
                      <span className="block font-mono font-bold text-blue-600">{i.id}</span>
                      <span className="block text-slate-700 font-semibold line-clamp-1">{i.issueText}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. UX STATE DEMONSTRATOR RENDERER */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          {uxStateMode === 'loading' && <LoadingDemo />}
          {uxStateMode === 'skeleton' && <SkeletonDemo />}
          {uxStateMode === 'empty' && <EmptyDemo />}
          {uxStateMode === 'permission' && <PermissionDemo />}
          {uxStateMode === 'error' && <ErrorDemo />}
          {uxStateMode === '404' && <PageNotFoundDemo />}

          {/* Normal execution tab switching */}
          {uxStateMode === 'normal' && (
            <React.Fragment>
              {/* MODULE 1: EXEC DASHBOARD */}
              {activeModule === 'dashboard' && (
                <div className="space-y-6">
                  {/* Executive KPI Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng Ngân Sách Dự Án</span>
                        <Briefcase className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-xl font-black text-slate-800 font-mono">{formatVNDShort(financialSummary.totalBudget)}</p>
                      <span className="block text-[10px] text-slate-400 font-semibold">Tích hợp 5 công trình chính</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ngân Sách Đã Chi</span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-xl font-black text-emerald-600 font-mono">{formatVNDShort(financialSummary.totalSpent)}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Hiệu suất giải ngân:</span>
                        <span className="font-bold text-blue-600">
                          {((financialSummary.totalSpent / financialSummary.totalBudget) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Giải Ngân Hoàn Thành IPC</span>
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-xl font-black text-blue-600 font-mono">{formatVNDShort(financialSummary.totalIPC)}</p>
                      <span className="block text-[10px] text-slate-400 font-semibold">Doanh thu ghi nhận thực tế</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vướng mắc thi công</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                      </div>
                      <p className="text-xl font-black text-amber-600 font-mono">{issues.filter(i => i.status !== 'Closed').length} vụ</p>
                      <span className="block text-[10px] text-slate-400 font-semibold">Đã đóng 100% hồ sơ cũ</span>
                    </div>
                  </div>

                  {/* Visual Dashboard grids */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Project comparison chart (2/3 width) */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                        <span>Đồ Thị Phân Bổ Ngân Sách vs Tiến Độ Đã Chi</span>
                        <span className="text-[10px] font-bold text-blue-600">Báo cáo kiểm soát PMO</span>
                      </h3>
                      <BarChart
                        data={projects.map(p => ({
                          label: p.name,
                          value: p.budget,
                          secondaryValue: p.spent
                        }))}
                        valueSuffix=" đ"
                      />
                    </div>

                    {/* Donut breakdown (1/3 width) */}
                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4 flex flex-col justify-between">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Chi phí xây dựng theo gói thầu</h3>
                      <DonutChart
                        data={projects.map((p, i) => ({
                          label: p.name,
                          value: p.budget || 0,
                          color: ['#2563eb', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'][i % 5]
                        }))}
                        totalLabel="Ngân sách"
                      />
                    </div>
                  </div>

                  {/* Resource heatmaps & Activity row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Heatmap phân bổ lực lượng (Hiệu suất & Chấm công)</h3>
                      <ResourceHeatmap projects={projects} />
                    </div>

                    {/* Recent activities */}
                    <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs space-y-4">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Nhật ký hành động khẩn</h3>
                      <div className="divide-y divide-[#E5E7EB] text-xs space-y-3">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold font-sans">
                              <span>{log.user} • {log.project}</span>
                              <span className="font-mono">{(log.timestamp || '').includes('T') ? log.timestamp.split('T')[1].slice(0, 5) : (log.timestamp || '')}</span>
                            </div>
                            <p className="font-bold text-slate-800">{log.action}</p>
                            <p className="text-slate-400 text-[11px] font-medium font-sans">Hạng mục: {log.target}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 2: RESOURCE MANAGEMENT */}
              {activeModule === 'resource' && (
                <div className="space-y-6">
                  {/* Resource Quick Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Khối lực lượng dự án</span>
                      <p className="text-xl font-black text-slate-800 font-mono">{employees.length} nhân sự</p>
                      <span className="block text-[10px] text-slate-400 font-sans font-medium">Chưa có dữ liệu</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trình độ chuyên môn cao</span>
                      <p className="text-xl font-black text-blue-600 font-mono">0%</p>
                      <span className="block text-[10px] text-slate-400 font-sans font-medium">Chưa có dữ liệu</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tỷ lệ sử dụng nhân sự</span>
                      <p className="text-xl font-black text-emerald-600 font-mono">0%</p>
                      <span className="block text-[10px] text-slate-400 font-sans font-medium">Chưa có dữ liệu</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phân hệ tập trung</span>
                      <p className="text-xl font-black text-slate-800 font-mono font-sans font-bold">Chưa có dữ liệu</p>
                      <span className="block text-[10px] text-slate-400 font-sans font-medium">Chưa có dữ liệu</span>
                    </div>
                  </div>

                  {/* Thống kê nhân sự tại các dự án (Biểu đồ & Bảng số liệu) */}
                  <HeadcountStats employees={employees} resourceSummary={resourceSummary} />

                  {/* Resource table */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Danh Sách Nhân Lực Khối Dự Án</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Trích xuất hồ sơ chứng chỉ hành nghề, chức danh và năng lực KPI</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const headers = ['Mã', 'Họ Tên', 'Chức Danh', 'Bộ Phận', 'Chuyên Môn', 'Trình Độ', 'KPI'];
                            const rows = employees.map(e => [e.id, e.name, e.title, e.department, e.branch, e.qualification, e.kpi]);
                            const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                            const link = document.createElement("a");
                            link.setAttribute("href", encodeURI(csvContent));
                            link.setAttribute("download", "danh_sach_nhan_su_Vinacon.csv");
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold shadow-sm"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Xuất File Excel</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-20 shadow-xs">
                          <tr className="text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-[#E5E7EB]">
                            <th className="py-3 px-4 w-12 font-sans">TT</th>
                            <th className="py-3 px-4 font-sans">Bộ Phận - Dự Án</th>
                            <th className="py-3 px-4 font-sans">Họ và Tên</th>
                            <th className="py-3 px-4 font-sans">Chức Danh</th>
                            <th className="py-3 px-4 font-sans">Chuyên Môn / Nhánh</th>
                            <th className="py-3 px-4 font-sans">Chứng Chỉ Hành Nghề</th>
                            {hasPerm(authUser, 'view_compensation') && <th className="py-3 px-4 text-right font-sans">Lương</th>}
                            <th className="py-3 px-4 text-center font-sans">KPI</th>
                            <th className="py-3 px-4 text-center font-sans">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-[#E5E7EB] font-medium">
                          {employees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-400">{emp.id}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/50 rounded font-mono font-bold text-slate-600 text-[10px]">
                                  {emp.department}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">{emp.name}</td>
                              <td className="py-3 px-4 text-slate-600">{emp.title}</td>
                              <td className="py-3 px-4 text-slate-500 font-bold">{emp.branch}</td>
                              <td className="py-3 px-4 text-slate-400 italic truncate max-w-[150px]" title={emp.certifications}>
                                {emp.certifications !== 'None' ? emp.certifications : '-'}
                              </td>
                              {hasPerm(authUser, 'view_compensation') && (
                                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                                  {emp.salary && String(emp.salary) !== '0' && String(emp.salary) !== ''
                                    ? Math.round(Number(String(emp.salary).replace(/[^0-9.\-]/g, '')) || 0).toLocaleString('vi-VN') + ' đ'
                                    : '—'}
                                </td>
                              )}
                              <td className="py-3 px-4 text-center font-mono font-bold text-blue-600">{emp.kpi}</td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setSelectedEmployee(emp)}
                                  className="px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded transition-all"
                                >
                                  Hồ Sơ Chi Tiết
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Employee detailed slide-over drawer */}
                  {selectedEmployee && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
                      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 font-sans text-xs font-semibold">
                        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50 flex justify-between items-center flex-shrink-0">
                          <span className="font-bold text-slate-800 text-sm uppercase tracking-wider">Hồ Sơ Chi Tiết Nhân Sự</span>
                          <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                          <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-5">
                            <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center font-black text-lg text-blue-700 shadow-inner">
                              {selectedEmployee.name.split(' ').slice(-1)[0][0]}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-sm leading-none">{selectedEmployee.name}</h4>
                              <span className="text-[10px] text-slate-400 font-bold block mt-1.5">{selectedEmployee.title}</span>
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/50 text-slate-500 rounded text-[9px] font-bold font-mono inline-block mt-2">
                                {selectedEmployee.department}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Mô tả công việc hiện tại</span>
                            <p className="text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-lg border border-[#E5E7EB]">
                              {selectedEmployee.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-b border-[#E5E7EB] py-5">
                            <div className="space-y-1">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Hiệu suất KPI</span>
                              <span className="text-blue-600 font-black text-sm block font-mono">{selectedEmployee.kpi}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Trình độ</span>
                              <span className="text-slate-800 font-bold text-xs block">{selectedEmployee.qualification}</span>
                            </div>
                            <div className="space-y-1 pt-2">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Phân hệ ngành</span>
                              <span className="text-slate-800 font-bold text-xs block">{selectedEmployee.branch}</span>
                            </div>
                            <div className="space-y-1 pt-2">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Chức vụ điều hành</span>
                              <span className="text-slate-800 font-bold text-xs block">{selectedEmployee.level}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Hồ sơ chứng chỉ hành nghề</span>
                            <div className="flex items-start gap-3 bg-emerald-50/50 p-3 border border-emerald-100/40 rounded-lg text-emerald-950">
                              <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold">Chứng Chỉ Năng Lực Hoạt Động</p>
                                <p className="text-emerald-800 mt-1 leading-relaxed text-[11px]">
                                  {selectedEmployee.certifications !== 'None' ? selectedEmployee.certifications : 'Không thuộc diện yêu cầu chứng chỉ đặc thù của bộ phận.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Chi phí & Lương đãi ngộ — chỉ hiển thị cho người có quyền */}
                          <div className="space-y-3 border-t border-[#E5E7EB] pt-5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Chi phí & Lương đãi ngộ</span>
                              <span className="flex items-center gap-1 text-[8px] bg-slate-900 text-white font-mono px-1.5 py-0.5 rounded uppercase font-bold">
                                <Lock className="w-2.5 h-2.5" /> Bảo mật
                              </span>
                            </div>

                            {hasPerm(authUser, 'view_compensation') ? (
                              <>
                                {/* Lương nổi bật */}
                                <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                    <Wallet className="w-3.5 h-3.5" /> Mức lương
                                  </div>
                                  <div className="mt-1.5 font-mono font-black text-2xl text-indigo-700 leading-none">
                                    {formatMoneyStr(selectedEmployee.salary)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-semibold mt-1">Lương cơ bản theo tháng</div>
                                </div>
                                {/* Các khoản khác */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-[#E5E7EB]">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">BHXH+BHYT+CĐ</span>
                                    <span className="block text-slate-800 font-mono font-extrabold text-[11px] mt-1">{formatMoneyStr(selectedEmployee.insurance)}</span>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-[#E5E7EB]">
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Phụ cấp</span>
                                    <span className="block text-slate-800 font-mono font-extrabold text-[11px] mt-1">{formatMoneyStr(selectedEmployee.allowance)}</span>
                                  </div>
                                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                                    <span className="block text-[9px] font-bold text-blue-400 uppercase">Tổng chi phí</span>
                                    <span className="block text-blue-600 font-mono font-extrabold text-[11px] mt-1">{formatMoneyStr(selectedEmployee.cost)}</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2.5 bg-slate-50 border border-[#E5E7EB] rounded-lg p-3 text-slate-400">
                                <Lock className="w-4 h-4 shrink-0" />
                                <span className="text-[11px] font-semibold">Thông tin lương &amp; chi phí được bảo mật — chỉ Giám đốc điều hành và Quản trị viên được xem.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 3: BUDGET DASHBOARD */}
              {activeModule === 'budget' && (
                <div className="space-y-6">
                  {/* Financial Overview stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-5 border border-[#E5E7EB] shadow-xs rounded-xl space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng ngân sách được giao</span>
                      <p className="text-2xl font-black text-blue-600 font-mono">{formatVND(financialSummary.totalBudget)}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                        <span>Giá trị thầu trung bình:</span>
                        <span className="font-bold text-slate-700">30 tỷ đ / dự án</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 border border-[#E5E7EB] shadow-xs rounded-xl space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Đã giải ngân cam kết (Committed)</span>
                      <p className="text-2xl font-black text-slate-800 font-mono">{formatVND(financialSummary.totalSpent)}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                        <span>Tiến độ thanh toán chung:</span>
                        <span className="font-bold text-blue-600">
                          {((financialSummary.totalSpent / financialSummary.totalBudget) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-5 border border-[#E5E7EB] shadow-xs rounded-xl space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ngân sách còn dư dự phòng</span>
                      <p className="text-2xl font-black text-emerald-600 font-mono">{formatVND(financialSummary.outstanding)}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                        <span>Hạn mức rủi ro dòng tiền:</span>
                        <span className="font-bold text-slate-700">Tối ưu</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget usage detail list table */}
                  <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tình Hình Sử Dụng Ngân Sách Dự Án</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-mono">
                        Cập nhật Q3/2026
                      </span>
                    </div>

                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-[#E5E7EB]">
                          <th className="py-3 px-4 font-sans">Tên Dự Án</th>
                          <th className="py-3 px-4 text-right font-sans">Tổng Ngân Sách</th>
                          <th className="py-3 px-4 text-right font-sans">Đã Sử Dụng</th>
                          <th className="py-3 px-4 text-right font-sans">Cần Thanh Toán IPC</th>
                          <th className="py-3 px-4 text-center font-sans">Tỷ Lệ Tiêu Hao</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-[#E5E7EB] font-medium">
                        {projects.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-slate-800">{p.fullName}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">{formatVND(p.budget)}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-500">{formatVND(p.spent)}</td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">{formatVND(p.ipcActual)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${(p.spent / p.budget) * 100}%` }}
                                  />
                                </div>
                                <span className="font-mono font-bold text-[10px] text-slate-600">
                                  {((p.spent / p.budget) * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MODULE 4: TIMELINE / SCHEDULING */}
              {activeModule === 'timeline' && (
                <TimelineView projects={projects} milestones={milestones} />
              )}

              {/* MODULE 5: WARRANTY / ISSUE TRACKING & RISK KPI */}
              {activeModule === 'issues' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Top sub-tab navigator */}
                  <div className="flex border-b border-slate-200 bg-white p-2 rounded-xl border flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setIssuesSubTab('kanban')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${issuesSubTab === 'kanban'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                      >
                        Sự Cố & Nhật Ký Sự Vụ
                      </button>
                      <button
                        onClick={() => setIssuesSubTab('riskkpi')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${issuesSubTab === 'riskkpi'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${issuesSubTab === 'riskkpi' ? 'text-yellow-300' : 'text-amber-500'}`} />
                        <span>Khó Khăn, Rủi Ro & KPI</span>
                      </button>
                    </div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hidden sm:block">
                      {issuesSubTab === 'kanban' ? 'Hạng Mục Quản Lý Chất Lượng' : 'Hạng Mục Hoạch Định Chiến Lược'}
                    </span>
                  </div>

                  {issuesSubTab === 'kanban' ? (
                    <div className="space-y-6">
                      {/* Warranty Dashboard metrics header */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Tổng số vụ phát hiện</span>
                          <p className="text-lg font-black text-slate-800 font-mono">{issues.length} sự vụ</p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Đang giải quyết</span>
                          <p className="text-lg font-black text-amber-600 font-mono">
                            {issues.filter(i => i.status !== 'Closed').length} sự vụ
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Đã kiểm nghiệm đóng</span>
                          <p className="text-lg font-black text-emerald-600 font-mono">
                            {issues.filter(i => i.status === 'Closed').length} sự vụ
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Tỷ lệ đóng hồ sơ lỗi</span>
                          <p className="text-lg font-black text-blue-600 font-mono">
                            {issues.length > 0 ? ((issues.filter(i => i.status === 'Closed').length / issues.length) * 100).toFixed(1) : '0'}%
                          </p>
                        </div>
                      </div>

                      {/* Core Issue Kanban/Table container */}
                      <IssueKanban
                        issues={issues}
                        projects={projects}
                        onAddIssue={handleAddIssue}
                        onUpdateIssue={handleUpdateIssue}
                        focusedIssueId={focusedIssueId}
                        onFocusHandled={() => setFocusedIssueId(null)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Risk Dashboard metrics header */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Tổng hồ sơ rủi ro</span>
                          <p className="text-lg font-black text-slate-800 font-mono">{risks.length} hồ sơ</p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Chưa xử lý (Opened)</span>
                          <p className="text-lg font-black text-rose-600 font-mono">
                            {risks.filter(r => r.status === 'Unresolved').length} hồ sơ
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Đang triển khai</span>
                          <p className="text-lg font-black text-amber-600 font-mono">
                            {risks.filter(r => r.status === 'In Progress').length} hồ sơ
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Đã tháo gỡ (Resolved)</span>
                          <p className="text-lg font-black text-emerald-600 font-mono">
                            {risks.filter(r => r.status === 'Resolved').length} hồ sơ
                          </p>
                        </div>
                      </div>

                      {/* Risks, Solutions & KPIs Manager Component */}
                      <RiskKpiManager
                        risks={risks}
                        projects={projects}
                        issues={issues}
                        onAddRisk={handleAddRisk}
                        onUpdateRisk={handleUpdateRisk}
                        onDeleteRisk={handleDeleteRisk}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MODULE: EXCEL FILE READER */}
              {activeModule === 'excel-reader' && (
                <ExcelReader
                  projects={projects}
                  setProjects={setProjects}
                  employees={employees}
                  setEmployees={setEmployees}
                  contracts={contracts}
                  setContracts={setContracts}
                  issues={issues}
                  setIssues={setIssues}
                  milestones={milestones}
                  setMilestones={setMilestones}
                  triggerToast={triggerToast}
                  authUser={authUser}
                />
              )}

              {/* MODULE: CHI PHÍ & LƯƠNG ĐÃI NGỘ (cần quyền view_compensation) */}
              {activeModule === 'compensation' && (
                hasPerm(authUser, 'view_compensation')
                  ? <CompensationView />
                  : (
                    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-rose-500" />
                      </div>
                      <h3 className="font-black text-slate-800">Bị khoá</h3>
                      <p className="text-sm text-slate-500 mt-1">Mục Chi phí &amp; Lương đãi ngộ chỉ dành cho Giám đốc điều hành và Quản trị viên.</p>
                    </div>
                  )
              )}

              {/* MODULE: QUẢN LÝ TÀI KHOẢN (admin) */}
              {activeModule === 'users' && authUser.role === 'admin' && (
                <UserAdmin currentUser={authUser} triggerToast={triggerToast} />
              )}

              {/* MODULES 6-10: SINGLE PROJECT PORTALS */}
              {projects.some(p => p.id === activeModule) && (
                <React.Fragment>
                  {(() => {
                    const matchedProj = projects.find(p => p.id === activeModule);
                    if (!matchedProj) return null;
                    return (
                      <ProjectPortal
                        project={matchedProj}
                        team={employees.filter(e => e.department.toLowerCase().includes(matchedProj.id) || e.department === 'PMO' || e.department === 'BIM Center')}
                        contracts={contracts.filter(c => c.projectId === matchedProj.id)}
                        issues={issues.filter(i => i.projectId === matchedProj.id)}
                        cashflow={cashflowData[matchedProj.id] || []}
                        detailedCashflow={detailedCashflow[matchedProj.id] || null}
                        milestones={milestones.filter(m => m.projectId === matchedProj.id)}
                        onAddIssueClick={() => {
                          setActiveModule('issues');
                        }}
                        onViewIssueClick={(iss) => {
                          setIssuesSubTab('kanban');
                          setFocusedIssueId(iss.id);
                          setActiveModule('issues');
                        }}
                      />
                    );
                  })()}
                </React.Fragment>
              )}
            </React.Fragment>
          )}
        </div>

        {/* Footer info branding block */}
        <footer className="py-4 border-t border-slate-100 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest select-none bg-slate-50/50">
          Corporate Enterprise Construction Project Management System • TAN PHAT LONG © 2026
        </footer>
      </main>

      {/* CHANGE PASSWORD MODAL */}
      {showChangePw && (
        <ChangePasswordModal
          onClose={() => setShowChangePw(false)}
          onDone={(msg) => triggerToast(msg, 'success')}
        />
      )}

      {/* GLOBAL NOTIFICATION TOAST OVERLAY */}
      {toast && toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom duration-300 w-full max-w-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className={`w-4 h-4 ${toast.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`} />
            <p className="font-bold">{toast.message}</p>
          </div>
          {toast.undoAction && (
            <button
              onClick={() => {
                toast.undoAction?.();
                setToast(null);
              }}
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-extrabold cursor-pointer border border-indigo-500/20 px-2 py-1 rounded hover:bg-indigo-950/40 transition-colors"
            >
              <Undo2 className="w-3 h-3" />
              <span>Hoàn tác</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// UX STATE PREVIEW DEMO COMPONENT LAYOUTS
// ==========================================

// A. Skeleton loading preview layout
function SkeletonDemo() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-200/60 h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-slate-200/60 h-72 rounded-xl" />
        <div className="bg-slate-200/60 h-72 rounded-xl" />
      </div>
      <div className="bg-slate-200/60 h-40 rounded-xl" />
    </div>
  );
}

// B. Spinner loading indicator view
function LoadingDemo() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
      <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Đang kết nối cơ sở dữ liệu Cloud SQL...</span>
      <p className="text-[11px] text-slate-400">Đang đồng bộ hóa 89 hồ sơ nhân sự, IPC lũy kế và VOs</p>
    </div>
  );
}

// C. Empty state view
function EmptyDemo() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
        <Search className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">Không Tìm Thấy Báo Cáo Phù Hợp</h4>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          Không phát sinh hồ sơ lỗi trong hệ thống vùng chỉ định. Vui lòng thay đổi các trường lọc nâng cao của bạn.
        </p>
      </div>
    </div>
  );
}

// D. Access Control / Permission state view
function PermissionDemo() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm animate-bounce">
        <Lock className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">Truy Cập Bị Giới Hạn (Restricted Permission)</h4>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          Bạn cần quyền đặc cách cấp Giám Đốc Tài Chính (CFO) hoặc CEO để xem ngân sách thầu phụ và chi tiết lương của Ban Điều Hành.
        </p>
      </div>
    </div>
  );
}

// E. Error State view
function ErrorDemo() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6 animate-ping" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">Lỗi Đồng Bộ Hóa Tài Chính (Connection Failed)</h4>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          Không thể kết nối đến máy chủ Oracle Primavera để đồng bộ hóa. Mã lỗi: <span className="font-mono text-rose-600 font-extrabold">PRIMA_CONN_ERR_503</span>.
        </p>
      </div>
    </div>
  );
}

// F. Page 404 Not Found view
function PageNotFoundDemo() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
      <span className="text-5xl font-black text-indigo-100 font-mono">404</span>
      <div className="space-y-1">
        <h4 className="font-bold text-slate-800 text-sm">Liên Kết Không Tồn Tại</h4>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          Hạng mục dự toán hoặc tệp dữ liệu đã bị dịch chuyển vị trí hoặc bị hủy bỏ trên hệ thống lưu trữ tổng.
        </p>
      </div>
    </div>
  );
}
