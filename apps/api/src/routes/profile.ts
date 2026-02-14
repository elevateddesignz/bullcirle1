import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();

router.get('/profile', requireRole(['free', 'paid', 'admin', 'unverified']), async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    username: user.username ?? user.displayName ?? user.email.split('@')[0],
    avatar_url: user.avatarUrl ?? '',
    joinDate: user.createdAt.toISOString(),
    settings: user.settings ?? {},
    tradingStats: {
      totalTrades: 0,
      winRate: 0,
      profitLoss: 0,
    },
    user_subscriptions: [],
  });
});

router.patch('/profile/settings', requireRole(['free', 'paid', 'admin', 'unverified']), async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const settings = req.body?.settings ?? {};
  const user = await prisma.user.update({
    where: { id: req.auth.userId },
    data: { settings },
  });

  return res.json({ settings: user.settings ?? {} });
});

router.get('/pricing-plans', async (_req, res) => {
  const plans = await prisma.pricingPlan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  const tiers = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: Number(plan.price),
    features: {
      features: plan.features ?? [],
      limits: {
        trades_per_month: 0,
        watchlist_items: 0,
        real_time_quotes: true,
        advanced_charts: true,
        api_access: true,
      },
    },
  }));
  return res.json(tiers);
});

router.post('/subscriptions/upgrade', requireRole(['free', 'paid', 'admin']), async (_req, res) => {
  return res.json({ ok: true, message: 'Subscription upgrades not wired yet.' });
});

export default router;
