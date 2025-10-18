import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import './test-setup.js';
import {
  createAuthHeader,
  getAlpacaClientMock,
  mockTradingClient,
  prismaMock,
  resetAllMocks,
} from './test-setup.js';

let app: Express;

beforeAll(async () => {
  ({ default: app } = await import('../src/server.js'));
});

beforeEach(() => {
  resetAllMocks();

  mockTradingClient.get.mockImplementation(async (path: string) => {
    if (path === '/v2/account') {
      return { data: { id: 'acct-1', status: 'ACTIVE' } };
    }
    if (path === '/v2/orders') {
      return { data: [] };
    }
    return { data: {} };
  });

  mockTradingClient.post.mockImplementation(async (path: string, payload: any) => {
    if (path === '/v2/orders') {
      return {
        data: {
          id: 'order-1',
          client_order_id: payload.client_order_id ?? 'generated-id',
          status: 'accepted',
        },
      };
    }
    throw new Error(`Unexpected post path: ${path}`);
  });

  mockTradingClient.delete.mockImplementation(async (path: string) => {
    if (path === '/v2/orders/order-1') {
      return { data: { id: 'order-1', status: 'canceled' } };
    }
    throw new Error(`Unexpected delete path: ${path}`);
  });
});

describe('Alpaca trading routes', () => {
  it('returns 401 when no JWT is provided', async () => {
    await request(app).get('/api/v2/alpaca/account').expect(401);
  });

  it('returns 412 when broker connection is missing for the requested mode', async () => {
    const error = Object.assign(new Error('No Alpaca paper connection'), { status: 412 });
    getAlpacaClientMock.mockRejectedValueOnce(error);

    const response = await request(app)
      .get('/api/v2/alpaca/account')
      .set('Authorization', createAuthHeader())
      .set('x-env-mode', 'paper')
      .expect(412);

    expect(response.body).toMatchObject({ error: 'No Alpaca paper connection' });
  });

  it('authorizes account access', async () => {
    const response = await request(app)
      .get('/api/v2/alpaca/account')
      .set('Authorization', createAuthHeader())
      .set('x-env-mode', 'paper')
      .expect(200);

    expect(response.body.env).toBe('paper');
    expect(response.body.account).toMatchObject({ id: 'acct-1' });
  });

  it('places an order with client order id', async () => {
    const response = await request(app)
      .post('/api/v2/alpaca/orders')
      .set('Authorization', createAuthHeader())
      .set('x-env-mode', 'paper')
      .send({
        order: {
          symbol: 'SPY',
          side: 'buy',
          qty: 1,
          type: 'market',
          timeInForce: 'day',
        },
      })
      .expect(201);

    expect(response.body).toMatchObject({ id: 'order-1' });
    expect(typeof response.body.client_order_id).toBe('string');
    expect(prismaMock.tradeAuditLog.create).toHaveBeenCalled();
  });

  it('cancels an order', async () => {
    const response = await request(app)
      .delete('/api/v2/alpaca/orders/order-1')
      .set('Authorization', createAuthHeader())
      .set('x-env-mode', 'paper')
      .expect(200);

    expect(response.body).toMatchObject({ id: 'order-1', status: 'canceled' });
    expect(prismaMock.tradeAuditLog.create).toHaveBeenCalled();
  });
});
