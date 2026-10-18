import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { unauthorized } from '../utils/HttpError.js';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps timing similar for unknown emails

export async function login(email, password) {
  const [rows] = await pool.execute('SELECT id, email, password_hash FROM admins WHERE email = ?', [email]);
  const ok = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows.length || !ok) throw unauthorized('Incorrect email or password');
  const token = jwt.sign({ sub: rows[0].id, email: rows[0].email, role: 'admin' }, env.jwtSecret, { expiresIn: '8h' });
  return { token, admin: { email: rows[0].email } };
}

/** Creates the first admin from .env if it does not exist yet. */
export async function ensureAdmin() {
  if (env.adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const [rows] = await pool.execute('SELECT id FROM admins WHERE email = ?', [env.adminEmail.toLowerCase()]);
  if (rows.length) return;
  const hash = await bcrypt.hash(env.adminPassword, 12);
  await pool.execute('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [env.adminEmail.toLowerCase(), hash]);
  console.log(`Created admin account ${env.adminEmail}`);
}
