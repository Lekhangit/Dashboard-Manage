/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chance Management — two switchable Kanban boards (like the Excel):
 *  • KANBAN - CHANCE LOGS (issues / warranty)  — also a "Danh sách" table view
 *  • KANBAN BOARD - QUẢN LÝ CÔNG VIỆC BẢN THÂN (personal to-do)
 * Cards are drag-and-droppable between lanes; a successful move (and Ctrl+Z
 * undo) is PERSISTED to the DB via PATCH so it survives reload. A later Excel
 * re-import still overwrites everything (Excel remains the master source).
 * Chance-log cards open a detail drawer with the role-gated chat.
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { X, Lock, Send, MessageSquare, AlertTriangle, CheckSquare, CheckCircle2, Star, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Issue, Todo, Project, AuthUser } from '../types';
import { apiListComments, apiPostComment, apiSetIssueStatus, apiSetTodoStatus } from '../authClient';
import { txt, money, StatusPill, ProjectFilter, daysOutstanding } from './tableKit';

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

// Phát quang thẻ vừa kéo trong 60s — lưu thời điểm kéo vào localStorage để
// sau khi reload vẫn tiếp tục sáng đúng phần thời gian còn lại (không mất khi F5).
const GLOW_MS = 60000;
const GLOW_STORE_KEY = 'tpl_kanban_glow';
const readGlowStore = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(GLOW_STORE_KEY) || '{}') || {}; } catch { return {}; }
};
const writeGlowStore = (s: Record<string, number>) => {
  try { localStorage.setItem(GLOW_STORE_KEY, JSON.stringify(s)); } catch { /* ignore quota */ }
};

