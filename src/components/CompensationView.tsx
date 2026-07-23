import React, { useEffect, useState } from 'react';
import { Wallet, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { apiGetCompensation } from '../authClient';

const fmt = (v: any) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  if (!isNaN(n) && n !== 0) return Math.round(n).toLocaleString('vi-VN') + ' đ';
  return String(v) === '0' ? '—' : String(v);
};

export const CompensationView: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRows(await apiGetCompensation());
      } catch (e: any) {
        if (String(e.message).includes('quyền') || String(e.message).includes('403')) setDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải...</div>;
  }

  if (denied) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-rose-500" />
        </div>
        <h3 className="font-black text-slate-800">Bị khoá</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Mục <b>Chi phí &amp; Lương đãi ngộ</b> chỉ dành cho <b>Giám đốc điều hành</b> và <b>Quản trị viên</b>.
          Vui lòng liên hệ admin nếu cần cấp quyền.
        </p>
      </div>
    );
  }

  const totalCost = rows.reduce((s, r) => {
    const n = parseFloat(String(r.cost || '').replace(/[^0-9.\-]/g, ''));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Số nhân sự</span>
          <p className="text-xl font-black text-slate-800 font-mono mt-1">{rows.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng chi phí nhân sự</span>
          <p className="text-xl font-black text-indigo-600 font-mono mt-1">{totalCost ? Math.round(totalCost).toLocaleString('vi-VN') + ' đ' : '—'}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-[11px] font-semibold text-slate-500">Dữ liệu mật — chỉ hiển thị cho người được cấp quyền.</span>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Chi phí & Lương đãi ngộ theo nhân sự</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Bộ phận / Dự án</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Chức danh</th>
                <th className="py-3 px-4 text-right">Lương</th>
                <th className="py-3 px-4 text-right">BHXH + BHYT + CĐ</th>
                <th className="py-3 px-4 text-right">Phụ cấp</th>
                <th className="py-3 px-4 text-right">Chi phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{r.department || '—'}</span></td>
                  <td className="py-3 px-4 font-bold text-slate-800">{r.name}</td>
                  <td className="py-3 px-4 text-slate-600">{r.title || '—'}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{fmt(r.salary)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{fmt(r.insurance)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{fmt(r.allowance)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">{fmt(r.cost)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Chưa có dữ liệu lương/chi phí trong file.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
