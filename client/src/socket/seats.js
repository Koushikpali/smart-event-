// Module 2: seat-related functions. Components never touch socket.emit/on directly.
import { getSocket } from './client';
import { SOCKET_EVENTS as EV } from './events';

const listen = (name, handler) => {
  const s = getSocket();
  s.on(name, handler);
  return () => s.off(name, handler);
};

/** handler(snapshot) on every seat change. Returns unsubscribe. */
export const subscribeSeatUpdates = (handler) => listen(EV.SEATS_UPDATE, handler);

/** handler() when any event is created, edited or deleted. Returns unsubscribe. */
export const subscribeEventsChanged = (handler) => listen(EV.EVENTS_CHANGED, handler);

/** handler() when this user's seat hold timed out. Returns unsubscribe. */
export const subscribeHoldExpired = (handler) => listen(EV.HOLD_EXPIRED, handler);

/** Ask the server to hold seats for this socket. Resolves { ok, expiresAt?, message? }. */
export function requestHold({ eventId, categoryId, quantity }) {
  return new Promise((resolve) => {
    getSocket().timeout(5000).emit(EV.HOLD_SET, { eventId, categoryId, quantity }, (err, res) => {
      resolve(err ? { ok: false, message: 'Could not reach the server to hold seats.' } : res);
    });
  });
}

export const releaseHold = () => getSocket().emit(EV.HOLD_RELEASE);

/** Pure helper: apply a seats:update snapshot to an event object. */
export function mergeSeats(event, snap) {
  if (!event || event.id !== snap.event_id) return event;
  return {
    ...event,
    available_seats: snap.available_seats,
    held_seats: snap.held_seats,
    categories: event.categories?.map((c) => {
      const u = snap.categories?.find((x) => x.id === c.id);
      return u ? { ...c, available_seats: u.available_seats, held_seats: u.held_seats } : c;
    }),
  };
}
