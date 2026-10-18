// Module 1: the connection. One lazily-created Socket.IO client shared by the whole app.
import { io } from 'socket.io-client';
import { API_URL } from '../lib/config';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export const getSocketId = () => socket?.id;

/** Subscribe to connect/disconnect. Calls cb(boolean) immediately and on each change. Returns unsubscribe. */
export function onConnectionChange(cb) {
  const s = getSocket();
  const up = () => cb(true);
  const down = () => cb(false);
  s.on('connect', up);
  s.on('disconnect', down);
  cb(s.connected);
  return () => { s.off('connect', up); s.off('disconnect', down); };
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
