import Alpaca from '@alpacahq/alpaca-trade-api';
import type { Request } from 'express';

import { prisma } from '../lib/prisma.js';
import { decrypt } from '../lib/crypto.js';
import { logger } from '../lib/logger.js';

export type Mode = 'paper' | 'live';

type MaybeString = string | string[] | undefined;

interface RequestWithUser extends Request {
  user?: { id?: string };
  envMode?: string;
}

type BrokerMode = Mode | undefined;

function coerceMode(value: MaybeString): BrokerMode {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.toString().trim().toLowerCase();
  if (normalized === 'paper' || normalized === 'live') {
    return normalized;
  }
  return undefined;
}

function resolveMode(req: RequestWithUser, override?: Mode): Mode {
  const query = req.query as Record<string, unknown> | undefined;
  return (
    override ??
    coerceMode(req.headers['x-env-mode'] as MaybeString) ??
    coerceMode(query?.mode as MaybeString) ??
    coerceMode(query?.env as MaybeString) ??
    coerceMode(req.envMode as MaybeString) ??
    'paper'
  );
}

export async function getAlpacaClient(req: RequestWithUser, mode?: Mode) {
  const userId = req.user?.id ?? (req as any).auth?.userId;
  if (!userId) {
    const error = new Error('Supabase authentication required');
    (error as any).status = 401;
    throw error;
  }

  if (!req.user) {
    (req as any).user = { id: userId };
  } else if (!req.user.id) {
    req.user.id = userId;
  }

  const envMode = resolveMode(req, mode);

  const connection = await prisma.brokerConnection.findFirst({
    where: { userId, broker: 'alpaca', mode: envMode },
  });

  if (!connection) {
    const error: any = new Error(`No Alpaca ${envMode} connection`);
    error.status = 412;
    throw error;
  }

  const accessToken = decrypt(connection.accessToken);
  const baseUrl = envMode === 'live' ? process.env.ALPACA_LIVE_BASE_URL : process.env.ALPACA_PAPER_BASE_URL;

  if (!baseUrl) {
    const error: any = new Error(`Alpaca ${envMode} base URL not configured`);
    error.status = 500;
    throw error;
  }

  logger.info({ userId, mode: envMode }, 'Creating Alpaca SDK client');

  const client = new Alpaca({
    baseUrl,
    oauth: accessToken,
  });

  // TODO: refresh OAuth tokens when expiration is approaching.
  return client;
}
