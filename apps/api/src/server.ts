import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { httpLogger, logger } from './lib/logger.js';
import { attachAuthContext } from './middleware/auth-context.js';
import alpacaRouter from './routes/alpaca-v2.js';
import autopilotRouter from './routes/autopilot.js';
import alphaRouter from './routes/alpha.js';
import alpacaAccountRouter from './routes/alpaca-account.js';
import tradingbotRouter from './routes/tradingbot.js';

type Mode = 'development' | 'production' | 'test';

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

app.use(httpLogger);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
app.use(attachAuthContext);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v2/alpaca', alpacaRouter);
app.use('/api/autopilot', autopilotRouter);
app.use('/api', alphaRouter);
app.use('/api', alpacaAccountRouter);
app.use('/api/tradingbot', tradingbotRouter);

const port = Number(process.env.PORT || 3000);
const mode = (process.env.NODE_ENV || 'development') as Mode;

export function startServer(customPort = port) {
  const server = app.listen(customPort, () => {
    logger.info({ port: customPort, mode }, 'BullCircle API ready');
  });
  return server;
}

if (process.env.JEST_WORKER_ID === undefined && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
