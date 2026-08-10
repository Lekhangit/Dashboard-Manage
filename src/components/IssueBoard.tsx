/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chance Management — two switchable Kanban boards (like the Excel):
 *  • KANBAN - CHANCE LOGS (issues / warranty)
 *  • KANBAN BOARD - QUẢN LÝ CÔNG VIỆC BẢN THÂN (personal to-do)
 * Chance-log cards open a detail drawer with the role-gated chat.
 */
import React, { useMemo, useState } from 'react';
import { X, Lock, Send, MessageSquare, AlertTriangle, CheckSquare } from 'lucide-react';
import { Issue, Todo, Project, AuthUser } from '../types';
import { apiListComments, apiPostComment } from '../authClient';
import { txt, StatusPill } from './tableKit';
import { money } from './tableKit';

interface Props {
  issues: Issue[];
  todos?: Todo[];
  projects?: Project[];
  authUser?: AuthUser | null;
}

const LANES = ['Opened', 'Pending', 'On-going', 'Closed'] as const;
type Lane = (typeof LANES)[number];
const laneOf = (status?: string): Lane => {
  const s = (status || '').toLowerCase();
  if (/close/.test(s)) return 'Closed';
  if (/pending/.test(s)) return 'Pending';
  if (/going|ongoing/.test(s)) return 'On-going';
  return 'Opened';
};
const laneHead: Record<Lane, string> = {
  Opened: 'bg-[#b8860b] text-white',
  Pending: 'bg-[#b91c1c] text-white',
  'On-going': 'bg-[#2f75b5] text-white',
  Closed: 'bg-[#548235] text-white',
};
const laneBody: Record<Lane, string> = {
  Opened: 'bg-amber-50/60',
  Pending: 'bg-rose-50/60',
  'On-going': 'bg-blue-50/60',
  Closed: 'bg-emerald-50/50',
};

interface Comment { id: string; user: string; userName: string; role: string; text: string; createdAt: string; }

function ChatPanel({ issueId, authUser }: { issueId: string; authUser?: AuthUser | null }) {
  const canChat = authUser?.role === 'gddh' || authUser?.role === 'cht';
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  React.useEffect(() => {
    let c = false;
    apiListComments(issueId).then(d => { if (!c) setComments(d as Comment[]); }).catch(() => {});
    return () => { c = true; };
  }, [issueId]);
  const send = async () => {
    const t = text.trim(); if (!t) return;
    setSending(true); setErr('');
    try { const c = await apiPostComment(issueId, t); setComments(p => [...p, c as Comment]); setText(''); }
    catch (e: any) { setErr(e?.message || 'Không gửi được'); } finally { setSending(false); }
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
            <textarea value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2} placeholder="Nhập chỉ đạo…"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#104e8b]/30" />
            <button onClick={send} disabled={sending || !text.trim()} className="shrink-0 w-9 h-9 rounded-lg bg-[#104e8b] text-white flex items-center justify-center disabled:opacity-40">
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
      <span className="text-slate-400 font-semibold">{label}</span><span className="text-slate-700">{value}</span>
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
          <Row label="Số ngày tồn" value={txt(issue.responseDays)} />
          <Row label="Giải pháp" value={txt(issue.solution)} />
          <Row label="Kết quả" value={txt(issue.result)} />
          <Row label="VO / BOQ" value={money(issue.voBoq)} />
          <Row label="Ngân sách" value={money(issue.budget)} />
          <Row label="Dự kiến HT" value={txt(issue.plannedDate)} />
          <Row label="Thực tế HT" value={txt(issue.actualDate)} />
          <Row label="Tình trạng" value={<StatusPill status={issue.status} />} />
        </div>
        <div className="flex-1 border-t border-slate-100 p-4 overflow-hidden"><ChatPanel issueId={issue.id} authUser={authUser} /></div>
      </div>
    </div>
  );
}

function Board<T>({ items, laneKey, card }: { items: T[]; laneKey: (t: T) => Lane; card: (t: T, i: number) => React.ReactNode }) {
  const lanes = useMemo(() => {
    const map: Record<Lane, T[]> = { Opened: [], Pending: [], 'On-going': [], Closed: [] };
    for (const it of items) map[laneKey(it)].push(it);
    return map;
  }, [items, laneKey]);
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-4 gap-3 min-w-[860px]">
        {LANES.map(lane => (
          <div key={lane} className={`rounded-lg overflow-hidden border border-slate-200`}>
            <div className={`px-3 py-2 text-xs font-bold text-center ${laneHead[lane]}`}>{lane}</div>
            <div className="px-2 py-1.5 text-center text-[11px] font-bold text-slate-500 bg-slate-50 border-b border-slate-200">{lanes[lane].length} việc</div>
            <div className={`p-2 space-y-2 min-h-[120px] ${laneBody[lane]}`}>
              {lanes[lane].map((it, i) => card(it, i))}
              {lanes[lane].length === 0 && <p className="text-[11px] text-slate-300 italic text-center py-4">—</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IssueBoard({ issues, todos = [], authUser }: Props) {
  const [board, setBoard] = useState<'chance' | 'todo'>('chance');
  const [selected, setSelected] = useState<Issue | null>(null);

  const TabBtn = ({ k, label, icon: Icon, badge }: { k: 'chance' | 'todo'; label: string; icon: any; badge: number }) => (
    <button onClick={() => setBoard(k)}
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${board === k ? 'border-[#104e8b] text-[#104e8b]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
      <Icon className="w-4 h-4" /> {label}
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{badge}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB] bg-[#8b1a1a]">
          <h3 className="font-black text-white text-sm uppercase tracking-wide text-center">
            {board === 'chance' ? 'Kanban - Chance Logs (Vấn đề dự án / BHBT / BIM)' : 'Kanban Board - Quản Lý Công Việc Bản Thân'}
          </h3>
        </div>
        <div className="flex border-b border-slate-100 px-2">
          <TabBtn k="chance" label="Chance Logs" icon={AlertTriangle} badge={issues.length} />
          <TabBtn k="todo" label="Công việc bản thân" icon={CheckSquare} badge={todos.length} />
        </div>
        <div className="p-4">
          {board === 'chance' ? (
            <Board
              items={issues}
              laneKey={(i) => laneOf(i.status)}
              card={(it, i) => (
                <button key={i} onClick={() => setSelected(it)}
                  className="w-full text-left bg-white border border-slate-200 rounded-lg p-2.5 hover:border-[#104e8b] hover:shadow-sm transition-all">
                  <p className="text-xs font-semibold text-slate-700 line-clamp-2">{txt(it.problem)}</p>
                  <span className="block text-[10px] text-slate-500 mt-1">DA: {txt(it.project)}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{txt(it.assignee)}{it.responseDays ? ` | Tồn: ${it.responseDays} ngày` : ''}</span>
                </button>
              )}
            />
          ) : (
            <Board
              items={todos}
              laneKey={(t) => laneOf(t.status)}
              card={(it, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-slate-700 line-clamp-2">{txt(it.content)}</p>
                  {it.project && <span className="block text-[10px] text-slate-500 mt-1">DA: {txt(it.project)}</span>}
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {txt(it.group)}{it.end ? ` | KT: ${it.end}` : ''}{it.important ? ' | Quan trọng' : ''}{it.urgent ? ' | Khẩn cấp' : ''}
                  </span>
                </div>
              )}
            />
          )}
        </div>
      </div>
      {selected && <IssueDetail issue={selected} authUser={authUser} onClose={() => setSelected(null)} />}
    </div>
  );
}
