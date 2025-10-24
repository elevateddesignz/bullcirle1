import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

export const TEST_SUPABASE_SECRET = 'test-secret';
const TEST_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=';

process.env.SUPABASE_JWT_SECRET = TEST_SUPABASE_SECRET;
process.env.ALPHA_VANTAGE_API_KEY = 'alpha-test-key';
process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
process.env.LOG_LEVEL = 'silent';

export const fetchMock = vi.fn();

vi.mock('node-fetch', () => ({
  __esModule: true,
  default: fetchMock,
}));

const loggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../src/lib/logger.js', () => ({
  logger: loggerStub,
  httpLogger: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

export const mockTradingClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  getClock: vi.fn(),
};

export const getAlpacaClientMock = vi.fn(async () => mockTradingClient);
export const refreshTokenIfNeededMock = vi.fn(async (_userId: string, _env: string, executor: any) => executor(mockTradingClient));

vi.mock('../src/lib/alpaca.js', () => ({
  getAlpacaClient: getAlpacaClientMock,
  refreshTokenIfNeeded: refreshTokenIfNeededMock,
  alpacaBase: vi.fn(() => 'https://api.alpaca.markets'),
  storeNewTokens: vi.fn(),
  clientFor: vi.fn(async () => mockTradingClient),
}));

vi.mock('../src/services/alpaca.js', () => ({
  getAlpacaClient: getAlpacaClientMock,
}));

export const prismaMock = {
  tradeAuditLog: {
    create: vi.fn().mockResolvedValue(undefined),
  },
  brokerConnection: {
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

export function createAuthHeader(overrides?: {
  roles?: string[];
  verified?: boolean;
  userId?: string;
}) {
  const payload: Record<string, unknown> = {
    sub: overrides?.userId ?? 'user-123',
    email: 'test@example.com',
    roles: overrides?.roles ?? ['paid'],
    email_verified: overrides?.verified ?? true,
  };
  const token = jwt.sign(payload, TEST_SUPABASE_SECRET);
  return `Bearer ${token}`;
}

export function resetAllMocks() {
  fetchMock.mockReset();
  mockTradingClient.get.mockReset();
  mockTradingClient.post.mockReset();
  mockTradingClient.delete.mockReset();
  mockTradingClient.getClock.mockReset();
  getAlpacaClientMock.mockReset();
  getAlpacaClientMock.mockResolvedValue(mockTradingClient);
  refreshTokenIfNeededMock.mockReset();
  refreshTokenIfNeededMock.mockImplementation(async (_userId: string, _env: string, executor: any) => executor(mockTradingClient));
  prismaMock.tradeAuditLog.create.mockClear();
  prismaMock.brokerConnection.findFirst.mockClear();
  prismaMock.brokerConnection.deleteMany.mockClear();
  prismaMock.brokerConnection.update.mockClear();
  prismaMock.brokerConnection.create.mockClear();
  loggerStub.info.mockClear();
  loggerStub.warn.mockClear();
  loggerStub.error.mockClear();
}
