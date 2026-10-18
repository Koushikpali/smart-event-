import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as auth from '../controllers/authController.js';
import * as bookings from '../controllers/bookingController.js';
import * as events from '../controllers/eventController.js';
import * as tickets from '../controllers/ticketController.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingSchema, codeParam, createEventSchema, idParam, listBookingsQuery, listEventsQuery, loginSchema, updateEventSchema,
} from '../utils/schemas.js';

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, skip: () => env.nodeEnv === 'test', standardHeaders: true, legacyHeaders: false, message: { error: { message } } });

const r = Router();

// --- Auth (additional) ---
r.post('/auth/login', limiter(15 * 60_000, 20, 'Too many login attempts. Try again later.'), validate(loginSchema), auth.login);

// --- Event APIs (required) ---
r.get('/events', validate(listEventsQuery, 'query'), events.list);
r.get('/events/locations', events.locations); // must stay above /events/:id
r.get('/events/:id', validate(idParam, 'params'), events.get);
r.post('/events', requireAdmin, validate(createEventSchema), events.create);
r.put('/events/:id', requireAdmin, validate(idParam, 'params'), validate(updateEventSchema), events.update);
r.delete('/events/:id', requireAdmin, validate(idParam, 'params'), events.remove);

// --- Booking APIs ---
r.post('/bookings', limiter(60_000, 30, 'Too many booking attempts. Slow down.'), validate(bookingSchema), bookings.create); // required
r.get('/bookings', requireAdmin, validate(listBookingsQuery, 'query'), bookings.list); // additional
r.patch('/bookings/:id/cancel', requireAdmin, validate(idParam, 'params'), bookings.cancel); // additional

// --- Tickets (additional) ---
r.get('/tickets/:code', validate(codeParam, 'params'), tickets.get);
r.post('/tickets/:code/verify', requireAdmin, validate(codeParam, 'params'), tickets.verify);

export default r;
