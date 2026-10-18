import 'dotenv/config';

function need(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key} (see server/.env.example)`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: need('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'event_booking',
    ssl: process.env.DB_SSL === 'true',
  },
  jwtSecret: need('JWT_SECRET'),
  adminEmail: need('ADMIN_EMAIL'),
  adminPassword: need('ADMIN_PASSWORD'),
  holdTtlMs: Number(process.env.HOLD_TTL_SECONDS || 300) * 1000,
};
