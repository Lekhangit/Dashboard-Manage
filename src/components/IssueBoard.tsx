/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from 'react';
import { List, LayoutGrid, X, Lock, Send, MessageSquare } from 'lucide-react';
import { Issue, Project, AuthUser } from '../types';
import { apiListComments, apiPostComment } from '../authClient';
import { DataTable, Column, money, txt, StatusPill, SectionCard, ProjectFilter } from './tableKit';

interface Props {
  issues: Issue[];
  projects?: Project[];
  authUser?: AuthUser | null;
}

// Map a free-text status onto one of the four Kanban lanes.
const LANES = ['Opened', 'Pending', 'On-going', 'Closed'] as const;
type Lane = (typeof LANES)[number] | 'Khác';
const laneOf = (status?: string): Lane => {
  const s = (status || '').toLowerCase();
  if (/close/.test(s)) return 'Closed';
  if (/pending/.test(s)) return 'Pending';
  if (/going|ongoing/.test(s)) return 'On-going';
  if (/open/.test(s)) return 'Opened';
  return 'Khác';
};
const laneColor: Record<string, string> = {
  Opened: 'text-blue-600 bg-blue-50 border-blue-200',
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  'On-going': 'text-violet-600 bg-violet-50 border-violet-200',
  Closed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Khác': 'text-slate-600 bg-slate-50 border-slate-200',
};

interface Comment { id: string; user: string; userName: string; role: string; text: string; createdAt: string; }

function ChatPanel({ issueId, authUser }: { issueId: string; authUser?: AuthUser | null }) {
  const canChat = authUser?.role === 'gddh' || authUser?.role === 'cht';
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiListComments(issueId).then(d => { if (!cancelled) setComments(d as Comment[]); }).catch(() => {});
    return () => { cancelled = true; };
  }, [issueId]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true); setErr('');
    try {
      const c = await apiPostComment(issueId, t);
      setComments(prev => [...prev, c as Comment]);
      setText('');
    } catch (e: any) { setErr(e?.message || 'Không gửi được'); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
        <MessageSquare className="w-4 h-4 text-[#104e8b]" /> Thảo luận chỉ đạo (CEO / Chỉ huy)
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[120px]">
        {comments.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có trao đổi nào.</p>}
        {comments.map(c => (
          <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-slate-700">{c.userName || c.user}</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#104e8b]/10 text-[#104e8b]">{c.role}</span>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{c.text}</p>
            <span className="block text-[10px] text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
          </div>
        ))}
      </div>
      {canChat ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {err && <p className="text-[11px] text-rose-600 mb-1">{err}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder="Nhập chỉ đạo…"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#104e8b]/30"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="shrink-0 w-9 h-9 rounded-lg bg-[#104e8b] text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5" /> Chỉ Giám đốc điều hành và Ban chỉ huy (CHT) được nhắn tin.
        </div>
      )}
    </div>
  );
}

function IssueDetail({ issue, authUser, onClose }: { issue: Issue; authUser?: AuthUser | null; onClose: () => void }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-xs py-1.5 border-b border-slate-50">
      <span className="text-slate-400 font-semibold">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm truncate pr-4">{txt(issue.problem)}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          <Row label="Dự án" value={txt(issue.project)} />
          <Row label="Ngày ghi nhận" value={txt(issue.loggedDate)} />
          <Row label="Người phụ trách" value={txt(issue.assignee)} />
          <Row label="Giải pháp" value={txt(issue.solution)} />
          <Row label="Kết quả" value={txt(issue.result)} />
          <Row label="VO / BOQ" value={money(issue.voBoq)} />
          <Row label="Ngân sách" value={money(issue.budget)} />
          <Row label="Dự kiến HT" value={txt(issue.plannedDate)} />
          <Row label="Thực tế HT" value={txt(issue.actualDate)} />
          <Row label="Tình trạng" value={<StatusPill status={issue.status} />} />
        </div>
        <div className="flex-1 border-t border-slate-100 p-4 overflow-hidden">
          <ChatPanel issueId={issue.id} authUser={authUser} />
        </div>
      </div>
    </div>
  );
}

