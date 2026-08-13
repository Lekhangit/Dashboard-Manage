/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, Employee, Contract, Ipc, BudgetItem, Issue, Todo, Analytics, AuthUser, ROLE_LABELS, hasPerm, PermissionKey } from './types';
import { AuthScreen } from './components/AuthScreen';
import { UserAdmin } from './components/UserAdmin';
import { UploadHistory } from './components/UploadHistory';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Overview } from './components/Overview';
import { ProjectPortal } from './components/ProjectPortal';
import { Resource } from './components/Resource';
import { ContractsIpc } from './components/ContractsIpc';
import { Budget } from './components/Budget';
import { IssueBoard } from './components/IssueBoard';
import { Todos } from './components/Todos'; // ẩn khỏi menu (còn giữ để phát triển thêm)
import { Compensation } from './components/Compensation';
import { ProjectsEffectiveness } from './components/ProjectsEffectiveness';
import { BudgetDashboard } from './components/BudgetDashboard';
import { WarrantyTable } from './components/WarrantyTable';
import { UploadExcel } from './components/UploadExcel';
import {
  apiMe, clearToken, getToken,
  apiGetProjects, apiGetEmployees, apiGetContracts, apiGetIpc, apiGetBudget, apiGetIssues, apiGetTodos, apiGetAnalytics
} from './authClient';
import {
  LayoutDashboard,
  Layers,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Wallet,
  UserCog,
  History,
  ChevronRight,
  LogOut,
  KeyRound,
  ShieldAlert,
  Loader2,
  Menu,
  Receipt,
  PieChart,
  Wrench,
} from 'lucide-react';

// ---- Danh sách các phân hệ (module) hiển thị trên sidebar ----
interface ModuleDef {
  key: string;
  label: string;
  icon: any;
  perm?: PermissionKey;
  adminOnly?: boolean;
}

const MODULES: ModuleDef[] = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'resource', label: 'Nhân Sự Khối Dự Án', icon: Users },
  { key: 'contracts', label: 'Hợp Đồng - Phụ Lục - VO', icon: FileText },
  { key: 'ipc', label: 'IPC Dự Án', icon: Receipt },
  { key: 'budget', label: 'Ngân Sách Dự Án', icon: DollarSign },
  { key: 'projects', label: 'Hiệu Quả Dự Án', icon: Layers },
  { key: 'issues', label: 'Chance Management', icon: AlertTriangle },
  { key: 'warranty', label: 'Phòng Bảo Hành Bảo Trì', icon: Wrench },
  // Hệ thống (giữ để vận hành; ẩn theo quyền)
  { key: 'compensation', label: 'Chi phí & Lương', icon: Wallet, perm: 'view_compensation' },
  { key: 'users', label: 'Quản lý tài khoản', icon: UserCog, adminOnly: true },
  { key: 'uploads', label: 'Upload & Lịch sử', icon: History },
];

