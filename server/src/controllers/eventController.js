import * as events from '../services/eventService.js';
import { broadcastEventsChanged } from '../sockets/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => res.json(await events.listEvents(req.valid.query)));
export const locations = asyncHandler(async (_req, res) => res.json({ data: await events.listLocations() }));
export const get = asyncHandler(async (req, res) => res.json({ data: await events.getEvent(req.valid.params.id) }));

export const create = asyncHandler(async (req, res) => {
  const data = await events.createEvent(req.valid.body);
  broadcastEventsChanged();
  res.status(201).json({ data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await events.updateEvent(req.valid.params.id, req.valid.body);
  broadcastEventsChanged();
  res.json({ data });
});

export const remove = asyncHandler(async (req, res) => {
  await events.deleteEvent(req.valid.params.id);
  broadcastEventsChanged();
  res.json({ message: 'Event deleted' });
});
