/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RiskAndKpi, Project, Issue } from '../types';
import { ShieldAlert, CheckCircle, AlertTriangle, Plus, Sparkles, Send, Trash2, Edit2, FileDown, Search, ArrowRight, HelpCircle, Loader2 } from 'lucide-react';

interface RiskKpiManagerProps {
  risks: RiskAndKpi[];
  projects: Project[];
  issues: Issue[];
  onAddRisk: (risk: RiskAndKpi) => void;
  onUpdateRisk: (risk: RiskAndKpi) => void;
  onDeleteRisk: (id: string) => void;
}

export const RiskKpiManager: React.FC<RiskKpiManagerProps> = ({
  risks,
  projects,
  issues,
  onAddRisk,
  onUpdateRisk,
  onDeleteRisk
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRisk, setActiveRisk] = useState<RiskAndKpi | null>(null);

  // Form states
  const [formProjectId, setFormProjectId] = useState('');
  const [formRiskText, setFormRiskText] = useState('');
  const [formSolutionText, setFormSolutionText] = useState('');
  const [formKpiText, setFormKpiText] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formStatus, setFormStatus] = useState<'Unresolved' | 'In Progress' | 'Resolved'>('Opened' as any);
  
  // AI Consult loading state
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter lists
  const filteredRisks = risks.filter(risk => {
    const matchesSearch = 
      risk.riskText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.solutionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.assignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || risk.projectId === selectedProject;
    
    // Status normalization
    let matchesStatus = true;
    if (selectedStatus !== 'all') {
      matchesStatus = risk.status === selectedStatus;
    }
    return matchesSearch && matchesProject && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setActiveRisk(null);
    setFormProjectId(projects[0]?.id || '');
    setFormRiskText('');
    setFormSolutionText('');
    setFormKpiText('');
    setFormAssignee(projects[0]?.manager || '');
    setFormStatus('Unresolved');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (risk: RiskAndKpi) => {
    setActiveRisk(risk);
    setFormProjectId(risk.projectId);
    setFormRiskText(risk.riskText);
    setFormSolutionText(risk.solutionText);
    setFormKpiText(risk.kpiText);
    setFormAssignee(risk.assignee);
    setFormStatus(risk.status);
    setIsModalOpen(true);
  };

  const handleImportFromIssue = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      setFormRiskText(`Sự cố hiện trường: ${issue.issueText}`);
      setFormProjectId(issue.projectId);
      setFormAssignee(issue.assignee);
      
      // Pre-fill action text as the draft solution
      if (issue.actionText) {
        setFormSolutionText(issue.actionText);
      }
    }
  };

  // Consult Gemini AI on the server
  const handleAiConsult = async () => {
    if (!formRiskText.trim()) {
      alert('Vui lòng nhập thông tin Khó khăn - Vướng mắc trước khi nhờ AI tư vấn.');
      return;
    }

    setIsAiLoading(true);
    const selectedProj = projects.find(p => p.id === formProjectId);

    try {
      const res = await fetch('/api/ai/suggest-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskText: formRiskText,
          projectName: selectedProj ? selectedProj.fullName : 'Vinacon Project'
        })
      });

      if (!res.ok) {
        throw new Error('API server returned error code');
      }

      const data = await res.json();
      if (data.solution) {
        setFormSolutionText(data.solution);
      }
      if (data.kpi) {
        setFormKpiText(data.kpi);
      }
    } catch (err) {
      console.error('Failed to contact Gemini endpoint:', err);
      // Client-side fallback just in case
      setFormSolutionText(`[Giải pháp PMO đề xuất] Lập tổ công tác hiện trường, điều động kỹ sư trưởng giám sát liên tục hạng mục phát sinh. Đàm phán trực tiếp để ký biên bản bổ sung phụ lục giá trị thầu phụ.`);
      setFormKpiText(`Hoàn thành giải quyết dứt điểm vướng mắc trong vòng 5 ngày làm việc. Sai lệch ngân sách phát sinh dưới 5%.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === formProjectId);
    const projName = proj ? proj.name : 'Khác';

    if (activeRisk) {
      const updated: RiskAndKpi = {
        ...activeRisk,
        projectId: formProjectId,
        projectName: projName,
        riskText: formRiskText,
        solutionText: formSolutionText,
        kpiText: formKpiText,
        assignee: formAssignee,
        status: formStatus
      };
      onUpdateRisk(updated);
    } else {
      const newRisk: RiskAndKpi = {
        id: `RSK-0${risks.length + 1}`,
        projectId: formProjectId,
        projectName: projName,
        riskText: formRiskText,
        solutionText: formSolutionText,
        kpiText: formKpiText,
        assignee: formAssignee,
        status: formStatus
      };
      onAddRisk(newRisk);
    }
    setIsModalOpen(false);
  };

  const exportToCSV = () => {
    const headers = ['Mã', 'Dự Án', 'Khó Khăn - Vướng Mắc - Rủi Ro', 'Giải Pháp & Kế Hoạch', 'KPI Đánh Giá', 'Người Phụ Trách', 'Trạng Thái'];
    const rows = filteredRisks.map(r => [
      r.id,
      r.projectName,
      r.riskText.replace(/,/g, ';'),
      r.solutionText.replace(/,/g, ';'),
      r.kpiText.replace(/,/g, ';'),
      r.assignee,
      r.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_Kho_Khan_KPI_Vinacon_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-3xl">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm rủi ro, giải pháp, người đảm nhiệm..."
              className="pl-9 pr-4 py-2 w-full text-xs font-semibold bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Project Filter */}
          <select
            className="px-3 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">Tất cả dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="px-3 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Unresolved">Chưa giải quyết</option>
            <option value="In Progress">Đang xử lý</option>
            <option value="Resolved">Đã hoàn thành</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-slate-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi nhận Khó Khăn & KPI</span>
          </button>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Hồ Sơ Khó Khăn - Rủi Ro - Giải Pháp & KPI Tổng Thể</h3>
            <p className="text-[11px] text-slate-400 mt-1">Hệ thống theo dõi các rào cản kỹ thuật, quản lý, nhân sự và mốc hoàn thành cam kết</p>
          </div>
          <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {filteredRisks.length} Hồ Sơ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-[#E5E7EB]">
                <th className="py-3.5 px-4 w-20">Mã</th>
                <th className="py-3.5 px-4 w-36">Dự Án</th>
                <th className="py-3.5 px-4 w-1/3">KHÓ KHĂN - VƯỚNG MẮC - RỦI RO</th>
                <th className="py-3.5 px-4 w-1/3">GIẢI PHÁP & KẾ HOẠCH HÀNH ĐỘNG</th>
                <th className="py-3.5 px-4">KPI ĐÁNH GIÁ</th>
                <th className="py-3.5 px-4">Người Phụ Trách</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#E5E7EB] font-medium text-slate-700">
              {filteredRisks.map(risk => (
                <tr key={risk.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-4 px-4 font-mono font-bold text-slate-500">{risk.id}</td>
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <span className="px-2 py-1 rounded bg-slate-100/80 border border-slate-200 text-[10px]">
                      {risk.projectName}
                    </span>
                  </td>
                  <td className="py-4 px-4 leading-relaxed font-bold text-slate-800">
                    {risk.riskText}
                  </td>
                  <td className="py-4 px-4 leading-relaxed text-slate-600">
                    {risk.solutionText || <span className="text-slate-300 italic">Chưa lập kế hoạch giải quyết</span>}
                  </td>
                  <td className="py-4 px-4 leading-relaxed font-semibold text-indigo-700">
                    {risk.kpiText || <span className="text-slate-300 italic">-</span>}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-600 font-sans">
                    {risk.assignee}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      risk.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      risk.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {risk.status === 'Resolved' ? 'Hoàn thành' :
                       risk.status === 'In Progress' ? 'Đang xử lý' : 'Chưa giải quyết'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(risk)}
                        className="p-1.5 hover:bg-slate-100 text-blue-600 rounded cursor-pointer transition-colors"
                        title="Sửa thông tin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Bạn chắc chắn muốn xoá hồ sơ khó khăn rủi ro này?')) {
                            onDeleteRisk(risk.id);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded cursor-pointer transition-colors"
                        title="Xoá bỏ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRisks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <p>Không phát hiện khó khăn rủi ro nào khớp với bộ lọc.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Card banner */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-white text-xs">Phân tích rủi ro & KPIs thông minh với Gemini AI</h4>
            <p className="text-[11px] text-slate-400">Bạn có thể lấy nhanh rào cản từ các sự vụ hiện trường phát sinh hoặc nhập tự do, sau đó nhờ AI tư vấn bộ giải pháp & KPIs chuẩn PMI.</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
          Powered by Gemini 3.5 Flash
        </span>
      </div>

      {/* 3. Create / Edit Risk Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-black text-slate-800 text-sm uppercase">
                {activeRisk ? `Cập Nhật Hồ Sơ ${activeRisk.id}` : 'Ghi Nhận Khó Khăn & Chỉ Số KPI Mới'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Dự án áp dụng</label>
                  <select
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      const p = projects.find(proj => proj.id === e.target.value);
                      if (p) setFormAssignee(p.manager);
                    }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">Người phụ trách xử lý</label>
                  <input
                    type="text"
                    required
                    placeholder="Họ tên người phụ trách"
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                  />
                </div>
              </div>

              {/* LẤY DỮ LIỆU TỪ SỰ CỐ HIỆN TRƯỜNG OPTION */}
              {!activeRisk && issues.filter(i => i.status !== 'Closed').length > 0 && (
                <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="block font-bold text-blue-900 text-[11px]">Nạp nhanh từ Nhật ký sự vụ hiện trường</span>
                    <span className="block text-[10px] text-blue-700">Chọn sự cố chưa giải quyết để điền tự động nội dung khó khăn rủi ro.</span>
                  </div>
                  <select
                    className="px-2 py-1.5 border border-blue-200 rounded text-[11px] bg-white text-slate-700 focus:outline-none font-bold"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleImportFromIssue(e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>-- Chọn Sự Cố Hiện Trường --</option>
                    {issues.filter(i => i.status !== 'Closed').map(issue => (
                      <option key={issue.id} value={issue.id}>
                        [{issue.id}] {issue.projectName} - {issue.issueText.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* KHÓ KHĂN - VƯỚNG MẮC */}
              <div className="space-y-1">
                <label className="text-slate-500 flex justify-between">
                  <span>KHÓ KHĂN - VƯỚNG MẮC - RỦI RO PHÁT SINH (*)</span>
                  <span className="text-blue-500 uppercase text-[10px]">Nhập tay hoặc nhập từ danh sách sự cố trên</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể khó khăn, vướng mắc pháp lý, tài chính hoặc rủi ro kỹ thuật xảy ra tại công trường..."
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 font-sans leading-relaxed"
                  value={formRiskText}
                  onChange={(e) => setFormRiskText(e.target.value)}
                />
              </div>

              {/* BUTTON TO CALL GEMINI AI ON BACKEND */}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isAiLoading || !formRiskText.trim()}
                  onClick={handleAiConsult}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg font-black transition-all cursor-pointer shadow-sm border border-slate-900"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini đang phân tích rủi ro...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                      <span>Nhờ AI lập Giải pháp & KPI tư vấn</span>
                    </>
                  )}
                </button>
              </div>

              {/* GIẢI PHÁP & KPI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">GIẢI PHÁP, KẾ HOẠCH HÀNH ĐỘNG & KIẾN NGHỊ</label>
                  <textarea
                    rows={4}
                    placeholder="Phương án xử lý kỹ thuật, đàm phán thương thảo chủ đầu tư hoặc điều chuyển nhân sự để tháo gỡ khó khăn..."
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 font-sans leading-relaxed"
                    value={formSolutionText}
                    onChange={(e) => setFormSolutionText(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 block">CHỈ SỐ ĐÁNH GIÁ (KPI) & MỐC THỜI HẠN</label>
                  <textarea
                    rows={4}
                    placeholder="Chỉ số đo lường hiệu quả (ví dụ: bổ sung xong nhân sự trước 30/08, duyệt VO trong vòng 7 ngày...)"
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 font-sans leading-relaxed text-indigo-900"
                    value={formKpiText}
                    onChange={(e) => setFormKpiText(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Trạng thái giải quyết</label>
                  <select
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-slate-800 focus:outline-none focus:ring-2"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Unresolved">Chưa giải quyết (Opened)</option>
                    <option value="In Progress">Đang xử lý (In Progress)</option>
                    <option value="Resolved">Đã hoàn thành (Resolved)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg cursor-pointer shadow-sm"
                >
                  {activeRisk ? 'Cập Nhật Hồ Sơ' : 'Lưu Hồ Sơ Khó Khăn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
