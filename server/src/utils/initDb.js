// npm run db:init  -> runs sql/event_booking.sql inside the database named in DB_NAME
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const sqlFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql/event_booking.sql');
// Ignore the CREATE DATABASE / USE lines in the .sql file; DB_NAME decides the database.
const sql = fs.readFileSync(sqlFile, 'utf8')
  .split('\n')
  .filter((line) => !/^\s*(CREATE DATABASE|USE)\b/i.test(line))
  .join('\n');

const conn = await mysql.createConnection({
  host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password,
  multipleStatements: true, ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
});
try {
  // Hosted plans often do not allow CREATE DATABASE; ignore that, the database may already exist.
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).catch(() => {});
  await conn.query(`USE \`${env.db.database}\``);
  await conn.query(sql);
  const [rows] = await conn.query('SHOW TABLES');
  console.log(`Database "${env.db.database}" initialised. Tables: ${rows.map((r) => Object.values(r)[0]).join(', ')}`);
} finally {
  await conn.end();
}
