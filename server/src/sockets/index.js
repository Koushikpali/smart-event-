import { Server } from 'socket.io';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { getSeatSnapshot } from '../services/eventService.js';
import { getHold, releaseHold, setHold, sweepExpired, heldFor } from './holds.js';

// Event names (the client has the same list in src/socket/events.js)
export const EV = {
  SEATS_UPDATE: 'seats:update',
  EVENTS_CHANGED: 'events:changed',
  HOLD_SET: 'hold:set',
  HOLD_RELEASE: 'hold:release',
  HOLD_EXPIRED: 'hold:expired',
};

let io = null;

/** Tell every connected browser the current seat numbers for one event. */
export async function broadcastSeats(eventId) {
  if (!io) return;
  const snap = await getSeatSnapshot(eventId);
  if (snap) io.emit(EV.SEATS_UPDATE, snap);
}

/** Tell every browser to re-fetch lists (event created / edited / deleted). */
export function broadcastEventsChanged() {
  io?.emit(EV.EVENTS_CHANGED);
}

const safeBroadcast = (eventId) => broadcastSeats(eventId).catch((e) => console.error('broadcast failed', e));

export function initSockets(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientOrigins, methods: ['GET', 'POST'] } });

  io.on('connection', (socket) => {
    socket.on(EV.HOLD_SET, async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const eventId = Number(payload?.eventId);
        const categoryId = Number(payload?.categoryId);
        const quantity = Number(payload?.quantity);
        if (![eventId, categoryId, quantity].every(Number.isInteger) || quantity < 1 || quantity > 10) {
          return reply({ ok: false, message: 'Invalid hold request.' });
        }
        const [rows] = await pool.execute(
          'SELECT c.available_seats, e.`date` FROM ticket_categories c JOIN events e ON e.id = c.event_id WHERE c.id = ? AND c.event_id = ?',
          [categoryId, eventId],
        );
        if (!rows.length) return reply({ ok: false, message: 'Ticket category not found.' });
        if (new Date(rows[0].date).getTime() < Date.now()) return reply({ ok: false, message: 'This event has ended.' });
        const free = rows[0].available_seats - heldFor(eventId, categoryId, socket.id);
        if (free < quantity) return reply({ ok: false, message: free <= 0 ? 'These seats are all taken or held by other people right now.' : `Only ${free} seat(s) are free right now.` });

        const previous = getHold(socket.id);
        const hold = setHold(socket.id, { eventId, categoryId, quantity });
        reply({ ok: true, expiresAt: hold.expiresAt });
        await safeBroadcast(eventId);
        if (previous && previous.eventId !== eventId) await safeBroadcast(previous.eventId);
      } catch (err) {
        console.error(err);
        reply({ ok: false, message: 'Could not hold seats.' });
      }
    });

    const release = () => {
      const old = releaseHold(socket.id);
      if (old) safeBroadcast(old.eventId);
    };
    socket.on(EV.HOLD_RELEASE, release);
    socket.on('disconnect', release);
  });

  // Expire holds that nobody completed.
  setInterval(() => {
    for (const h of sweepExpired()) {
      io.to(h.socketId).emit(EV.HOLD_EXPIRED);
      safeBroadcast(h.eventId);
    }
  }, 10_000).unref();

  return io;
}
