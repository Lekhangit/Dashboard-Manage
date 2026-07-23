/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Issue, Project, AuthUser, ROLE_LABELS } from '../types';
import { Kanban, List, Plus, Search, FileDown, Eye, Edit2, AlertCircle, CheckCircle2, CircleDot, User, DollarSign, Calendar, MessageSquare, Paperclip, Briefcase, Send, Loader2, Lock } from 'lucide-react';
import { apiListComments, apiPostComment } from '../authClient';

interface IssueKanbanProps {
  issues: Issue[];
  projects: Project[];
  onAddIssue: (issue: Issue) => void;
  onUpdateIssue: (issue: Issue) => void;
  focusedIssueId?: string | null;
  onFocusHandled?: () => void;
  authUser: AuthUser;
}

export const IssueKanban: React.FC<IssueKanbanProps> = ({
  issues,
  projects,
  onAddIssue,
  onUpdateIssue,
  focusedIssueId,
  onFocusHandled,
  authUser
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<'Opened' | 'In Progress' | 'Closed' | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Form states for creating/editing
  const [formProjectId, setFormProjectId] = useState(projects[0]?.id || '');
  const [formAssignee, setFormAssignee] = useState('');
  const [formIssueText, setFormIssueText] = useState('');
  const [formActionText, setFormActionText] = useState('');
  const [formVoAmount, setFormVoAmount] = useState('0');
  const [formBudget, setFormBudget] = useState('0');
  const [formTargetComplete, setFormTargetComplete] = useState('');
  const [formStatus, setFormStatus] = useState<'Opened' | 'In Progress' | 'Closed'>('Opened');

  // Chat "Thảo luận chỉ đạo" — lưu server, chỉ CEO Phương (GĐĐH) & Ban chỉ huy (CHT) được gửi
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const canChat = authUser.role === 'gddh' || authUser.role === 'cht';

  const loadComments = async (issueId: string) => {
    setCommentsLoading(true);
    try { setComments(await apiListComments(issueId)); }
    catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  // Tải tin nhắn khi mở chi tiết một vấn đề
  useEffect(() => {
    if (isDetailOpen && activeIssue) loadComments(activeIssue.id);
    else setComments([]);
  }, [isDetailOpen, activeIssue?.id]);

  const handleAddComment = async () => {
    if (!activeIssue || !commentText.trim() || !canChat) return;
    setPostingComment(true);
    try {
      await apiPostComment(activeIssue.id, commentText.trim());
      setCommentText('');
      await loadComments(activeIssue.id);
    } catch (e: any) {
      alert(e.message || 'Không gửi được tin nhắn');
    } finally {
      setPostingComment(false);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesSearch =
      issue.issueText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === 'all' || issue.projectId === selectedProject;
    const matchesStatus = selectedStatus === 'all' || issue.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  // For the list view: pin the focused issue to the very top (even if it was filtered out).
  const displayIssues = (() => {
    if (!highlightId) return filteredIssues;
    const target = issues.find(i => i.id === highlightId);
    const rest = filteredIssues.filter(i => i.id !== highlightId);
    return target ? [target, ...rest] : filteredIssues;
  })();

  // Export as CSV helper
  const exportToCSV = () => {
    const headers = ['Mã', 'Dự Án', 'Người Phụ Trách', 'Vấn Đề Phát Sinh', 'Giải Pháp', 'Ngân Sách', 'Hạn Hoàn Thành', 'Trạng Thái'];
    const rows = filteredIssues.map(issue => [
      issue.id,
      issue.projectName,
      issue.assignee,
      issue.issueText.replace(/,/g, ';'),
      issue.actionText.replace(/,/g, ';'),
      issue.budget,
      issue.targetComplete,
      issue.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_issue_construction_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddModal = () => {
    setActiveIssue(null);
    setFormProjectId(projects[0]?.id || '');
    setFormAssignee('');
    setFormIssueText('');
    setFormActionText('');
    setFormVoAmount('0');
    setFormBudget('0');
    setFormTargetComplete('');
    setFormStatus('Opened');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (issue: Issue) => {
    setActiveIssue(issue);
    setFormProjectId(issue.projectId);
    setFormAssignee(issue.assignee);
    setFormIssueText(issue.issueText);
    setFormActionText(issue.actionText);
    setFormVoAmount(issue.voAmount.toString());
    setFormBudget(issue.budget.toString());
    setFormTargetComplete(issue.targetComplete);
    setFormStatus(issue.status);
    setIsModalOpen(true);
  };

  const handleViewDetails = (issue: Issue) => {
    setActiveIssue(issue);
    setIsDetailOpen(true);
  };

  // When navigated here from a project's "Chi tiết" link: reveal that exact issue —
  // switch to list view, clear filters so it isn't hidden, pin+highlight it and open detail.
  useEffect(() => {
    if (!focusedIssueId) return;
    const target = issues.find(i => i.id === focusedIssueId);
    if (target) {
      setHighlightId(focusedIssueId);
      setViewMode('table');
      setSearchTerm('');
      setSelectedProject('all');
      setSelectedStatus('all');
      setActiveIssue(target);
      setIsDetailOpen(true);
      setTimeout(() => {
        document.getElementById(`issue-row-${focusedIssueId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
    onFocusHandled?.(); // clear app-level focus so it doesn't retrigger on remount
  }, [focusedIssueId, issues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === formProjectId);
    const projName = proj ? proj.name : 'Khác';

    if (activeIssue) {
      // Update
      const updated: Issue = {
        ...activeIssue,
        projectId: formProjectId,
        projectName: projName,
        assignee: formAssignee,
        issueText: formIssueText,
        actionText: formActionText,
        voAmount: parseFloat(formVoAmount) || 0,
        budget: parseFloat(formBudget) || 0,
        targetComplete: formTargetComplete,
        status: formStatus,
        actualComplete: formStatus === 'Closed' ? new Date().toISOString().slice(0, 10) : ''
      };
      onUpdateIssue(updated);
    } else {
      // Create
      const newIssue: Issue = {
        id: `ISS-0${issues.length + 1}`,
        projectId: formProjectId,
        projectName: projName,
        loggedDate: new Date().toISOString().slice(0, 10),
        assignee: formAssignee,
        issueText: formIssueText,
        actionText: formActionText,
        resultText: 'Chưa có kết quả cập nhật',
        voAmount: parseFloat(formVoAmount) || 0,
        budget: parseFloat(formBudget) || 0,
        targetComplete: formTargetComplete,
        actualComplete: '',
        status: 'Opened'
      };
      onAddIssue(newIssue);
    }
    setIsModalOpen(false);
  };

  const handleStatusChangeOnBoard = (issue: Issue, nextStatus: 'Opened' | 'In Progress' | 'Closed') => {
    const updated: Issue = {
      ...issue,
      status: nextStatus,
      actualComplete: nextStatus === 'Closed' ? new Date().toISOString().slice(0, 10) : ''
    };
    onUpdateIssue(updated);
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã, vấn đề, người phụ trách..."
              className="pl-9 pr-4 py-2 w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Project filter */}
          <select
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">Tất cả dự án</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status filter */}
          {viewMode === 'table' && (
            <select
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Opened">Opened (Mới phát hiện)</option>
              <option value="In Progress">In Progress (Đang xử lý)</option>
              <option value="Closed">Closed (Đã nghiệm thu)</option>
            </select>
          )}
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2">
          {/* Layout switches */}
          <div className="flex bg-white border border-slate-200 p-0.5 rounded shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Xem Kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Xem Bảng"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Báo cáo Phát Sinh</span>
          </button>
        </div>
      </div>

      {/* 1. Kanban Layout */}
      {/* 1. Kanban Layout */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Opened */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDraggedOverColumn('Opened');
            }}
            onDragLeave={() => {
              if (draggedOverColumn === 'Opened') {
                setDraggedOverColumn(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const issueId = e.dataTransfer.getData("text/plain");
              const issueToMove = issues.find(i => i.id === issueId);
              if (issueToMove && issueToMove.status !== 'Opened') {
                handleStatusChangeOnBoard(issueToMove, 'Opened');
              }
              setDraggedOverColumn(null);
            }}
            className={`rounded-xl p-4 border transition-all duration-200 flex flex-col min-h-[450px] ${
              draggedOverColumn === 'Opened'
                ? 'bg-indigo-50/50 border-indigo-400 border-dashed ring-2 ring-indigo-400/20 shadow-xs'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-slate-400 animate-pulse" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Opened (Chưa xử lý)</span>
              </div>
              <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                {filteredIssues.filter(i => i.status === 'Opened').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {filteredIssues.filter(i => i.status === 'Opened').map(issue => (
                <KanbanCard
                  key={issue.id}
                  issue={issue}
                  onEdit={() => handleOpenEditModal(issue)}
                  onView={() => handleViewDetails(issue)}
                  onMove={(next) => handleStatusChangeOnBoard(issue, next)}
                />
              ))}
              {filteredIssues.filter(i => i.status === 'Opened').length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">Không có issue cột này</div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDraggedOverColumn('In Progress');
            }}
            onDragLeave={() => {
              if (draggedOverColumn === 'In Progress') {
                setDraggedOverColumn(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const issueId = e.dataTransfer.getData("text/plain");
              const issueToMove = issues.find(i => i.id === issueId);
              if (issueToMove && issueToMove.status !== 'In Progress') {
                handleStatusChangeOnBoard(issueToMove, 'In Progress');
              }
              setDraggedOverColumn(null);
            }}
            className={`rounded-xl p-4 border transition-all duration-200 flex flex-col min-h-[450px] ${
              draggedOverColumn === 'In Progress'
                ? 'bg-amber-50/50 border-amber-400 border-dashed ring-2 ring-amber-400/20 shadow-xs'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">In Progress (Đang thực hiện)</span>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">
                {filteredIssues.filter(i => i.status === 'In Progress').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {filteredIssues.filter(i => i.status === 'In Progress').map(issue => (
                <KanbanCard
                  key={issue.id}
                  issue={issue}
                  onEdit={() => handleOpenEditModal(issue)}
                  onView={() => handleViewDetails(issue)}
                  onMove={(next) => handleStatusChangeOnBoard(issue, next)}
                />
              ))}
              {filteredIssues.filter(i => i.status === 'In Progress').length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">Không có issue cột này</div>
              )}
            </div>
          </div>

          {/* Column 3: Closed */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDraggedOverColumn('Closed');
            }}
            onDragLeave={() => {
              if (draggedOverColumn === 'Closed') {
                setDraggedOverColumn(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const issueId = e.dataTransfer.getData("text/plain");
              const issueToMove = issues.find(i => i.id === issueId);
              if (issueToMove && issueToMove.status !== 'Closed') {
                handleStatusChangeOnBoard(issueToMove, 'Closed');
              }
              setDraggedOverColumn(null);
            }}
            className={`rounded-xl p-4 border transition-all duration-200 flex flex-col min-h-[450px] ${
              draggedOverColumn === 'Closed'
                ? 'bg-emerald-50/30 border-emerald-400 border-dashed ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Closed (Đã nghiệm thu)</span>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                {filteredIssues.filter(i => i.status === 'Closed').length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {filteredIssues.filter(i => i.status === 'Closed').map(issue => (
                <KanbanCard
                  key={issue.id}
                  issue={issue}
                  onEdit={() => handleOpenEditModal(issue)}
                  onView={() => handleViewDetails(issue)}
                  onMove={(next) => handleStatusChangeOnBoard(issue, next)}
                />
              ))}
              {filteredIssues.filter(i => i.status === 'Closed').length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">Không có issue cột này</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. List/Table Layout */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider border-b border-slate-100">
                <th className="py-3 px-4 w-20">Mã</th>
                <th className="py-3 px-4 whitespace-nowrap">Ngày Ghi Nhận</th>
                <th className="py-3 px-4">Dự Án</th>
                <th className="py-3 px-4">Vấn Đề Phát Sinh</th>
                <th className="py-3 px-4">Giải Pháp Hành Động</th>
                <th className="py-3 px-4">Người Phụ Trách</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">VO / BOQ</th>
                <th className="py-3 px-4 text-right">Ngân Sách</th>
                <th className="py-3 px-4">Tình Trạng</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 font-medium">
              {displayIssues.map(issue => (
                <tr
                  key={issue.id}
                  id={`issue-row-${issue.id}`}
                  className={`transition-colors ${
                    issue.id === highlightId
                      ? 'bg-blue-50 ring-2 ring-inset ring-blue-500 shadow-sm'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                    {issue.id === highlightId && <span className="mr-1 text-blue-600">▶</span>}
                    {issue.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{issue.loggedDate || '-'}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{issue.projectName}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate" title={issue.issueText}>{issue.issueText}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-500" title={issue.actionText}>{issue.actionText}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-semibold">{issue.assignee}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                    {issue.voAmount > 0 ? issue.voAmount.toLocaleString() + ' đ' : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                    {issue.budget > 0 ? issue.budget.toLocaleString() + ' đ' : '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      issue.status === 'Opened' ? 'bg-slate-100 text-slate-700' :
                      issue.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewDetails(issue)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(issue)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayIssues.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy vấn đề phát sinh nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Create / Edit Issue Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-sm">
                {activeIssue ? `Chỉnh Sửa Báo Cáo ${activeIssue.id}` : 'Ghi Nhận Vấn Đề Phát Sinh Mới'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Dự án xảy ra sự vụ</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Người chịu trách nhiệm xử lý</label>
                  <input
                    type="text"
                    required
                    placeholder="Họ và tên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Mô tả Vấn đề phát sinh (Lỗi / Thiệt hại)</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Mô tả sự việc chi tiết..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                  value={formIssueText}
                  onChange={(e) => setFormIssueText(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Biện pháp xử lý / Kế hoạch hành động</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ghi rõ hành động khắc phục..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-medium"
                  value={formActionText}
                  onChange={(e) => setFormActionText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Giá trị phát sinh VO (VND)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-mono"
                    value={formVoAmount}
                    onChange={(e) => setFormVoAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500">Ngân sách dự chi (VND)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-mono"
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Dự kiến hoàn thành</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none font-mono"
                    value={formTargetComplete}
                    onChange={(e) => setFormTargetComplete(e.target.value)}
                  />
                </div>

                {activeIssue && (
                  <div className="space-y-1">
                    <label className="text-slate-500">Trạng thái giải quyết</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                    >
                      <option value="Opened">Opened</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
                >
                  Lưu Báo Cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Issue Detailed View Slideover/Modal */}
      {isDetailOpen && activeIssue && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-indigo-600 text-xs">{activeIssue.id}</span>
                <span className="text-slate-300">|</span>
                <span className="font-bold text-slate-800 text-xs">{activeIssue.projectName}</span>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-semibold text-slate-600">
              {/* Main Info */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                {(activeIssue as any).item ? (
                  <span className="inline-block mb-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                    Hạng mục: {(activeIssue as any).item}
                  </span>
                ) : null}
                <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Vấn đề phát sinh</span>
                <p className="text-slate-800 font-bold text-sm leading-relaxed">{activeIssue.issueText}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    activeIssue.status === 'Opened' ? 'bg-slate-100 text-slate-700' :
                    activeIssue.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {activeIssue.status}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 font-mono">Ghi nhận ngày: {activeIssue.loggedDate || '—'}</span>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-1 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Giải pháp hành động</span>
                <p className="text-slate-700 leading-relaxed font-semibold">{activeIssue.actionText || '—'}</p>
              </div>

              {/* Result (if present in file) */}
              {activeIssue.resultText ? (
                <div className="space-y-1 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                  <span className="block text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 mb-1">Kết quả</span>
                  <p className="text-slate-700 leading-relaxed font-semibold">{activeIssue.resultText}</p>
                </div>
              ) : null}

              {/* Finance & Timeline Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4 font-mono">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <User className="w-3.5 h-3.5" />
                    <span>Phụ trách</span>
                  </div>
                  <span className="block text-slate-800 font-bold text-xs">{activeIssue.assignee}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>VO / BOQ (báo giá)</span>
                  </div>
                  <span className="block text-rose-600 font-extrabold text-xs">
                    {activeIssue.voAmount > 0 ? activeIssue.voAmount.toLocaleString() + ' đ' : '-'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Ngân sách (khắc phục)</span>
                  </div>
                  <span className="block text-indigo-600 font-extrabold text-xs">
                    {activeIssue.budget > 0 ? activeIssue.budget.toLocaleString() + ' đ' : 'Thương thảo CĐT'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Dự kiến hoàn thành</span>
                  </div>
                  <span className="block text-slate-800 font-bold text-xs">{activeIssue.targetComplete || '—'}</span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Thực tế hoàn thành</span>
                  </div>
                  <span className="block text-emerald-700 font-bold text-xs">{activeIssue.actualComplete || '—'}</span>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Dự án</span>
                  </div>
                  <span className="block text-slate-800 font-bold text-xs">{activeIssue.projectName}</span>
                </div>
              </div>

              {/* Comments Section — chat chỉ đạo (chỉ CEO Phương & Ban chỉ huy được gửi) */}
              <div className="space-y-3">
                <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Thảo luận chỉ đạo (CEO / Chỉ huy)
                </span>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {commentsLoading && (
                    <div className="flex items-center justify-center py-4 text-slate-400 text-[11px]"><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Đang tải...</div>
                  )}
                  {!commentsLoading && comments.map((cmt) => {
                    const mine = cmt.user === authUser.username;
                    return (
                      <div key={cmt.id} className={`p-2.5 rounded-lg border ${mine ? 'bg-indigo-50 border-indigo-100 ml-6' : 'bg-slate-50 border-slate-100 mr-6'}`}>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 gap-2">
                          <span className="font-bold text-slate-700 truncate">
                            {cmt.userName}
                            <span className="ml-1 font-normal text-indigo-500">· {ROLE_LABELS[cmt.role as keyof typeof ROLE_LABELS] || cmt.role}</span>
                          </span>
                          <span className="font-mono shrink-0">{cmt.createdAt ? new Date(cmt.createdAt).toLocaleString('vi-VN') : ''}</span>
                        </div>
                        <p className="text-slate-700 font-semibold text-[11px] leading-relaxed whitespace-pre-wrap">{cmt.text}</p>
                      </div>
                    );
                  })}
                  {!commentsLoading && comments.length === 0 && (
                    <div className="text-center py-4 text-slate-400 font-medium text-[11px]">Chưa có thảo luận nào.</div>
                  )}
                </div>

                {/* Comment input — chỉ GĐĐH (CEO Phương) & CHT (Ban chỉ huy) được gửi */}
                {canChat ? (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Nhập ý kiến chỉ đạo..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 text-xs"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !postingComment) handleAddComment(); }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={postingComment || !commentText.trim()}
                      className="px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gửi
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Chỉ <b>Giám đốc điều hành (CEO Phương)</b> và <b>Ban chỉ huy (CHT)</b> được nhắn tin. Bạn chỉ có thể xem.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Kanban Card
const KanbanCard: React.FC<{
  issue: Issue;
  onEdit: () => void;
  onView: () => void;
  onMove: (next: 'Opened' | 'In Progress' | 'Closed') => void;
}> = ({ issue, onEdit, onView, onMove }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", issue.id);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      className={`bg-white p-3.5 rounded-lg border transition-all duration-200 space-y-3 relative group cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-40 border-indigo-400 scale-95 shadow-inner bg-indigo-50/20'
          : 'border-slate-200/60 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-[10px] text-slate-400">{issue.id}</span>
        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50/70 border border-indigo-100/50 px-1.5 py-0.5 rounded">
          {issue.projectName}
        </span>
      </div>

      {/* Title */}
      <p className="text-xs font-bold text-slate-800 leading-relaxed hover:text-indigo-600 cursor-pointer" onClick={onView}>
        {issue.issueText}
      </p>

      {/* Action excerpt */}
      <p className="text-[10px] font-semibold text-slate-400 line-clamp-1">{issue.actionText}</p>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px] font-bold">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-slate-500">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[90px]">{issue.assignee || '—'}</span>
          </div>
          <span className="font-mono text-slate-400">{issue.loggedDate || '—'}</span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span className="flex items-center gap-1 text-rose-600" title="VO / BOQ (phát sinh báo giá)">
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
            VO {issue.voAmount > 0 ? (issue.voAmount / 1e6).toFixed(0) + 'M' : '-'}
          </span>
          <span className="text-indigo-600" title="Ngân sách khắc phục">
            NS {issue.budget > 0 ? (issue.budget / 1e6).toFixed(0) + 'M' : '-'}
          </span>
        </div>
      </div>

      {/* Hover action bar to view or edit */}
      <div className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded border border-slate-100 flex items-center p-0.5 gap-0.5">
        <button onClick={onView} className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer" title="Xem">
          <Eye className="w-3 h-3" />
        </button>
        <button onClick={onEdit} className="p-1 hover:bg-slate-200 text-slate-500 rounded cursor-pointer" title="Sửa">
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
