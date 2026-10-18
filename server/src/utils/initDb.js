// npm run db:init  -> runs sql/event_booking.sql using the credentials in .env
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const sqlFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql/event_booking.sql');
const conn = await mysql.createConnection({
  host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
  multipleStatements: true, ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
});
try {
  await conn.query(fs.readFileSync(sqlFile, 'utf8'));
  console.log('Database initialised from sql/event_booking.sql');
} finally {
  await conn.end();
}
