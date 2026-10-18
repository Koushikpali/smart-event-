import * as bookings from '../services/bookingService.js';
import { broadcastSeats } from '../sockets/index.js';
import { getHold, releaseHold } from '../sockets/holds.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const { ticket, duplicate } = await bookings.createBooking(req.valid.body);
  const sid = req.valid.body.socket_id;
  if (sid && getHold(sid)?.eventId === ticket.event_id) releaseHold(sid); // checkout finished: free the hold
  if (!duplicate) await broadcastSeats(ticket.event_id).catch(console.error);
  res.status(duplicate ? 200 : 201).json({ data: ticket });
});

export const list = asyncHandler(async (req, res) => res.json({ data: await bookings.listBookings(req.valid.query) }));

export const cancel = asyncHandler(async (req, res) => {
  const data = await bookings.cancelBooking(req.valid.params.id);
  await broadcastSeats(data.event_id).catch(console.error);
  res.json({ data });
});
