// Bonus: temporary seat holds ("seat locking") kept in memory.
// A hold reserves seats for ONE socket for HOLD_TTL while that user is on the checkout page.
// The database transaction in bookingService is still the final authority on seat counts.
// NOTE: in-memory => correct for a single server instance (fine for this project/Render free tier).
import { env } from '../config/env.js';

const holds = new Map(); // socketId -> { eventId, categoryId, quantity, expiresAt }

export function setHold(socketId, { eventId, categoryId, quantity }) {
  holds.set(socketId, { eventId, categoryId, quantity, expiresAt: Date.now() + env.holdTtlMs });
  return holds.get(socketId);
}

export function releaseHold(socketId) {
  const h = holds.get(socketId);
  holds.delete(socketId);
  return h;
}

export function getHold(socketId) {
  return holds.get(socketId);
}

/** Seats held for a category by everyone except `exceptSocketId`. */
export function heldFor(eventId, categoryId, exceptSocketId) {
  let n = 0;
  for (const [sid, h] of holds) {
    if (sid !== exceptSocketId && h.eventId === eventId && h.categoryId === categoryId && h.expiresAt > Date.now()) n += h.quantity;
  }
  return n;
}

/** { [categoryId]: heldSeats } for one event. */
export function heldByCategory(eventId) {
  const out = {};
  for (const h of holds.values()) {
    if (h.eventId === eventId && h.expiresAt > Date.now()) out[h.categoryId] = (out[h.categoryId] || 0) + h.quantity;
  }
  return out;
}

/** Remove expired holds and return them (so the caller can broadcast). */
export function sweepExpired() {
  const expired = [];
  for (const [sid, h] of holds) {
    if (h.expiresAt <= Date.now()) { holds.delete(sid); expired.push({ socketId: sid, ...h }); }
  }
  return expired;
}
