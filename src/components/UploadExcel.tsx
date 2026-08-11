/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Upload Excel & cập nhật dashboard NGAY (chỉ admin). Định dạng mẫu:
 * TPL Project Management BIM (1).xlsx.
 */
import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthUser } from '../types';
import { apiImportNow } from '../authClient';

interface Props {
  authUser: AuthUser;
  onImported?: () => void;
  triggerToast: (m: string, t?: 'success' | 'info' | 'error') => void;
}

export function UploadExcel({ authUser, onImported, triggerToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ filename: string; stats: any } | null>(null);
  const isAdmin = authUser.role === 'admin';

  const pick = (f: File | null) => {
    if (f && !/\.xlsx$/i.test(f.name)) { triggerToast('Chỉ nhận file .xlsx', 'error'); return; }
    setFile(f);
  };

  const doImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await apiImportNow(file);
      setLast({ filename: r.filename, stats: r.stats });
      triggerToast('Đã import & cập nhật dashboard từ file Excel!', 'success');
      onImported?.();
    } catch (e: any) {
      triggerToast(e?.message || 'Lỗi import', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs p-6 text-sm text-slate-500">
        Chỉ <b>Quản trị viên</b> được upload &amp; cập nhật dữ liệu dashboard.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Upload Excel — Cập nhật Dashboard</h3>
      </div>
      <div className="p-5 space-y-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] || null); }}
          className="cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#104e8b] hover:bg-slate-50 transition-colors"
        >
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {file.name}
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-600">Kéo-thả hoặc bấm để chọn file <b>.xlsx</b></p>
              <p className="text-xs text-slate-400 mt-1">Định dạng theo mẫu: <b>TPL Project Management BIM (1).xlsx</b></p>
            </>
          )}
          <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => pick(e.target.files?.[0] || null)} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={doImport}
            disabled={!file || busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#104e8b] text-white text-sm font-bold disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {busy ? 'Đang import…' : 'Import & cập nhật dashboard'}
          </button>
          {file && !busy && (
            <button onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Bỏ chọn</button>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Lưu ý: import sẽ <b>thay thế toàn bộ dữ liệu</b> hiện tại bằng dữ liệu trong file (clean-replace) và cập nhật ngay lên dashboard.
        </p>

        {last && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-bold mb-1"><CheckCircle2 className="w-4 h-4" /> Đã áp dụng: {last.filename}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-semibold">
              <span>Dự án: {last.stats?.projects}</span>
              <span>Nhân sự: {last.stats?.employees}</span>
              <span>Hợp đồng: {last.stats?.contracts}</span>
              <span>IPC: {last.stats?.ipc}</span>
              <span>Ngân sách: {last.stats?.budgetItems}</span>
              <span>Vấn đề: {last.stats?.issues}</span>
              <span>Công việc: {last.stats?.todos}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
