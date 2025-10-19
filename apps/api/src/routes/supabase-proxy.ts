import express from 'express';
import { logger } from '../lib/logger.js';

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  logger.warn('Supabase proxy disabled: SUPABASE_URL is not configured.');
}

router.use(async (req, res) => {
  if (!SUPABASE_URL) {
    return res.status(503).json({ error: 'Supabase proxy is not configured.' });
  }

  try {
    const suffix = req.originalUrl.slice(req.baseUrl.length) || '/';
    const targetUrl = new URL(suffix, SUPABASE_URL).toString();

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value === undefined || key.toLowerCase() === 'host') return;
      if (Array.isArray(value)) {
        headers.set(key, value.join(','));
      } else {
        headers.set(key, value);
      }
    });

    headers.delete('content-length');
    headers.set('origin', new URL(SUPABASE_URL).origin);

    if (SUPABASE_ANON_KEY && !headers.has('apikey')) {
      headers.set('apikey', SUPABASE_ANON_KEY);
    }

    let body: any;
    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      if (req.body instanceof Buffer) {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body !== undefined) {
        body = JSON.stringify(req.body);
        headers.set('content-type', headers.get('content-type') ?? 'application/json');
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    res.status(response.status);

    const getSetCookie = (response.headers as any).getSetCookie?.();
    if (Array.isArray(getSetCookie) && getSetCookie.length > 0) {
      res.setHeader('set-cookie', getSetCookie);
    }

    response.headers.forEach((value, name) => {
      if (['content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
        return;
      }
      if (name.toLowerCase() === 'set-cookie') {
        return;
      }
      res.setHeader(name, value);
    });

    res.setHeader('access-control-allow-origin', req.headers.origin ?? '*');
    res.setHeader('access-control-allow-credentials', 'true');

    if (req.method.toUpperCase() === 'HEAD') {
      return res.end();
    }

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    logger.error({ err: error }, 'Supabase proxy request failed');
    return res.status(502).json({
      error: 'Failed to contact Supabase',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
