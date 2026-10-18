import http from 'node:http';
import app from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdmin } from './services/authService.js';
import { initSockets } from './sockets/index.js';

try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error(`Cannot connect to MySQL at ${env.db.host}:${env.db.port} (${err.code || err.message}). Check DB_* in .env and run "npm run db:init".`);
  process.exit(1);
}
await ensureAdmin();

const server = http.createServer(app);
initSockets(server);
server.listen(env.port, () => console.log(`API + Socket.IO listening on http://localhost:${env.port}`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
