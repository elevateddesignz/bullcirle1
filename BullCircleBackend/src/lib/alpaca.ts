import type { Request } from 'express';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { prisma } from './prisma.js';
import { decrypt, encrypt } from './crypto.js';
import { logger } from './logger.js';

export type AlpacaEnv = 'paper' | 'live';

const OAUTH_BASE_URL = 'https://api.alpaca.markets';

const envConfig = {
  paper: {
    clientId: process.env.ALPACA_PAPER_CLIENT_ID,
    clientSecret: process.env.ALPACA_PAPER_CLIENT_SECRET,
    redirectUri: process.env.ALPACA_PAPER_REDIRECT_URI,
  },
  live: {
    clientId: process.env.ALPACA_LIVE_CLIENT_ID,
    clientSecret: process.env.ALPACA_LIVE_CLIENT_SECRET,
    redirectUri: process.env.ALPACA_LIVE_REDIRECT_URI,
  },
} satisfies Record<AlpacaEnv, { clientId?: string; clientSecret?: string; redirectUri?: string }>;

export function alpacaBase(_env: AlpacaEnv): string {
  return 'https://api.alpaca.markets';
}

function assertConfig(env: AlpacaEnv) {
  const cfg = envConfig[env];
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(`Missing Alpaca OAuth configuration for env "${env}"`);
  }
  return cfg as { clientId: string; clientSecret: string; redirectUri: string };
}

async function getBrokerConnection(userId: string, env: AlpacaEnv) {
  const connection = await prisma.brokerConnection.findFirst({
    where: { userId, broker: 'alpaca', mode: env },
  });
  if (!connection) {
    throw new Error(`No Alpaca connection for user ${userId} (${env})`);
  }
  return connection;
}

export async function clientFor(userId: string, env: AlpacaEnv): Promise<AxiosInstance> {
  const connection = await getBrokerConnection(userId, env);
  const accessToken = decrypt(connection.accessToken);
  const instance = axios.create({
    baseURL: alpacaBase(env),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 10000,
  });
  return instance;
}

async function refreshAccessToken(userId: string, env: AlpacaEnv) {
  const connection = await getBrokerConnection(userId, env);
  const cfg = assertConfig(env);
  if (!connection.refreshToken) {
    throw new Error(`Missing Alpaca refresh token for user ${userId} (${env})`);
  }
  const refreshToken = decrypt(connection.refreshToken);

  const payload = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });

  try {
    const response = await axios.post(`${OAUTH_BASE_URL}/oauth/token`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, scope, expires_in } = response.data as {
      access_token: string;
      refresh_token: string;
      scope: string;
      expires_in: number;
    };

    await prisma.brokerConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        scope: scope ?? connection.scope,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    logger.info({ userId, env }, 'Refreshed Alpaca access token');
  } catch (error) {
    logger.error({ err: error, userId, env }, 'Failed to refresh Alpaca access token');
    throw error;
  }
}

export async function refreshTokenIfNeeded<T>(
  userId: string,
  env: AlpacaEnv,
  executor: (client: AxiosInstance) => Promise<T>
): Promise<T> {
  let client = await clientFor(userId, env);
  try {
    return await executor(client);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      await refreshAccessToken(userId, env);
      client = await clientFor(userId, env);
      return executor(client);
    }
    throw error;
  }
}

export async function getAlpacaClient(req: Request, env: AlpacaEnv): Promise<AxiosInstance> {
  const auth = req.auth;
  if (!auth?.userId) {
    const error = new Error('Authentication required for Alpaca client access');
    (error as any).status = 401;
    throw error;
  }
  return clientFor(auth.userId, env);
}

export async function storeNewTokens(params: {
  userId: string;
  env: AlpacaEnv;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresIn: number;
  accountId?: string;
}) {
  const expiresAt = new Date(Date.now() + params.expiresIn * 1000);
  const encryptedAccess = encrypt(params.accessToken);
  const encryptedRefresh = encrypt(params.refreshToken);

  const existing = await prisma.brokerConnection.findFirst({
    where: {
      userId: params.userId,
      broker: 'alpaca',
      mode: params.env,
    },
  });

  if (existing) {
    await prisma.brokerConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        scope: params.scopes.join(' '),
        expiresAt,
        accountId: params.accountId,
      },
    });
    return;
  }

  await prisma.brokerConnection.create({
    data: {
      userId: params.userId,
      broker: 'alpaca',
      mode: params.env,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scope: params.scopes.join(' '),
      expiresAt,
      accountId: params.accountId,
    },
  });
}
