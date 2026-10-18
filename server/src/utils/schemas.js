import { z } from 'zod';

const money = z.coerce.number().min(0).max(1_000_000).transform((n) => Math.round(n * 100) / 100);

export const categorySchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(60),
  price: money,
  total_seats: z.coerce.number().int().min(1).max(100000),
});

const eventFields = {
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(5000),
  location: z.string().trim().min(2).max(255),
  date: z.coerce.date(),
  img: z.union([z.string().trim().url().max(500), z.literal('')]).optional().nullable(),
  // Original PDF shape (single price + total_seats) is still accepted:
  price: money.optional(),
  total_seats: z.coerce.number().int().min(1).max(100000).optional(),
  categories: z.array(categorySchema).min(1).max(8).optional(),
};

export const createEventSchema = z.object(eventFields).refine(
  (b) => b.categories?.length || (b.price !== undefined && b.total_seats !== undefined),
  { message: 'Provide either categories[] or both price and total_seats', path: ['categories'] },
);

export const updateEventSchema = z.object(eventFields).partial();

export const bookingSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  category_id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(150),
  mobile: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .refine((s) => /^\+?[0-9]{10,15}$/.test(s), 'Enter a valid mobile number (10-15 digits)'),
  quantity: z.coerce.number().int().min(1, 'Choose at least 1 ticket').max(10, 'Maximum 10 tickets per booking'),
  socket_id: z.string().max(64).optional(),
  idempotency_key: z.string().min(8).max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const listEventsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  include_past: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const listBookingsQuery = z.object({
  event_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['confirmed', 'cancelled']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const codeParam = z.object({ code: z.string().uuid() });
