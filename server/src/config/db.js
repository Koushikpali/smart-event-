import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z', // JS Dates <-> DATETIME are always handled as UTC
  decimalNumbers: false, // keep DECIMAL as exact strings, never floats
  ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
});

// Make NOW() / CURRENT_TIMESTAMP UTC on every connection.
pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

/** Run fn(conn) inside a transaction. Commits on success, rolls back on any error. */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try { await conn.rollback(); } catch { /* connection already dead */ }
    throw err;
  } finally {
    conn.release();
  }
}
