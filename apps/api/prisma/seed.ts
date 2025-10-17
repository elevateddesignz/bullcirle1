import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { encrypt } from '../src/lib/crypto.js';

async function main() {
  const demoUserId = 'demo-user-001';
  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {
      email: 'demo@bullcircle.com',
      roles: ['paid'],
      isEmailVerified: true,
    },
    create: {
      id: demoUserId,
      email: 'demo@bullcircle.com',
      roles: ['paid'],
      isEmailVerified: true,
      displayName: 'Demo Trader',
    },
  });

  const fakeAccess = await encrypt('demo-access-token');
  const fakeRefresh = await encrypt('demo-refresh-token');

  await prisma.brokerConnection.upsert({
    where: {
      userId_provider_env: {
        userId: demoUserId,
        provider: 'alpaca',
        env: 'paper',
      },
    },
    update: {
      accessTokenEnc: fakeAccess,
      refreshTokenEnc: fakeRefresh,
      scopes: ['account', 'trading', 'data'],
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
    create: {
      userId: demoUserId,
      provider: 'alpaca',
      env: 'paper',
      accessTokenEnc: fakeAccess,
      refreshTokenEnc: fakeRefresh,
      scopes: ['account', 'trading', 'data'],
      expiresAt: new Date(Date.now() + 3600 * 1000),
      accountId: 'PA0000DEMO',
    },
  });

  await prisma.courseModule.upsert({
    where: { slug: 'intro-to-trading' },
    update: {},
    create: {
      slug: 'intro-to-trading',
      title: 'Introduction to Trading',
      summary: 'Learn the basics of equity trading inside BullCircle.',
      category: 'university',
      level: 'beginner',
      content: {
        sections: [
          { title: 'Welcome', body: 'BullCircle University helps you master trading fundamentals.' },
          { title: 'Risk Management', body: 'Understand risk/reward, position sizing, and diversification.' },
        ],
      },
    },
  });

  await prisma.statusEntry.createMany({
    data: [
      {
        title: 'Multi-Tenant Alpaca OAuth',
        description: 'Users can now connect their Alpaca accounts via OAuth with paper/live modes.',
        statusType: 'changelog',
      },
      {
        title: 'Trading Hub Roadmap',
        description: 'Planning widgets for environment-aware trading dashboard.',
        statusType: 'roadmap',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
