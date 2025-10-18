import { Router, type Request, type Response } from 'express';
import { requireRole } from '../middleware/require-role.js';
import { createPerUserRateLimiter } from '../middleware/rate-limit.js';
import {
  getQuote,
  getLatestTrade,
  getBars,
  getNews,
  searchTickers,
} from '../services/marketData.js';
import { logger } from '../lib/logger.js';

const marketRouter = Router();
const MARKET_ROLES: ReadonlyArray<'free' | 'paid' | 'admin'> = ['free', 'paid', 'admin'];

const newsLimiter = createPerUserRateLimiter({ limit: 10 });
const searchLimiter = createPerUserRateLimiter({ limit: 10 });

type LimitValue = string | string[] | number | undefined;

function parsePositiveInteger(value: LimitValue, fallback?: number): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return fallback;
}

function missing(res: Response, field: string) {
  return res.status(400).json({ error: `${field} required` });
}

marketRouter.get('/market/quote', requireRole(MARKET_ROLES), async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : '';
  if (!symbol) {
    return missing(res, 'symbol');
  }
  try {
    logger.info({ route: '/market/quote', userId: req.auth?.userId ?? 'anonymous', symbol: symbol.toUpperCase() }, 'Market route invoked');
    const quote = await getQuote(symbol);
    return res.json(quote);
  } catch (error) {
    return handleServerError(req, res, error, 'Failed to fetch quote');
  }
});

marketRouter.get('/market/trade/latest', requireRole(MARKET_ROLES), async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : '';
  if (!symbol) {
    return missing(res, 'symbol');
  }
  try {
    logger.info({ route: '/market/trade/latest', userId: req.auth?.userId ?? 'anonymous', symbol: symbol.toUpperCase() }, 'Market route invoked');
    const trade = await getLatestTrade(symbol);
    return res.json({ trade });
  } catch (error) {
    return handleServerError(req, res, error, 'Failed to fetch latest trade');
  }
});

marketRouter.get('/market/bars', requireRole(MARKET_ROLES), async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : '';
  if (!symbol) {
    return missing(res, 'symbol');
  }
  const timeframe = typeof req.query.timeframe === 'string' ? req.query.timeframe : undefined;
  const limit = parsePositiveInteger(req.query.limit, undefined);
  const start = typeof req.query.start === 'string' ? req.query.start : undefined;
  const end = typeof req.query.end === 'string' ? req.query.end : undefined;

  try {
    logger.info({
      route: '/market/bars',
      userId: req.auth?.userId ?? 'anonymous',
      symbol: symbol.toUpperCase(),
      timeframe: timeframe ?? undefined,
      limit
    }, 'Market route invoked');
    const bars = await getBars(symbol, timeframe, limit, start, end);
    return res.json({ symbol: symbol.toUpperCase(), bars });
  } catch (error) {
    return handleServerError(req, res, error, 'Failed to fetch bars');
  }
});

marketRouter.get('/market/news', requireRole(MARKET_ROLES), newsLimiter, async (req, res) => {
  const symbol = typeof req.query.symbol === 'string' ? req.query.symbol.trim() : '';
  if (!symbol) {
    return missing(res, 'symbol');
  }
  const limit = parsePositiveInteger(req.query.limit, undefined);
  try {
    logger.info({
      route: '/market/news',
      userId: req.auth?.userId ?? 'anonymous',
      symbol: symbol.toUpperCase(),
      limit
    }, 'Market route invoked');
    const news = await getNews(symbol, limit);
    return res.json({ symbol: symbol.toUpperCase(), news });
  } catch (error) {
    return handleServerError(req, res, error, 'Failed to fetch news');
  }
});

marketRouter.get('/market/search', requireRole(MARKET_ROLES), searchLimiter, async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    return missing(res, 'q');
  }
  const limit = parsePositiveInteger(req.query.limit, undefined);
  try {
    logger.info({
      route: '/market/search',
      userId: req.auth?.userId ?? 'anonymous',
      query,
      limit
    }, 'Market route invoked');
    const results = await searchTickers(query, limit);
    return res.json({ results });
  } catch (error) {
    return handleServerError(req, res, error, 'Failed to search tickers');
  }
});

marketRouter.get('/clock', requireRole(MARKET_ROLES), async (req, res) => {
  const mode = resolveEnvMode(req);
  try {
    const { getAlpacaClient } = await import('../services/alpaca.js');
    const client = await getAlpacaClient(req, mode);
    logger.info({ route: '/clock', userId: req.auth?.userId ?? 'anonymous', mode }, 'Trading provider (Alpaca) route invoked');
    const clock = await client.getClock();
    if (!clock || typeof clock !== 'object') {
      throw new Error('Invalid Alpaca clock response');
    }
    return res.json(clock);
  } catch (error) {
    logger.warn({ err: error, mode }, 'Falling back to synthetic market clock');
    const synthetic = createSyntheticClock();
    return res.json(synthetic);
  }
});

