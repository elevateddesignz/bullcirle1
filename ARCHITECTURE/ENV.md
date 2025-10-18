# Environment Variable Reference (Provider Split)

## Provider Responsibilities
- **Market data → Alpha Vantage**: All `/api/market/*` handlers call Alpha-only helpers. Keep the Alpha server key private and never expose it to the client.
- **Trading → Alpaca**: All `/api/v2/alpaca/*` handlers rely on OAuth tokens decrypted per user and mode. Alpaca API keys, client IDs, and secrets must stay on the server.

## Server-only Secrets
- **Alpha (market data)**
  - `ALPHA_VANTAGE_API_KEY` – required by `apps/api/src/services/marketData.ts` for quotes, bars, news, and search.
- **Alpaca (trading; both modes)**
  - `ALPACA_PAPER_BASE_URL` (default `https://paper-api.alpaca.markets`)
  - `ALPACA_LIVE_BASE_URL` (default `https://api.alpaca.markets`)
  - `ALPACA_PAPER_CLIENT_ID`
  - `ALPACA_PAPER_CLIENT_SECRET`
  - `ALPACA_PAPER_REDIRECT_URI`
  - `ALPACA_LIVE_CLIENT_ID`
  - `ALPACA_LIVE_CLIENT_SECRET`
  - `ALPACA_LIVE_REDIRECT_URI`
  - `ENCRYPTION_KEY` – 32-byte base64 value used by `apps/api/src/lib/crypto.ts` (AES-256-GCM) to encrypt broker OAuth tokens.
- **Other integrations**
  - `ALPACA_WEBHOOK_SECRET`, `OPENAI_API_KEY`, etc., remain server-only if used by other routes.

## Multi-tenant OAuth Storage
- Prisma `BrokerConnection` rows are keyed by `(userId, broker, mode)` to keep paper/live credentials isolated per user.
- Trading calls invoke `getAlpacaClient` which decrypts the stored OAuth token for the requesting user and mode.
- When no connection exists, trading endpoints return HTTP 412 so the frontend can prompt users to connect Alpaca for the requested mode.

## Frontend Handling
- The EnvMode toggle only affects trading (`tradeFetch`). Market data requests (`marketFetch`) ignore env mode and always hit Alpha-backed routes.
- The UI displays a "Connect Alpaca" CTA when a 412 is received, redirecting users through `/api/v2/alpaca/oauth/start?mode=…`.

## Client Configuration
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – Supabase auth client setup.
- `VITE_API_URL` / `VITE_BACKEND_URL` – Base URL for authenticated `marketFetch` and `tradeFetch` helpers.
- `VITE_STRIPE_PUBLISHABLE_KEY` – Stripe Elements public key.

All other provider credentials belong on the server. Avoid adding new `VITE_*` keys for market or trading integrations; route those calls through the API instead.
