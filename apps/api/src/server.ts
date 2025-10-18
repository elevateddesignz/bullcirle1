import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { httpLogger, logger } from './lib/logger.js';
import { attachAuthContext } from './middleware/auth-context.js';
import alpacaRouter from './routes/alpaca-v2.js';
import autopilotRouter from './routes/autopilot.js';
import alphaRouter from './routes/alpha.js';
import alpacaAccountRouter from './routes/alpaca-account.js';
import tradingbotRouter from './routes/tradingbot.js';
import alpacaWebhookRouter from './routes/alpaca-webhook.js';
import { marketRouter } from './routes/market.js';
import { alpacaOAuthRouter } from './routes/alpaca-oauth.js';

type Mode = 'development' | 'production' | 'test';

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (origin === '*') {
      logger.warn('Rejected request with wildcard origin header');
      return callback(new Error('Wildcard origins are not allowed'));
    }
    if (!allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn({ origin }, 'Rejected request from disallowed origin');
    return callback(new Error('Origin not allowed'));
  },
  credentials: true,
};

app.use((req, res, next) => {
  if (req.headers.origin === '*') {
    return res.status(400).json({ error: 'Wildcard origins are not allowed' });
  }
  next();
});

app.use(httpLogger);
app.use(helmet());
app.use(cors(corsOptions));
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err.message === 'Wildcard origins are not allowed' || err.message === 'Origin not allowed') {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});
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
app.use('/api', alpacaOAuthRouter);
app.use('/api', marketRouter);
app.use('/api/tradingbot', tradingbotRouter);
app.use('/api/alpaca', alpacaWebhookRouter);

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