type MarketClock = {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
};

const EASTERN_TIMEZONE = 'America/New_York';
const WEEKEND_DAYS = new Set(['Sat', 'Sun']);

function resolveEnvMode(req: Request): 'paper' | 'live' {
  const header = extractString(req.headers['x-env-mode']);
  const queryMode = extractString(req.query.mode);
  const queryEnv = extractString(req.query.env);
  const requestEnv = extractString((req as any).envMode);
  const authEnv = req.auth?.env;

  return (
    coerceEnv(header) ??
    coerceEnv(queryMode) ??
    coerceEnv(queryEnv) ??
    coerceEnv(requestEnv) ??
    coerceEnv(authEnv) ??
    'paper'
  );
}

function extractString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

function coerceEnv(value: unknown): 'paper' | 'live' | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized === 'live' || normalized === 'paper' ? normalized : undefined;
}

function createSyntheticClock(reference: Date = new Date()): MarketClock {
  const nowParts = getEasternParts(reference);
  const nowEastern = createEasternDate(nowParts, Number(nowParts.hour), Number(nowParts.minute), Number(nowParts.second));
  const openEastern = createEasternDate(nowParts, 9, 30, 0);
  const closeEastern = createEasternDate(nowParts, 16, 0, 0);
  const weekend = isEasternWeekend(reference);

  let isOpen = !weekend && nowEastern >= openEastern && nowEastern < closeEastern;
  let nextOpen: Date;
  let nextClose: Date;

  if (weekend || nowEastern >= closeEastern) {
    const nextBusiness = getNextBusinessDate(reference);
    const nextParts = getEasternParts(nextBusiness);
    nextOpen = createEasternDate(nextParts, 9, 30, 0);
    nextClose = createEasternDate(nextParts, 16, 0, 0);
    isOpen = false;
  } else if (nowEastern < openEastern) {
    nextOpen = openEastern;
    nextClose = closeEastern;
    isOpen = false;
  } else {
    nextClose = closeEastern;
    const nextBusiness = getNextBusinessDate(reference);
    const nextParts = getEasternParts(nextBusiness);
    nextOpen = createEasternDate(nextParts, 9, 30, 0);
  }

  return {
    timestamp: reference.toISOString(),
    is_open: isOpen,
    next_open: nextOpen.toISOString(),
    next_close: nextClose.toISOString(),
  };
}

type EasternParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  offset: string;
};

function getEasternParts(date: Date): EasternParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find(part => part.type === type)?.value ?? '00';
  const rawOffset = parts.find(part => part.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  const offset = rawOffset.startsWith('GMT') ? rawOffset.slice(3) : rawOffset;

  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: lookup('hour'),
    minute: lookup('minute'),
    second: lookup('second'),
    offset,
  };
}

function createEasternDate(parts: EasternParts, hour: number, minute: number, second: number): Date {
  const y = parts.year.padStart(4, '0');
  const month = parts.month.padStart(2, '0');
  const day = parts.day.padStart(2, '0');
  const offset = parts.offset || '-05:00';
  return new Date(`${y}-${month}-${day}T${pad(hour)}:${pad(minute)}:${pad(second)}${offset}`);
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function isEasternWeekend(date: Date): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    weekday: 'short',
  }).format(date);
  return WEEKEND_DAYS.has(weekday);
}

function getNextBusinessDate(reference: Date): Date {
  const candidate = new Date(reference);
  candidate.setUTCHours(12, 0, 0, 0);
  candidate.setUTCDate(candidate.getUTCDate() + 1);
  while (isEasternWeekend(candidate)) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  // TODO: incorporate US market holidays for accurate synthetic clock behavior.
  return candidate;
}

function handleServerError(req: Request, res: Response, error: unknown, fallback: string) {
  if ((error as any)?.code === 'ALPHA_RATE_LIMIT') {
    const retryAfter = Number((error as any)?.retryAfter ?? 60);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      res.setHeader('Retry-After', String(Math.ceil(retryAfter)));
    }
    logger.warn({ err: error, route: req.path }, 'Alpha provider rate limited request');
    return res.status(503).json({ error: 'alpha_rate_limited' });
  }
  const status = typeof (error as { status?: number })?.status === 'number' ? (error as { status?: number }).status! : 500;
  const message = typeof (error as { message?: string })?.message === 'string' ? (error as { message?: string }).message! : fallback;
  if (status >= 500) {
    logger.error({ err: error, route: req.path }, 'Market route failed');
  } else {
    logger.warn({ err: error, route: req.path }, 'Market route responded with client error');
  }
  return res.status(status).json({ error: status >= 500 ? fallback : message });
}

export { marketRouter };
export default marketRouter;