// Generic drag-and-drop Kanban.
function Board<T>({ items, itemKey, laneKey, onMove, card }: {
  items: T[];
  itemKey: (t: T) => string;
  laneKey: (t: T) => Lane;
  onMove: (key: string, lane: Lane) => void;
  card: (t: T, i: number) => React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState<Lane | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [glow, setGlow] = useState<Record<string, boolean>>({}); // thẻ vừa kéo -> phát quang 1 phút
  const glowTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const clearGlow = (k: string) => {
    setGlow(g => { const n = { ...g }; delete n[k]; return n; });
    const s = readGlowStore(); delete s[k]; writeGlowStore(s);
  };
  const scheduleGlow = (k: string, remaining: number) => {
    if (glowTimers.current[k]) clearTimeout(glowTimers.current[k]);
    glowTimers.current[k] = setTimeout(() => clearGlow(k), remaining);
  };
  const markGlow = (k: string) => {
    const s = readGlowStore(); s[k] = Date.now(); writeGlowStore(s);
    setGlow(g => ({ ...g, [k]: true }));
    scheduleGlow(k, GLOW_MS);
  };
  // Khôi phục phát quang sau khi reload: thẻ nào còn trong 60s thì sáng tiếp phần còn lại.
  useEffect(() => {
    const store = readGlowStore();
    const now = Date.now();
    const active: Record<string, boolean> = {};
    let changed = false;
    for (const [k, ts] of Object.entries(store)) {
      const remaining = GLOW_MS - (now - ts);
      if (remaining > 0) { active[k] = true; scheduleGlow(k, remaining); }
      else { delete store[k]; changed = true; }
    }
    if (Object.keys(active).length) setGlow(g => ({ ...g, ...active }));
    if (changed) writeGlowStore(store);
    return () => { Object.values(glowTimers.current).forEach(t => clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lanes = useMemo(() => {
    const map: Record<Lane, T[]> = { Opened: [], Pending: [], 'On-going': [], Closed: [] };
    for (const it of items) map[laneKey(it)].push(it);
    return map;
  }, [items, laneKey]);
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-4 gap-3 min-w-[900px]">
        {LANES.map(lane => {
          const isCollapsed = !!collapsed[lane];
          return (
          <div
            key={lane}
            onDragOver={(e) => { e.preventDefault(); setDragOver(lane); }}
            onDragLeave={() => setDragOver(l => (l === lane ? null : l))}
            onDrop={(e) => { e.preventDefault(); const k = e.dataTransfer.getData('text/plain'); if (k) { onMove(k, lane); markGlow(k); } setDragOver(null); }}
            className={`rounded-lg overflow-hidden border self-start ${dragOver === lane ? 'border-[#104e8b] ring-2 ring-[#104e8b]/30' : 'border-slate-200'}`}
          >
            <button
              onClick={() => setCollapsed(c => ({ ...c, [lane]: !c[lane] }))}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold ${laneHead[lane]}`}
              title={isCollapsed ? 'Mở cột' : 'Thu gọn cột'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {lane}
            </button>
            <div className="px-2 py-1.5 text-center text-[11px] font-bold text-slate-500 bg-slate-50 border-b border-slate-200">{lanes[lane].length} việc</div>
            {!isCollapsed && (
              <div className={`p-2 space-y-2 min-h-[140px] max-h-[62vh] overflow-y-auto ${laneBody[lane]}`}>
                {lanes[lane].map((it, i) => {
                  const isGlow = !!glow[itemKey(it)];
                  return (
                  <div key={itemKey(it)} draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', itemKey(it)); e.dataTransfer.effectAllowed = 'move'; }}
                    className={`cursor-grab active:cursor-grabbing rounded-lg transition-all duration-500 ${isGlow ? 'ring-2 ring-emerald-400 shadow-[0_0_14px_3px_rgba(52,211,153,0.65)] kanban-glow' : ''}`}>
                    {card(it, i)}
                  </div>
                  );
                })}
                {lanes[lane].length === 0 && <p className="text-[11px] text-slate-300 italic text-center py-4">—</p>}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

// Định danh thẻ dùng chung (khớp giữa hiển thị và lệnh lưu DB).
const issueKeyOf = (i: Issue) => i.id;
const todoKeyOf = (t: Todo) => `todo-${t.tt}-${(t.content || '').slice(0, 24)}`;

export function IssueBoard({ issues: rawIssues, todos = [], authUser }: Props) {
  // Match the Excel "Chance Logs" order (by Ngày ghi nhận ascending).
  const issues = useMemo(
    () => [...rawIssues].sort((a, b) => String(a.loggedDate || '').localeCompare(String(b.loggedDate || ''))),
    [rawIssues],
  );
  const [board, setBoard] = useState<'chance' | 'todo'>('chance');
  const [proj, setProj] = useState('');
  const [selected, setSelected] = useState<Issue | null>(null);
  const [override, setOverride] = useState<Record<string, Lane>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [err, setErr] = useState('');
  const overrideRef = useRef(override);
  const undoStackRef = useRef<Record<string, Lane>[]>([]);
  useEffect(() => { overrideRef.current = override; }, [override]);

  // Bản đồ tra cứu (giữ trong ref để hàm undo bắt bằng listener [] vẫn đọc bản mới nhất).
  const lookupRef = useRef({ issueStatus: new Map<string, string>(), todoByKey: new Map<string, Todo>() });
  useEffect(() => {
    const issueStatus = new Map<string, string>();
    for (const i of issues) issueStatus.set(issueKeyOf(i), i.status || '');
    const todoByKey = new Map<string, Todo>();
    for (const t of todos) todoByKey.set(todoKeyOf(t), t);
    lookupRef.current = { issueStatus, todoByKey };
  }, [issues, todos]);

  // Cột hiện thời của 1 thẻ khi CHƯA có override (lấy từ tình trạng gốc Excel/DB).
  const origLaneOf = (key: string): Lane => {
    const { issueStatus, todoByKey } = lookupRef.current;
    const s = key.startsWith('todo-') ? todoByKey.get(key)?.status : issueStatus.get(key);
    return laneOf(s);
  };
  const laneNow = (key: string): Lane => overrideRef.current[key] ?? origLaneOf(key);

  // Ghi tình trạng mới vào DB.
  const persist = (key: string, lane: Lane): Promise<any> => {
    if (key.startsWith('todo-')) {
      const t = lookupRef.current.todoByKey.get(key);
      return t ? apiSetTodoStatus(t.tt, t.content || '', lane) : Promise.reject(new Error('Không tìm thấy công việc'));
    }
    return apiSetIssueStatus(key, lane);
  };
  const flashErr = (m: string) => { setErr(m); setTimeout(() => setErr(''), 4000); };

  const move = (key: string, lane: Lane) => {
    const prevLane = laneNow(key);
    if (prevLane === lane) return; // không đổi cột -> bỏ qua
    undoStackRef.current.push({ ...overrideRef.current }); // lưu trạng thái trước khi đổi
    setCanUndo(true);
    setOverride(o => ({ ...o, [key]: lane }));
    persist(key, lane).catch(() => {
      // Ghi DB lỗi -> hoàn tác thay đổi trên màn hình.
      setOverride(o => {
        const n = { ...o };
        if (prevLane !== origLaneOf(key)) n[key] = prevLane; else delete n[key];
        return n;
      });
      undoStackRef.current.pop();
      setCanUndo(undoStackRef.current.length > 0);
      flashErr('Không lưu được vào hệ thống — đã hoàn tác thay đổi.');
    });
  };
  const undo = () => {
    const stack = undoStackRef.current;
    if (!stack.length) return;
    const prev = stack.pop()!;
    const cur = overrideRef.current;
    // Ghi DB cho mọi thẻ thay đổi giữa trạng thái hiện tại và trạng thái khôi phục.
    const keys = new Set([...Object.keys(cur), ...Object.keys(prev)]);
    keys.forEach((key) => {
      const beforeLane = cur[key] ?? origLaneOf(key);
      const afterLane = prev[key] ?? origLaneOf(key);
      if (beforeLane !== afterLane) persist(key, afterLane).catch(() => flashErr('Không lưu được khi hoàn tác.'));
    });
    setOverride(prev);
    setCanUndo(stack.length > 0);
  };
  // Ctrl+Z (hoặc ⌘Z) để hoàn tác lần kéo gần nhất.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const projectOptions = useMemo(() => [...new Set(issues.map(i => (i.project || '').trim()).filter(Boolean))].sort(), [issues]);
  const shownIssues = useMemo(() => (proj ? issues.filter(i => (i.project || '').trim() === proj) : issues), [issues, proj]);

  const issueKey = issueKeyOf;
  const todoKey = todoKeyOf;
  const laneForIssue = (i: Issue) => override[issueKey(i)] ?? laneOf(i.status);
  const laneForTodo = (t: Todo) => override[todoKey(t)] ?? laneOf(t.status);

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
            {board === 'todo'
              ? 'Kanban Board - Quản Lý Công Việc Bản Thân'
              : 'Kanban - Chance Logs (Vấn đề dự án / BHBT / BIM)'}
          </h3>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 px-2">
          <div className="flex">
            <TabBtn k="chance" label="Chance Logs" icon={AlertTriangle} badge={issues.length} />
            <TabBtn k="todo" label="Công việc bản thân" icon={CheckSquare} badge={todos.length} />
          </div>
          {board === 'chance' && (
            <div className="mr-2">
              <ProjectFilter value={proj} onChange={setProj} options={projectOptions} />
            </div>
          )}
        </div>

        <div className="p-4">
          {err && (
            <div className="mb-3 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>
          )}
          {board === 'chance' ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-slate-400 italic">Kéo-thả thẻ để đổi trạng thái — <b>tự lưu vào hệ thống</b> · nhấn <b>Ctrl+Z</b> để hoàn tác.</p>
                <button onClick={undo} disabled={!canUndo} className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                  <RotateCcw className="w-3.5 h-3.5" /> Hoàn tác
                </button>
              </div>
              <Board
                items={shownIssues}
                itemKey={issueKey}
                laneKey={laneForIssue}
                onMove={move}
                card={(it) => (
                  <button onClick={() => setSelected(it)}
                    className="w-full text-left bg-white border border-slate-200 rounded-lg p-2.5 hover:border-[#104e8b] hover:shadow-sm transition-all">
                    <p className="text-xs font-semibold text-slate-700 line-clamp-2">{txt(it.problem)}</p>
                    <span className="block text-[10px] text-slate-500 mt-1">DA: {txt(it.project)}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{txt(it.assignee)} | Tồn: {daysOutstanding(it.loggedDate, it.status, it.responseDays)} ngày</span>
                  </button>
                )}
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-slate-400 italic">Kéo-thả thẻ để đổi trạng thái — <b>tự lưu vào hệ thống</b> · nhấn <b>Ctrl+Z</b> để hoàn tác.</p>
                <button onClick={undo} disabled={!canUndo} className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                  <RotateCcw className="w-3.5 h-3.5" /> Hoàn tác
                </button>
              </div>
              <Board
                items={todos}
                itemKey={todoKey}
                laneKey={laneForTodo}
                onMove={move}
                card={(it) => (
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${laneForTodo(it) === 'Closed' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2">{txt(it.content)}</p>
                    </div>
                    {it.project && <span className="block text-[10px] text-slate-500 mt-1 ml-5">DA: {txt(it.project)}</span>}
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 ml-5">
                      {txt(it.group)}{it.end ? ` | KT: ${it.end}` : ''}
                      {it.important && <Star className="w-3 h-3 text-amber-500 fill-amber-400" aria-label="Quan trọng" />}
                      {it.urgent && <CheckCircle2 className="w-3 h-3 text-rose-500" aria-label="Khẩn cấp" />}
                    </span>
                  </div>
                )}
              />
            </>
          )}
        </div>
      </div>
      {selected && <IssueDetail issue={selected} authUser={authUser} onClose={() => setSelected(null)} />}
    </div>
  );
}
