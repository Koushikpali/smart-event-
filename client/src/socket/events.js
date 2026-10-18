// Single source of truth for Socket.IO event names (must match the server).
export const SOCKET_EVENTS = {
  SEATS_UPDATE: 'seats:update',     // server -> all: { event_id, available_seats, held_seats, categories:[{id, available_seats, held_seats}] }
  EVENTS_CHANGED: 'events:changed', // server -> all: an event was created/updated/deleted
  HOLD_SET: 'hold:set',             // client -> server (ack): { eventId, categoryId, quantity }
  HOLD_RELEASE: 'hold:release',     // client -> server
  HOLD_EXPIRED: 'hold:expired',     // server -> one client: your hold timed out
};