export default function App() {
  // ---- Global UI state ----
  // Điều hướng được lưu vào localStorage để reload không văng về Dashboard.
  const [activeModule, setActiveModule] = useState<string>(() => localStorage.getItem('tpl_active_module') || 'overview');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false); // mobile drawer
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => localStorage.getItem('tpl_selected_project') || null);
  const [dashboardTab, setDashboardTab] = useState<'project' | 'budget'>(() => (localStorage.getItem('tpl_dashboard_tab') as 'project' | 'budget') || 'project');
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [showChangePw, setShowChangePw] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error'; visible: boolean } | null>(null);

  // ---- Auth state ----
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // ---- Domain data state ----
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [ipc, setIpc] = useState<Ipc[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

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
    ['tpl_active_module', 'tpl_selected_project', 'tpl_dashboard_tab'].forEach(k => localStorage.removeItem(k));
    setAuthUser(null);
    setActiveModule('overview');
    setSelectedProjectId(null);
  };

  // Load all business datasets once after authentication
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setDataError(null);
      try {
        const [projRes, empRes, conRes, ipcRes, budgetRes, issRes, todoRes, analyticsRes] = await Promise.all([
          apiGetProjects(),
          apiGetEmployees(),
          apiGetContracts(),
          apiGetIpc(),
          apiGetBudget(),
          apiGetIssues(),
          apiGetTodos(),
          apiGetAnalytics(),
        ]);
        if (cancelled) return;
        setProjects(projRes);
        setEmployees(empRes);
        setContracts(conRes);
        setIpc(ipcRes);
        setBudget(budgetRes);
        setIssues(issRes);
        setTodos(todoRes);
        setAnalytics(analyticsRes);
      } catch (err: any) {
        if (!cancelled) setDataError(err.message || 'Không thể tải dữ liệu hệ thống');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser, dataRefreshKey]);

  // Lưu điều hướng để reload giữ nguyên trang / dự án / tab dashboard.
  useEffect(() => { localStorage.setItem('tpl_active_module', activeModule); }, [activeModule]);
  useEffect(() => { localStorage.setItem('tpl_dashboard_tab', dashboardTab); }, [dashboardTab]);
  useEffect(() => {
    if (selectedProjectId) localStorage.setItem('tpl_selected_project', selectedProjectId);
    else localStorage.removeItem('tpl_selected_project');
  }, [selectedProjectId]);

  // Sau khi biết quyền: nếu trang đã lưu là trang user không được phép -> về Dashboard.
  useEffect(() => {
    if (!authUser) return;
    const allowed = MODULES.filter(m => {
      if (m.adminOnly && authUser.role !== 'admin') return false;
      if (m.perm && !hasPerm(authUser, m.perm)) return false;
      return true;
    }).map(m => m.key);
    if (!allowed.includes(activeModule)) setActiveModule('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
  };

  // Sidebar: filter modules by role/permission
  const visibleModules = MODULES.filter(m => {
    if (m.adminOnly && authUser?.role !== 'admin') return false;
    if (m.perm && !hasPerm(authUser, m.perm)) return false;
    return true;
  });

  const goToModule = (key: string) => {
    setActiveModule(key);
    setSelectedProjectId(null);
    setSidebarOpen(false);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

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
    <div className="min-h-screen flex bg-[#F3F4F6] text-[#1A1C1E]">
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
              <img src="/logo.png" alt="Logo" className="w-full max-h-20 object-contain" />
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

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <span className="block text-[9px] uppercase font-extrabold text-[#6B7280] px-3 mb-2 tracking-widest">Tân Phát Long DashBoard Manage</span>
            {visibleModules.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.key && !selectedProject;
              return (
                <button
                  key={item.key}
                  onClick={() => goToModule(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${isActive
                      ? 'bg-[#1F2937] text-white border-l-4 border-blue-500 shadow-sm'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-[#6B7280]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.key === 'issues' && issues.length > 0 && (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold">
                      {issues.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
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
        {/* Top bar with Breadcrumbs & mobile menu button */}
        <header className="h-14 border-b flex items-center justify-between gap-3 flex-shrink-0 transition-all px-4 sm:px-6 bg-white border-[#E5E7EB]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4B5563] select-none min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0"
              title="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <span className="hidden sm:inline">Corporate Management</span>
              <ChevronRight className="w-3 h-3 text-[#9CA3AF] shrink-0 hidden sm:inline" />
              <span className="text-[#111827] font-bold truncate">
                {selectedProject ? (selectedProject.name || 'Hồ sơ dự án') : (visibleModules.find(m => m.key === activeModule)?.label || 'Tổng Quan')}
              </span>
            </div>
          </div>
        </header>

        {/* 3. MODULE CONTENT */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          {dataLoading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Đang tải dữ liệu hệ thống...</span>
            </div>
          )}

          {!dataLoading && dataError && (
            <div className="bg-white border border-rose-200 rounded-xl shadow-xs p-8 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Lỗi tải dữ liệu</p>
              <p className="text-xs text-slate-500">{dataError}</p>
            </div>
          )}

          {!dataLoading && !dataError && (
            <>
              {selectedProject ? (
                <ProjectPortal
                  project={selectedProject}
                  employees={employees.filter(e => e.project === selectedProject.name)}
                  contracts={contracts.filter(c => c.project === selectedProject.name)}
                  ipc={ipc.filter(i => i.project === selectedProject.name)}
                  budget={budget.filter(b => b.project === selectedProject.name)}
                  issues={issues.filter(i => i.project === selectedProject.name)}
                  todos={todos.filter(t => t.project === selectedProject.name)}
                  authUser={authUser}
                  onBack={() => setSelectedProjectId(null)}
                />
              ) : (
                <>
                  {activeModule === 'overview' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {([['project', 'Khối Dự Án'], ['budget', 'Ngân Sách Dự Án']] as const).map(([k, label]) => (
                          <button
                            key={k}
                            onClick={() => setDashboardTab(k)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${dashboardTab === k ? 'bg-[#8b1a1a] text-white' : 'bg-white border border-[#E5E7EB] text-slate-500 hover:text-slate-800'}`}
                          >
                            Dashboard — {label}
                          </button>
                        ))}
                      </div>
                      {dashboardTab === 'project'
                        ? <Overview projects={projects} employees={employees} analytics={analytics} issues={issues} contracts={contracts} />
                        : <BudgetDashboard budget={budget} issues={issues} projects={projects} />}
                    </div>
                  )}
                  {activeModule === 'projects' && (
                    <ProjectsEffectiveness projects={projects} onSelect={setSelectedProjectId} />
                  )}
                  {activeModule === 'resource' && <Resource employees={employees} projects={projects} authUser={authUser} />}
                  {activeModule === 'contracts' && <ContractsIpc contracts={contracts} ipc={ipc} projects={projects} initialTab="contracts" />}
                  {activeModule === 'ipc' && <ContractsIpc contracts={contracts} ipc={ipc} projects={projects} initialTab="ipc" />}
                  {activeModule === 'budget' && <Budget budget={budget} projects={projects} />}
                  {activeModule === 'issues' && <IssueBoard issues={issues} todos={todos} projects={projects} authUser={authUser} />}
                  {activeModule === 'warranty' && <WarrantyTable />}
                  {/* To Do List: tạm ẩn khỏi menu, giữ route để phát triển thêm */}
                  {activeModule === 'todos' && <Todos todos={todos} projects={projects} />}
                  {activeModule === 'compensation' && (
                    hasPerm(authUser, 'view_compensation')
                      ? <Compensation employees={employees} />
                      : (
                        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-6 h-6 text-rose-500" />
                          </div>
                          <h3 className="font-black text-slate-800">Bị khoá</h3>
                          <p className="text-sm text-slate-500 mt-1">Mục Chi phí &amp; Lương đãi ngộ chỉ dành cho Giám đốc điều hành và Quản trị viên.</p>
                        </div>
                      )
                  )}
                  {activeModule === 'users' && authUser.role === 'admin' && (
                    <UserAdmin currentUser={authUser} triggerToast={triggerToast} />
                  )}
                  {activeModule === 'uploads' && (
                    <div className="space-y-4">
                      <UploadExcel authUser={authUser} triggerToast={triggerToast} onImported={() => setDataRefreshKey(k => k + 1)} />
                      <UploadHistory authUser={authUser} triggerToast={triggerToast} refreshKey={dataRefreshKey} />
                    </div>
                  )}
                </>
              )}
            </>
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
        </div>
      )}
    </div>
  );
}
