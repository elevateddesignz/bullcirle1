import { Router } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger.js';

const router = Router();

router.post('/webhook', (req, res) => {
  const secret = process.env.ALPACA_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('ALPACA_WEBHOOK_SECRET missing; configure webhook signing secret before enabling callbacks');
    return res.status(500).json({ error: 'Webhook signing secret not configured' });
  }

  const signature = req.headers['x-alpaca-signature'];
  if (typeof signature !== 'string') {
    logger.warn('Missing Alpaca webhook signature header');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // NOTE: Express currently parses JSON before this handler. Configure a raw body parser
  // in production to ensure byte-for-byte signature validation against Alpaca payloads.
  const rawBody = JSON.stringify(req.body ?? {});
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const computed = Buffer.from(hmac, 'hex');
    const provided = Buffer.from(signature, 'hex');
    if (computed.length !== provided.length || !crypto.timingSafeEqual(computed, provided)) {
      logger.warn('Rejected Alpaca webhook with invalid signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse Alpaca webhook signature');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  logger.info({ event: req.body?.event, receivedAt: new Date().toISOString() }, 'Accepted Alpaca webhook');
  return res.status(202).json({ ok: true });
});

export default router;
