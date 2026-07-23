import React, { useState } from 'react';
import { Lock, User, LogIn, ShieldCheck, Loader2 } from 'lucide-react';
import { apiLogin, setToken } from '../authClient';
import { AuthUser } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await apiLogin(username.trim(), password);
      setToken(token);
      onAuthenticated(user);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden px-4">
      {/* decorative glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
            <img src="/uploads/images/logo1-1775554290.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="text-left">
            <h1 className="text-white font-black tracking-wide leading-none">VINACON</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300 font-bold">Enterprise Suite</p>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-black text-white mb-1">Đăng nhập hệ thống</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">Tân Phát Long DashBoard Manage</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Tên đăng nhập</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="vd: admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/60 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-5 flex items-start gap-2 text-[11px] text-slate-400 border-t border-white/10 pt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Tài khoản do <b className="text-slate-300">quản trị viên</b> cấp. Lần đầu: đăng nhập <b className="text-slate-300">admin / admin123</b> rồi đổi mật khẩu &amp; tạo tài khoản cho nhân sự.</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6 uppercase tracking-widest font-bold">
          Corporate Construction PM System • VinaCON © 2026
        </p>
      </div>
    </div>
  );
};
