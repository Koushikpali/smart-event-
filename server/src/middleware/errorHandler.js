import { ZodError } from 'zod';
import { HttpError } from '../utils/HttpError.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Every error leaves the API in the same shape: { error: { message, details? } }
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message })),
      },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: { message: 'A record with these values already exists' } });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: { message: 'This record is still referenced by bookings' } });
  }
  if (err.code === 'ER_LOCK_DEADLOCK') {
    return res.status(503).json({ error: { message: 'Server is busy, please retry' } });
  }
  console.error(err);
  res.status(500).json({
    error: { message: env.nodeEnv === 'production' ? 'Internal server error' : err.message },
  });
}