export function IssueBoard({ issues, authUser }: Props) {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [proj, setProj] = useState('');
  const [selected, setSelected] = useState<Issue | null>(null);

  const projectOptions = useMemo(
    () => [...new Set(issues.map(i => (i.project || '').trim()).filter(Boolean))].sort(),
    [issues],
  );
  const rows = issues.filter(i => !proj || (i.project || '').trim() === proj);

  const lanes = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    for (const l of LANES) map[l] = [];
    const extra: Issue[] = [];
    for (const it of rows) {
      const l = laneOf(it.status);
      if (l === 'Khác') extra.push(it); else map[l].push(it);
    }
    return { map, extra };
  }, [rows]);

  const cols: Column<Issue>[] = [
    { header: 'Ngày ghi nhận', render: r => txt(r.loggedDate) },
    { header: 'Dự án', render: r => <span className="font-semibold text-slate-700">{txt(r.project)}</span> },
    { header: 'Người phụ trách', render: r => txt(r.assignee) },
    { header: 'Vấn đề', render: r => <span className="text-slate-700">{txt(r.problem)}</span> },
    { header: 'Giải pháp', render: r => <span className="text-slate-500">{txt(r.solution)}</span> },
    { header: 'VO/BOQ', align: 'right', render: r => money(r.voBoq) },
    { header: 'Ngân sách', align: 'right', render: r => money(r.budget) },
    { header: 'Dự kiến', render: r => txt(r.plannedDate) },
    { header: 'Thực tế', render: r => txt(r.actualDate) },
    { header: 'Tình trạng', align: 'center', render: r => <StatusPill status={r.status} /> },
  ];

  const Toggle = ({ v, label, icon: Icon }: { v: 'list' | 'kanban'; label: string; icon: any }) => (
    <button
      onClick={() => setView(v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
        view === v ? 'bg-[#104e8b] text-white' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Vấn Đề Phát Sinh & Bảo Hành"
        right={
          <div className="flex items-center gap-2">
            <ProjectFilter value={proj} onChange={setProj} options={projectOptions} />
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
              <Toggle v="list" label="Danh sách" icon={List} />
              <Toggle v="kanban" label="Kanban" icon={LayoutGrid} />
            </div>
          </div>
        }
      >
        {view === 'list' ? (
          <div className="[&_tbody_tr]:cursor-pointer" onClick={(e) => {
            const tr = (e.target as HTMLElement).closest('tr');
            if (!tr || !tr.parentElement || tr.parentElement.tagName !== 'TBODY') return;
            const idx = Array.from(tr.parentElement.children).indexOf(tr);
            if (rows[idx]) setSelected(rows[idx]);
          }}>
            <DataTable columns={cols} rows={rows} minWidthClass="min-w-[1100px]" emptyLabel="Chưa có vấn đề." />
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <div className="flex gap-3 min-w-[900px]">
              {[...LANES, ...(lanes.extra.length ? ['Khác' as const] : [])].map(lane => {
                const items = lane === 'Khác' ? lanes.extra : lanes.map[lane];
                return (
                  <div key={lane} className="flex-1 min-w-[210px]">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold mb-2 ${laneColor[lane]}`}>
                      <span>{lane}</span>
                      <span>{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((it, i) => (
                        <button
                          key={i}
                          onClick={() => setSelected(it)}
                          className="w-full text-left bg-white border border-slate-200 rounded-lg p-2.5 hover:border-[#104e8b] hover:shadow-sm transition-all"
                        >
                          <p className="text-xs font-semibold text-slate-700 line-clamp-2">{txt(it.problem)}</p>
                          <span className="block text-[10px] text-slate-400 mt-1">DA: {txt(it.project)}</span>
                        </button>
                      ))}
                      {items.length === 0 && <p className="text-[11px] text-slate-300 italic px-1">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {selected && <IssueDetail issue={selected} authUser={authUser} onClose={() => setSelected(null)} />}
    </div>
  );
}
