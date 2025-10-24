// src/routes/config.js
import express from 'express';
const router = express.Router();

router.get('/supabase', (_req, res) => {
  const url     = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('[Config] Missing Supabase env vars');
    return res.status(500).json({ error: 'Supabase config not set' });
  }

  res.json({ url, anonKey });
});

export default router;
