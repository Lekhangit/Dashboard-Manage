/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kết nối socket.io phía client (đồng bộ realtime nhiều người). Dùng 1 socket
 * dùng chung cho cả app; socket.io tự động reconnect khi rớt mạng nên web
 * "sống" liên tục mà không cần reload.
 */
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
};
