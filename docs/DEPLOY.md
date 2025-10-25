# BullCircle Deployment Runbook (2025-02-15)

This guide captures the current deployment expectations for the BullCircle monorepo. It reflects the split between the legacy JavaScript server and the newer TypeScript Express stack so operators can avoid unintentionally launching outdated code paths.

## Prerequisites
- **Node.js 20.x** with npm (workspace-aware) for building both apps.【F:package.json†L1-L17】
- **Python 3.10+** for ML/autopilot scripts executed by the API (`ml_model/`).【F:ml_model/predict_trade.py†L1-L84】
- **Prisma CLI** (installed via `npm install`) with database connectivity to run migrations and generate the client.【F:apps/api/package.json†L19-L49】

## Environment variables
Populate the following variables in the host environment or respective `.env` files before building. Never expose secret values via `VITE_*` in production builds.

### API (`apps/api` TypeScript service)
- `PORT`, `NODE_ENV`, `CORS_ORIGIN` – Express bootstrap and origin allow list.【F:apps/api/src/server.ts†L19-L57】
- `DATABASE_URL` – Prisma datasource for the Postgres instance.【F:apps/api/prisma/schema.prisma†L1-L33】
- `SUPABASE_JWT_SECRET` – Required for JWT validation via `attachAuthContext`.【F:apps/api/src/middleware/auth-context.ts†L1-L180】
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` – Provide the Supabase introspection fallback and power the `/supabase/*` proxy for browsers behind firewalls.【F:apps/api/src/middleware/auth-context.ts†L1-L180】【F:apps/api/src/routes/supabase-proxy.ts†L1-L112】
- Alpaca OAuth credentials: `ALPACA_PAPER_CLIENT_ID`, `ALPACA_PAPER_CLIENT_SECRET`, `ALPACA_PAPER_REDIRECT_URI`, and live equivalents.【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】
- `ALPACA_WEBHOOK_SECRET` – HMAC signature shared with Alpaca for `/api/alpaca/webhook`.【F:apps/api/src/routes/alpaca-webhook.ts†L1-L39】
- `ALPHA_VANTAGE_API_KEY` – Alpha Vantage market data proxied via `/api/market/*`.【F:apps/api/src/services/marketData.ts†L1-L222】【F:apps/api/src/routes/market.ts†L1-L218】
- `OPENAI_API_KEY` – Trading bot completions.【F:apps/api/src/routes/tradingbot.ts†L1-L182】
- `ENCRYPTION_KEY` – 32-byte base64 secret for AES-256-GCM encryption of stored broker tokens.【F:apps/api/src/lib/crypto.ts†L1-L44】

### Web (`apps/web` Vite dashboard)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – Supabase auth client.【F:apps/web/src/lib/api.ts†L5-L12】
- `VITE_API_URL` (or `VITE_BACKEND_URL`) – REST base URL consumed by `lib/api.ts` and Alpaca helpers.【F:apps/web/src/lib/api.ts†L96-L123】【F:apps/web/src/lib/alpaca.ts†L1-L63】
- `VITE_PROXY_SUPABASE` – Optional (`true`/`false`) flag; set `true` when the browser cannot reach Supabase directly (DNS-blocked dev boxes, corporate firewalls) so requests flow through the API proxy; leave `false` when direct access works to avoid unnecessary hops.【F:apps/web/src/lib/supabaseClient.ts†L1-L146】【F:apps/api/src/routes/supabase-proxy.ts†L1-L112】
- `VITE_DEV_PROXY`, `VITE_PROXY_API_TARGET`, `VITE_PROXY_SUPABASE_TARGET` – Enable the Vite dev-server proxy and direct it at the remote API host to bypass restrictive CORS policies while coding locally.【F:apps/web/src/lib/backendConfig.ts†L1-L41】【F:apps/web/vite.config.ts†L1-L64】
- `VITE_STRIPE_PUBLISHABLE_KEY` – Stripe Elements initialization.【F:apps/web/src/stripePromise.js†L1-L12】

## Local development
1. Install dependencies once at the repo root: `npm install`.
2. Start the API in watch mode: `npm run dev:api` (or `npm run dev --workspace apps/api`).【F:package.json†L8-L17】【F:apps/api/package.json†L7-L15】
3. Start the web dashboard: `npm run dev:web` (or `npm run dev --workspace apps/web`).【F:package.json†L8-L14】【F:apps/web/package.json†L7-L17】
4. Ensure Python scripts have their dependencies fulfilled (see `ml_model/requirements.txt` when present).【F:ml_model/autopilot_loop.py†L1-L120】

## Production build & release
1. Build the API bundle: `npm run build:api` (runs `tsup` against `src/server.ts`).【F:package.json†L8-L16】【F:apps/api/package.json†L10-L13】
2. Run database migrations: `npm run prisma:deploy --workspace apps/api`.
3. Launch the TypeScript server with `npm run start:new --workspace apps/api` to avoid the legacy `index.js` entrypoint until scripts are refactored.【F:apps/api/package.json†L7-L18】
4. Build the web assets: `npm run build:web` (Vite static output in `apps/web/dist`).【F:package.json†L8-L13】【F:apps/web/package.json†L7-L24】
5. Serve the static build from a CDN or reverse proxy and configure it to forward API traffic to the Express service (`/api/**`, `/health`).
6. Configure HTTPS termination, CORS, and environment variables at the hosting layer; never embed secrets in the client bundle.

- Inspect API metrics for rate-limit hits (30 req/min per user on trading endpoints) and blocked origins to catch abusive clients early.【F:apps/api/src/middleware/rate-limit.ts†L1-L12】【F:apps/api/src/server.ts†L19-L62】
- Monitor `/health` on the API for uptime checks.【F:apps/api/src/server.ts†L68-L70】
- Smoke-test authenticated market data proxies (`/api/market/quote`, `/api/market/bars`, `/api/market/news`, `/api/market/search`, `/api/clock`) after deploy to confirm Alpha Vantage access and Alpaca clock fallback both succeed.【F:apps/api/src/routes/market.ts†L1-L218】
- Exercise the Alpaca trading service (`/api/v2/alpaca/*` routes) to confirm account, position, and order flows succeed with stored OAuth tokens and client-order idempotency.【F:apps/api/src/services/trading.ts†L1-L213】【F:apps/api/src/routes/alpaca-v2.ts†L1-L480】
- Validate the OAuth handshake by hitting `/api/v2/alpaca/oauth/start?mode=paper` and completing the redirect flow to `/api/v2/alpaca/oauth/callback`; confirm broker connections persist in Prisma and redirect to the dashboard succeeds.【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】【F:apps/api/prisma/schema.prisma†L34-L55】
- Trading bot and autopilot routes spawn Python processes; ensure the host grants sufficient CPU and kills orphaned workers during deploys.【F:apps/api/src/routes/autopilot.ts†L1-L62】【F:ml_model/autopilot_loop.py†L1-L120】
- Legacy JavaScript server (`apps/api/index.js`) remains in the tree; avoid using `npm run start` without specifying `start:new` until the script defaults are updated.【F:apps/api/package.json†L7-L18】
