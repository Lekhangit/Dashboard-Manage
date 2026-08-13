/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tên sự kiện realtime dùng chung cho cả server (src/realtime.ts) và client
 * (src/realtimeClient.ts). Không import gì để an toàn cho cả 2 phía bundle.
 */
export const RT = {
  issueStatus: 'issue:status', // { id, status } — thẻ Chance Logs đổi cột
  todoStatus: 'todo:status',   // { tt, content, status } — thẻ Công việc đổi cột
  dataReload: 'data:reload',   // dữ liệu vừa được import lại -> tải lại toàn bộ
} as const;
