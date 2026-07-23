import React, { useState } from 'react';
import { KeyRound, X, Loader2 } from 'lucide-react';
import { apiChangePassword } from '../authClient';

export const ChangePasswordModal: React.FC<{
  onClose: () => void;
  onDone: (msg: string) => void;
}> = ({ onClose, onDone }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (next.length < 6) { setErr('Mật khẩu mới phải từ 6 ký tự trở lên'); return; }
    if (next !== confirm) { setErr('Xác nhận mật khẩu không khớp'); return; }
    setSaving(true);
    try {
      await apiChangePassword(current, next);
      onDone('Đổi mật khẩu thành công');
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Lỗi đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Đổi mật khẩu</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          {[
            { label: 'Mật khẩu hiện tại', v: current, set: setCurrent },
            { label: 'Mật khẩu mới', v: next, set: setNext },
            { label: 'Xác nhận mật khẩu mới', v: confirm, set: setConfirm },
          ].map((f, i) => (
            <div key={i}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{f.label}</label>
              <input type="password" value={f.v} onChange={(e) => f.set(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
          {err && <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{err}</div>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">Huỷ</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Cập nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
