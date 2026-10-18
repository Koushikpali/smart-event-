import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../utils/HttpError.js';

export function requireAdmin(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.role !== 'admin') return next(forbidden());
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(unauthorized('Session expired or invalid. Please log in again.'));
  }
}
