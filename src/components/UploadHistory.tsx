import React, { useEffect, useState } from 'react';
import { History, Check, X, Clock, ShieldCheck, RefreshCw, CheckCircle2, XCircle, Loader2, Eye, Download, Search, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { apiListUploads, apiApproveUpload, apiRejectUpload, apiPreviewUpload, apiDownloadUpload } from '../authClient';

const statusBadge = (s: string) => {
  if (s === 'applied') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Đã áp dụng</span>;
  if (s === 'rejected') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3 h-3" /> Từ chối</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Chờ duyệt</span>;
};

const appr = (ok: boolean, by: string, label: string) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${ok ? 'text-emerald-600' : 'text-slate-400'}`} title={by ? `bởi ${by}` : ''}>
    {ok ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {label}{ok && by ? ` ✓` : ''}
  </span>
);

export const UploadHistory: React.FC<{ authUser: AuthUser; refreshKey?: number; triggerToast: (m: string, t?: 'success' | 'info' | 'error') => void; }> = ({ authUser, refreshKey, triggerToast }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Preview Modal States
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);

  const canDecide = authUser.role === 'admin' || authUser.role === 'gddh';

  const load = async () => {
    setLoading(true);
    try { setRows(await apiListUploads()); } catch (e: any) { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [refreshKey]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const r = await apiApproveUpload(id);
      triggerToast(r.status === 'applied' ? 'Giám đốc đã duyệt — dữ liệu Excel đã được áp dụng vào hệ thống!' : 'Đã ghi nhận duyệt từ Admin. Chờ Giám đốc điều hành (Đỗ Việt Phương) duyệt.', 'success');
      if (r.status === 'applied') setTimeout(() => window.location.reload(), 1500);
      load();
      if (previewId === id) {
        setPreviewId(null);
        setPreviewData(null);
      }
    } catch (e: any) { triggerToast(e.message, 'error'); } finally { setBusy(null); }
  };

  const reject = async (id: string) => {
    if (!confirm('Từ chối yêu cầu upload này?')) return;
    setBusy(id);
    try {
      await apiRejectUpload(id);
      triggerToast('Đã từ chối yêu cầu.', 'info');
      load();
      if (previewId === id) {
        setPreviewId(null);
        setPreviewData(null);
      }
    } catch (e: any) { triggerToast(e.message, 'error'); } finally { setBusy(null); }
  };

  const handleOpenPreview = async (id: string) => {
    setPreviewId(id);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setActiveSheetIndex(0);
    setSearchTerm('');
    try {
      const res = await apiPreviewUpload(id);
      setPreviewData(res);
    } catch (e: any) {
      setPreviewError(e?.message || 'Không thể tải bản xem trước');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (id: string, filename: string) => {
    setDownloading(true);
    try {
      await apiDownloadUpload(id, filename);
      triggerToast('Đã tải xuống file Excel thành công', 'success');
    } catch (e: any) {
      triggerToast(e?.message || 'Lỗi khi tải file', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const currentSheet = previewData?.sheets?.[activeSheetIndex];
  const rawRows: any[][] = currentSheet?.data || [];

  const filteredRows = rawRows.filter((row: any[]) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return row.some((cell: any) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(term));
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Lịch sử & Duyệt Upload</h3>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      <div className="px-4 py-2.5 bg-indigo-50/40 border-b border-indigo-100 flex items-start gap-2 text-[11px] text-slate-600">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <span>File Excel sẽ được <b>áp dụng vào hệ thống ngay khi Giám đốc điều hành (Đỗ Việt Phương)</b> duyệt. Giám đốc có thể xem trước nội dung file Excel trước khi quyết định duyệt.</span>
      </div>


      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
              <th className="py-2.5 px-3">Tên file</th>
              <th className="py-2.5 px-3">Người đăng</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Thời gian</th>
              <th className="py-2.5 px-3 text-center">Duyệt</th>
              <th className="py-2.5 px-3 text-center">Trạng thái</th>
              <th className="py-2.5 px-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-semibold text-slate-700 max-w-[220px] truncate" title={r.filename}>{r.filename}</td>
                <td className="py-2.5 px-3 text-slate-600">
                  <span className="font-bold text-slate-800">{r.requestedByName}</span>
                  <span className="block text-[10px] text-slate-400">@{r.requestedBy}</span>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                  {r.requestedAt ? new Date(r.requestedAt).toLocaleString('vi-VN') : '—'}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-col gap-0.5">
                    {appr(r.adminApproved, r.adminBy, 'Admin')}
                    {appr(r.gddhApproved, r.gddhBy, 'GĐĐH')}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">{statusBadge(r.status)}</td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleOpenPreview(r.id)}
                      title="Xem trước nội dung Excel"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Xem trước
                    </button>

                    {canDecide && r.status === 'pending' && (
                      <>
                        <button onClick={() => approve(r.id)} disabled={busy === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold disabled:opacity-50 transition-colors cursor-pointer">
                          {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Duyệt
                        </button>
                        <button onClick={() => reject(r.id)} disabled={busy === r.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold transition-colors cursor-pointer">
                          <X className="w-3 h-3" /> Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">Chưa có yêu cầu upload nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white max-w-md truncate" title={previewData?.filename || 'File Excel'}>
                      {previewData?.filename || 'Đang tải file Excel...'}
                    </h3>
                    {previewData && statusBadge(previewData.status)}
                  </div>
                  {previewData && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Người gửi: <b>{previewData.requestedByName}</b> (@{previewData.requestedBy})</span>
                      <span>•</span>
                      <span>{new Date(previewData.requestedAt).toLocaleString('vi-VN')}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewData && (
                  <button
                    onClick={() => handleDownload(previewData.id, previewData.filename)}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                    Tải file gốc
                  </button>
                )}
                <button
                  onClick={() => { setPreviewId(null); setPreviewData(null); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/50">
              {previewLoading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-xs font-semibold">Đang đọc nội dung file Excel từ máy chủ...</p>
                </div>
              )}

              {previewError && (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 my-auto">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Không thể xem trước file Excel</h4>
                    <p className="text-xs mt-0.5">{previewError}</p>
                  </div>
                </div>
              )}

              {previewData && !previewLoading && (
                <>
                  {/* Approval Status Banner inside Modal */}
                  <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="flex items-center gap-4">
                        <span>Trạng thái duyệt:</span>
                        <div className="flex items-center gap-3">
                          {appr(previewData.adminApproved, previewData.adminBy, 'Admin')}
                          {appr(previewData.gddhApproved, previewData.gddhBy, 'Giám đốc (GĐĐH)')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Worksheet Tabs & Search */}
                  <div className="flex items-center justify-between gap-3 mb-3 bg-white p-2 border border-slate-200 rounded-xl shrink-0">
                    {/* Sheet Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto max-w-2xl py-0.5">
                      {previewData.sheets?.map((sheet: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSheetIndex(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeSheetIndex === idx
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          {sheet.name}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSheetIndex === idx ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>
                            {sheet.data?.length || 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-64 shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm ô dữ liệu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Excel Data Grid Table */}
                  <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-inner max-h-[50vh]">
                    {filteredRows.length > 0 ? (
                      <table className="w-full border-collapse text-left text-xs font-mono">
                        <thead>
                          {filteredRows.slice(0, 1).map((row: any[], rowIndex: number) => (
                            <tr key={rowIndex} className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-300 font-bold text-slate-800">
                              <td className="p-2 border-r border-slate-200 bg-slate-200/70 text-slate-500 text-[10px] text-center w-12 shrink-0">#</td>
                              {row.map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} className="p-2 border-r border-slate-200 max-w-[280px] truncate bg-slate-100 font-sans text-slate-700">
                                  {cell !== null && cell !== undefined ? String(cell) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredRows.slice(1).map((row: any[], rowIndex: number) => (
                            <tr key={rowIndex} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="p-2 border-r border-slate-200 bg-slate-50 text-slate-400 font-mono text-[10px] text-center select-none">
                                {rowIndex + 2}
                              </td>
                              {row.map((cell: any, cellIndex: number) => (
                                <td key={cellIndex} className="p-2 border-r border-slate-100 max-w-[280px] truncate text-slate-700 font-normal">
                                  {cell !== null && cell !== undefined ? String(cell) : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-16 text-center text-slate-400 font-sans text-xs">
                        {searchTerm ? 'Không tìm thấy kết quả phù hợp với từ khóa.' : 'Trang tính này không có dữ liệu.'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                {previewData && (
                  <span>
                    Hiển thị <b>{filteredRows.length}</b> dòng dữ liệu trong Sheet <b>"{currentSheet?.name}"</b>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canDecide && previewData?.status === 'pending' && (
                  <>
                    <button
                      onClick={() => approve(previewData.id)}
                      disabled={busy === previewData.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {busy === previewData.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Duyệt ngay ({authUser.role === 'gddh' ? 'Giám đốc' : 'Admin'})
                    </button>

                    <button
                      onClick={() => reject(previewData.id)}
                      disabled={busy === previewData.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Từ chối
                    </button>
                  </>
                )}

                <button
                  onClick={() => { setPreviewId(null); setPreviewData(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
