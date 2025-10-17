import axios, { AxiosError, AxiosInstance } from 'axios';
import { prisma } from './prisma.js';
import { decrypt, encrypt } from './crypto.js';
import { logger } from './logger.js';

export type AlpacaEnv = 'paper' | 'live';

const OAUTH_BASE_URL = 'https://api.alpaca.markets';

const envConfig = {
  paper: {
    clientId: process.env.ALPACA_CLIENT_ID_PAPER,
    clientSecret: process.env.ALPACA_CLIENT_SECRET_PAPER,
    redirectUri: process.env.ALPACA_REDIRECT_URI_PAPER,
  },
  live: {
    clientId: process.env.ALPACA_CLIENT_ID_LIVE,
    clientSecret: process.env.ALPACA_CLIENT_SECRET_LIVE,
    redirectUri: process.env.ALPACA_REDIRECT_URI_LIVE,
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
    where: { userId, provider: 'alpaca', env },
  });
  if (!connection) {
    throw new Error(`No Alpaca connection for user ${userId} (${env})`);
  }
  return connection;
}

export async function clientFor(userId: string, env: AlpacaEnv): Promise<AxiosInstance> {
  const connection = await getBrokerConnection(userId, env);
  const accessToken = await decrypt(connection.accessTokenEnc);
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
  const refreshToken = await decrypt(connection.refreshTokenEnc);

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
        accessTokenEnc: await encrypt(access_token),
        refreshTokenEnc: await encrypt(refresh_token),
        scopes: scope?.split(' ') ?? connection.scopes,
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
  const encryptedAccess = await encrypt(params.accessToken);
  const encryptedRefresh = await encrypt(params.refreshToken);

  await prisma.brokerConnection.upsert({
    where: {
      userId_provider_env: {
        userId: params.userId,
        provider: 'alpaca',
        env: params.env,
      },
    },
    update: {
      accessTokenEnc: encryptedAccess,
      refreshTokenEnc: encryptedRefresh,
      scopes: params.scopes,
      expiresAt,
      accountId: params.accountId,
    },
    create: {
      userId: params.userId,
      provider: 'alpaca',
      env: params.env,
      accessTokenEnc: encryptedAccess,
      refreshTokenEnc: encryptedRefresh,
      scopes: params.scopes,
      expiresAt,
      accountId: params.accountId,
    },
  });
}
