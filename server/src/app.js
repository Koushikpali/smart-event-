import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();
app.set('trust proxy', 1); // Render/Heroku sit behind a proxy
app.use(helmet());
app.use(cors({ origin: env.clientOrigins }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: env.nodeEnv === 'test' ? 100000 : 600, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
