import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { AlpacaEnv } from '../lib/alpaca.js';

interface TradeAuditParams {
  userId: string;
  env: AlpacaEnv;
  action: string;
  status: 'success' | 'error';
  requestPayload: unknown;
  responsePayload?: unknown;
  error?: unknown;
}

export async function recordTradeAudit(params: TradeAuditParams) {
  try {
    await prisma.tradeAuditLog.create({
      data: {
        userId: params.userId,
        env: params.env,
        action: params.action,
        status: params.status,
        requestPayload: params.requestPayload,
        responsePayload: params.responsePayload,
        error: params.error ? serializeError(params.error) : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to write trade audit log');
  }
}

function serializeError(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}
