import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const waitlistSchema = z.object({
  email: z.string().email(),
});

router.post('/waitlist', async (req, res) => {
  const result = waitlistSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const email = result.data.email.toLowerCase();
  const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'email already registered' });
  }

  await prisma.waitlistEntry.create({ data: { email } });
  return res.json({ ok: true });
});

export default router;
