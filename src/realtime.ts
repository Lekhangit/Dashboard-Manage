/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Realtime hub (socket.io). server.ts creates the io instance and registers it
 * here; controllers call broadcast() to push live updates to every connected
 * client (Kanban moves, Excel re-import, …). Kept tiny & dependency-free so any
 * module can import it without pulling in Express/HTTP types.
 */
import type { Server } from 'socket.io';
export { RT } from './realtimeEvents';

let io: Server | null = null;

export const setIO = (instance: Server) => { io = instance; };

/** Gửi sự kiện realtime tới TẤT CẢ client đang mở (an toàn khi io chưa sẵn sàng). */
export const broadcast = (event: string, payload?: unknown): void => {
  try { io?.emit(event, payload); } catch { /* io chưa init hoặc đã đóng */ }
};
