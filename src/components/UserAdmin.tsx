import React, { useEffect, useState } from 'react';
import { UserPlus, Users, ShieldCheck, RefreshCw, Check, X, KeyRound, Loader2 } from 'lucide-react';
import { AuthUser, Role, ROLE_LABELS, ROLE_ORDER, hasPerm } from '../types';
import { apiListUsers, apiCreateUser, apiUpdateUser } from '../authClient';

const roleBadgeClass: Record<Role, string> = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
  gddh: 'bg-violet-50 text-violet-700 border-violet-200',
  cht: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  pm: 'bg-blue-50 text-blue-700 border-blue-200',
  qa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  thu_ky: 'bg-slate-100 text-slate-700 border-slate-200',
  tai_chinh: 'bg-amber-50 text-amber-700 border-amber-200',
  nhan_su: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
};

export const UserAdmin: React.FC<{ currentUser: AuthUser; triggerToast: (m: string, t?: 'success' | 'info' | 'error') => void; }> = ({ currentUser, triggerToast }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', fullName: '', password: '', role: 'thu_ky' as Role });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await apiListUsers()); } catch (e: any) { triggerToast(e.message, 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setSaving(true);
    try {
      await apiCreateUser({ ...form, username: form.username.trim() });
      triggerToast(`Đã tạo tài khoản "${form.username}"`, 'success');
      setForm({ username: '', fullName: '', password: '', role: 'thu_ky' });
      load();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  const changeRole = async (u: AuthUser, role: Role) => {
    try { await apiUpdateUser(u.id, { role }); triggerToast(`Đã đổi quyền ${u.username} → ${ROLE_LABELS[role]}`, 'success'); load(); }
    catch (e: any) { triggerToast(e.message, 'error'); }
  };
  const toggleActive = async (u: AuthUser) => {
    try { await apiUpdateUser(u.id, { active: !u.active }); load(); }
    catch (e: any) { triggerToast(e.message, 'error'); }
  };
  const toggleComp = async (u: AuthUser) => {
    const has = (u.permissions || []).includes('view_compensation');
    const permissions = has
      ? (u.permissions || []).filter(p => p !== 'view_compensation')
      : [...(u.permissions || []), 'view_compensation'];
    try {
      await apiUpdateUser(u.id, { permissions });
      triggerToast(`${has ? 'Đã khoá' : 'Đã mở'} quyền xem Chi phí & Lương đãi ngộ cho ${u.username}`, 'success');
      load();
    } catch (e: any) { triggerToast(e.message, 'error'); }
  };
  const resetPassword = async (u: AuthUser) => {
    const pw = prompt(`Đặt lại mật khẩu mới cho "${u.username}" (tối thiểu 6 ký tự):`);
    if (!pw) return;
    try { await apiUpdateUser(u.id, { password: pw }); triggerToast(`Đã đặt lại mật khẩu cho ${u.username}`, 'success'); }
    catch (e: any) { triggerToast(e.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      {/* Create account */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Tạo tài khoản mới</h3>
        </div>
        <form onSubmit={create} className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên đăng nhập</label>
            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="vd: nguyenvana" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Họ và tên</label>
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="Nguyễn Văn A" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mật khẩu</label>
            <input required type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="≥ 6 ký tự" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vai trò / Quyền</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white">
              {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="lg:col-span-1">
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Tạo tài khoản
            </button>
          </div>
          {err && <div className="lg:col-span-5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{err}</div>}
        </form>
      </div>

      {/* Users list */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Danh sách tài khoản ({users.length})</h3>
          </div>
          <button onClick={load} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Tên đăng nhập</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Vai trò / Quyền</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{u.username}{u.username === currentUser.username && <span className="ml-1 text-[9px] text-indigo-500">(bạn)</span>}</td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">{u.fullName || '—'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={e => changeRole(u, e.target.value as Role)}
                      className={`px-2 py-1 rounded border text-[11px] font-bold cursor-pointer focus:outline-none ${roleBadgeClass[u.role]}`}
                    >
                      {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => toggleActive(u)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {u.active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {u.active ? 'Hoạt động' : 'Đã khoá'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => resetPassword(u)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:bg-slate-100 hover:text-indigo-600 font-bold" title="Đặt lại mật khẩu">
                      <KeyRound className="w-3.5 h-3.5" /> Đặt lại MK
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-medium">Chưa có tài khoản nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50/40">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>Giai đoạn này hệ thống chỉ <b>lưu &amp; hiển thị vai trò</b>. Giới hạn chức năng theo từng quyền sẽ được phát triển sau.</span>
        </div>
      </div>
    </div>
  );
};
