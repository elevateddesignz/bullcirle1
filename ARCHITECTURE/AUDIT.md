# BullCircle Repository Audit (2025-02-14)

## Monorepo layout & toolchain
- Root `package.json` defines an npm workspace with `apps/web` and `apps/api`, enabling per-app scripts for development and builds.【F:package.json†L1-L17】
- `apps/web` is a Vite + React 18 dashboard with Tailwind tooling and a large dependency surface that includes Supabase, Stripe, Alpaca JS, OpenAI, Plaid Link, Charting libs, and Python shell bindings.【F:apps/web/package.json†L1-L71】
- `apps/api` is a TypeScript Express service built with `tsup`/`tsx`, Prisma ORM, Pino logging, and Python shell support, but its scripts still reference a legacy `index.js` server alongside the new TypeScript entrypoint.【F:apps/api/package.json†L1-L59】
- Additional top-level assets include a Python ML bundle under `ml_model/` for predictive strategies, Supabase Edge Functions, and historic documents (e.g., `docs/refactor-plan.md`).【F:ml_model/predict_trade.py†L1-L84】【F:apps/web/supabase/functions/trading-strategy/index.ts†L1-L137】【F:docs/refactor-plan.md†L1-L60】

## Frontend (apps/web)
### Frameworks & core architecture
- Routing lives in `App.tsx`, which wires protected routes for Dashboard, Trade, TradingBot, AutomationBot, Research, Markets, Screener, Learn sub-pages, Social feed, Settings, etc., and wraps everything in Theme, EnvMode, Auth, Watchlist, and Search providers plus Stripe Elements.【F:apps/web/src/App.tsx†L1-L142】
- Authentication relies on Supabase; `AuthContext` manages sessions, login, registration, and logout using `supabase.auth` while storing state client-side.【F:apps/web/src/contexts/AuthContext.tsx†L1-L114】
- Environment mode selection (`paper` vs `live`) is persisted to Supabase and `localStorage` through `EnvModeContext`.【F:apps/web/src/contexts/EnvModeContext.tsx†L1-L99】
- Watchlists are entirely client-side: `WatchlistContext` seeds from defaults, stores lists in `localStorage`, and refreshes prices via backend Alpha Vantage proxy endpoints.【F:apps/web/src/contexts/WatchlistContext.tsx†L1-L139】
- The Automation Bot UI consumes `AutoBotContext`, which orchestrates recurring calls to backend `/api/account`, `/api/clock`, and trading bot endpoints, assuming a bearer token stored in `localStorage` under `token`.【F:apps/web/src/contexts/AutoBotContext.tsx†L68-L198】

### Feature map
- **Dashboard** pulls `/api/account` and `/api/account/history`, displays account/position/order data, and calculates trends, again relying on a `token` from `localStorage`.【F:apps/web/src/pages/Dashboard.tsx†L134-L185】
- **Trade** view fetches quotes via `/api/alpha-quotes`, manages Alpaca order forms, and submits trades via the newer `/api/v2/alpaca/orders` helper in `lib/api.ts`.【F:apps/web/src/pages/Trade.tsx†L33-L198】【F:apps/web/src/lib/api.ts†L126-L205】
- **TradingBot** page offers manual analysis (`/api/tradingbot`), auto-execution (`/api/tradingbot/execute`), and plays (`/api/tradingbot/plays`) endpoints that currently have no server implementations, along with timers and caching in `localStorage`.【F:apps/web/src/pages/tradingbot.tsx†L137-L213】
- **AutomationBot** extends the AutoBot context to manage multiple bot configurations persisted to `localStorage` and start/stop runs via the context’s `start/stop` (which call backend autopilot endpoints).【F:apps/web/src/pages/AutomationBot.tsx†L1-L130】
- **FundsWallet** integrates Stripe Elements for ACH-like flows and expects backend `/api/ach/link` and `/api/ach/deposit` endpoints, which are absent from the active TypeScript API (only the standalone `stripeBackend.js` server mentions ACH).【F:apps/web/src/components/FundsWallet.tsx†L1-L177】【F:apps/api/stripeBackend.js†L1-L62】
- Charting now calls authenticated backend market endpoints via `marketFetch`, keeping Alpha Vantage access server-side and removing any browser requirement for provider secrets.【F:apps/web/src/components/TradingChart.tsx†L1-L200】【F:apps/web/src/lib/api.ts†L96-L205】
- `lib/api.ts` centralizes Supabase client creation and authenticated fetches to `/api/market/*` (Alpha-backed) and `/api/v2/alpaca/*` (trading) so the browser never touches raw provider keys.【F:apps/web/src/lib/api.ts†L96-L205】

### Integrations & environment usage
- Required browser env vars include `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`/`VITE_BACKEND_URL`, and `VITE_STRIPE_PUBLISHABLE_KEY`; market and trading helpers now proxy everything through the backend without any client-side provider secrets.【F:apps/web/src/lib/api.ts†L5-L205】【F:apps/web/src/lib/alpaca.ts†L1-L63】
- Stripe integration is front-loaded; backend support exists only in the legacy `stripeBackend.js`. Plaid is listed as a dependency but unused in source.
- Supabase Edge Functions (`trading-strategy`, `strategy-search`) call OpenAI with keys pulled from Supabase runtime env and allow broad CORS (`*`).【F:apps/web/supabase/functions/trading-strategy/index.ts†L1-L116】

### Gaps & risks
- Frontend assumes a `token` in `localStorage`, but Supabase manages access tokens elsewhere; mismatch prevents authenticated calls unless a separate token is manually stored.【F:apps/web/src/contexts/AutoBotContext.tsx†L68-L99】【F:apps/web/src/pages/Dashboard.tsx†L152-L167】
- Numerous UI calls hit endpoints missing from the active API (`/api/clock`, `/api/tradingbot/execute`, `/api/tradingbot/plays`, `/api/ach/*`), leading to runtime errors once wired.【F:apps/web/src/contexts/AutoBotContext.tsx†L98-L112】【F:apps/web/src/pages/tradingbot.tsx†L172-L208】【F:apps/web/src/components/FundsWallet.tsx†L23-L106】
- Prior Alpaca client secrets have been removed from the browser bundle; all market data flows now proxy through authenticated `/api/market/*` requests so Alpha Vantage keys stay on the server.【F:apps/web/src/lib/api.ts†L96-L205】【F:apps/api/src/routes/market.ts†L1-L218】
- Heavy reliance on Alpha Vantage (client + server) conflicts with the Alpaca-first direction and rate limits; e.g., search, news, quotes, history all call Alpha Vantage endpoints.【F:apps/web/src/lib/alphaVantage.ts†L1-L94】【F:apps/web/src/components/TradingChart.tsx†L49-L138】
- Feature state (watchlists, bot configs, prompt history) is local-only, not multi-device.

## Backend (apps/api)
### TypeScript Express API
- `src/server.ts` registers Helmet, CORS (env-configurable origins), rate limiting, auth context middleware, and routers for the Alpaca OAuth handshake (`/api/v2/alpaca/oauth/*`), trading APIs (`/api/v2/alpaca/*`), Alpha-backed market data (`/api/market/*`), Autopilot Python control (`/api/autopilot`), and trading bot automation (`/api/tradingbot`).【F:apps/api/src/server.ts†L1-L90】【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】【F:apps/api/src/routes/market.ts†L1-L218】
- **Alpha router** (legacy) still exposes cached listings/history endpoints, while the new `/api/market/*` routes proxy Alpha Vantage quote, trade, bar, news, and search data under Supabase-authenticated access.【F:apps/api/src/routes/alpha.ts†L1-L200】【F:apps/api/src/routes/market.ts†L1-L218】
- **Alpaca v2 router** now focuses on authenticated account, position, and order flows with audit logging, while the dedicated OAuth router handles start/callback redirects and token persistence via Prisma.【F:apps/api/src/routes/alpaca-v2.ts†L1-L480】【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】
- **Trading bot router** offers `/signal`, `/` (analysis), `/journal`, and `/autopilot` endpoints mixing Alpha Vantage, OpenAI chat completions, and Python ML predictions, with optional order placement through refreshed Alpaca tokens.【F:apps/api/src/routes/tradingbot.ts†L1-L159】
- **Autopilot router** starts/stops a long-running Python process (`ml_model/autopilot_loop.py`) and currently has no auth protection; multiple concurrent runs are prevented by in-memory state.【F:apps/api/src/routes/autopilot.ts†L1-L62】
- Auth context now requires `SUPABASE_JWT_SECRET` for verification, derives roles from various claim shapes, and exposes env mode via request headers/query.【F:apps/api/src/middleware/auth-context.ts†L1-L116】
- Roles & verification gates are defined in `require-role.ts`; roles map to `admin`, `paid`, `free`, `unverified`.【F:apps/api/src/middleware/require-role.ts†L1-L52】
- Trading and autopilot routes now apply per-user rate limits and persist audit trails to Prisma via `TradeAuditLog`.【F:apps/api/src/middleware/rate-limit.ts†L1-L12】【F:apps/api/src/routes/alpaca-v2.ts†L145-L218】【F:apps/api/src/routes/tradingbot.ts†L109-L182】【F:apps/api/prisma/schema.prisma†L122-L157】
- Prisma schema models `User`, `BrokerConnection`, CMS tables, and the new `TradeAuditLog` for broker actions.【F:apps/api/prisma/schema.prisma†L122-L157】【F:apps/api/prisma/migrations/20250214_add_trade_audit_logs/migration.sql†L1-L16】
- Secrets at rest leverage AES-256-GCM with a shared `ENCRYPTION_KEY` defined in `lib/crypto.ts`.【F:apps/api/src/lib/crypto.ts†L1-L44】

### Legacy Node API remnants
- Legacy Express server `apps/api/index.js` mirrors many Alpha Vantage and Alpaca endpoints without auth, uses direct API keys, exposes permissive CORS (`*`), and mounts older routers/services. Scripts still expose `npm start` to this entrypoint, so deployment may run the outdated server instead of the TypeScript build.【F:apps/api/index.js†L1-L200】【F:apps/api/package.json†L8-L18】
- Additional legacy modules include `routes/alpaca.js`, `services/placeOrder.js` (with incorrect base URL usage), `supabaseClient.js` (initializes Supabase with the service role key on server start), and `stripeBackend.js` for ACH demos, none integrated into the new TS server.【F:apps/api/routes/alpaca.js†L1-L33】【F:apps/api/services/placeOrder.js†L1-L29】【F:apps/api/supabaseClient.js†L1-L11】【F:apps/api/stripeBackend.js†L1-L62】
- Legacy trading bot services still instantiate Alpaca API clients with raw keys, conflicting with the OAuth direction.【F:apps/api/lib/tradingBotService.js†L1-L39】
- Repository tracks `apps/api/node_modules/` and other compiled artifacts, increasing repo size and complicating dependency management.【F:apps/api/package.json†L1-L59】【F:apps/api/index.js†L1-L200】

### Integration summary
- **Alpaca:** Modern flow relies on OAuth storing encrypted tokens in Prisma (`lib/alpaca.ts`). Legacy flow still expects API keys from env in `apps/api/index.js`, but no client code references Alpaca secrets anymore.【F:apps/api/src/lib/alpaca.ts†L1-L135】【F:apps/web/src/lib/api.ts†L96-L205】
- **Supabase:** Backend consumes JWTs for auth context; legacy server also uses service-role Supabase client. Frontend uses anon key for auth, plus Supabase Edge functions for AI helpers.【F:apps/api/src/middleware/auth-context.ts†L1-L116】【F:apps/api/supabaseClient.js†L1-L11】【F:apps/web/src/lib/api.ts†L1-L123】
- **OpenAI:** Backend trading bot and Supabase functions call OpenAI chat completions, requiring `OPENAI_API_KEY` in both environments.【F:apps/api/src/routes/tradingbot.ts†L31-L99】【F:apps/web/supabase/functions/trading-strategy/index.ts†L37-L96】
- **Stripe/Plaid:** Frontend depends on Stripe Elements and `react-plaid-link`, but only the standalone `stripeBackend.js` demonstrates ACH support; no Plaid usage exists in source.【F:apps/web/package.json†L13-L45】【F:apps/web/src/components/FundsWallet.tsx†L23-L171】
- **Alpha Vantage:** Now confined to authenticated backend services (`/api/market/*` and select trading bot helpers); the frontend consumes Alpha data only via server proxies to avoid exposing the API key.【F:apps/api/src/services/marketData.ts†L1-L222】【F:apps/web/src/lib/api.ts†L96-L205】

### Gaps & tech debt
- Duplicate backend stacks (TypeScript vs legacy JS) risk diverging behavior and misconfiguration; `npm start` still targets the legacy server.【F:apps/api/package.json†L8-L18】
- Missing endpoints referenced by the frontend (ACH, `/api/clock`, `/api/tradingbot/execute`, `/api/tradingbot/plays`) will break automation experiences.【F:apps/web/src/contexts/AutoBotContext.tsx†L98-L112】【F:apps/web/src/pages/tradingbot.tsx†L172-L208】【F:apps/web/src/components/FundsWallet.tsx†L23-L106】
- ACH and Stripe flows are unauthenticated demos; there is no secure ACH tokenization or Plaid integration.
- Legacy services continue to require raw Alpaca API keys, undermining OAuth adoption.【F:apps/api/services/alpacaConfig.js†L1-L24】

## Shared ML & automation assets
- Python scripts (`predict_trade.py`, `autopilot_loop.py`) under `ml_model/` drive the `/api/tradingbot/autopilot` endpoint and the autopilot router. They expect Alpha Vantage history and feed JSON via stdin/out.【F:apps/api/src/routes/tradingbot.ts†L121-L155】【F:ml_model/predict_trade.py†L1-L84】
- No isolation or virtualenv management is present; deployment must ensure Python dependencies exist.

## Security observations
- Alpaca credentials are now brokered exclusively through the API; the client uses authenticated fetches instead of direct WebSocket keys.【F:apps/web/src/lib/alpaca.ts†L1-L63】【F:apps/api/src/routes/alpaca-v2.ts†L145-L218】
- The TypeScript server tightens Helmet defaults, rejects wildcard origins, and requires explicit allow lists, while the legacy server still permits `*`.【F:apps/api/src/server.ts†L17-L78】【F:apps/api/index.js†L25-L125】
- ACH and Stripe handlers do not enforce auth or webhook verification; they should not be exposed as-is.【F:apps/api/stripeBackend.js†L1-L62】
- Supabase service-role key is instantiated directly in code (`supabaseClient.js`), which should never ship to clients or untrusted environments.【F:apps/api/supabaseClient.js†L1-L11】
- Trading/order endpoints now log to Prisma with per-user rate limits, but Supabase Edge OpenAI functions remain unauthenticated and unrestricted.【F:apps/api/src/middleware/rate-limit.ts†L1-L12】【F:apps/api/src/utils/trade-audit.ts†L1-L43】【F:apps/api/src/routes/tradingbot.ts†L109-L182】【F:apps/web/supabase/functions/trading-strategy/index.ts†L4-L106】

## Environment variables & configuration
### Frontend (`apps/web`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – Supabase client.【F:apps/web/src/lib/api.ts†L5-L12】
- `VITE_API_URL` / `VITE_BACKEND_URL` – REST base URL for Alpha/Alpaca proxies.【F:apps/web/src/lib/api.ts†L96-L123】
- `VITE_STRIPE_PUBLISHABLE_KEY` – Stripe Elements bootstrap.【F:apps/web/src/stripePromise.js†L1-L12】

### Backend (`apps/api` TypeScript)
- `PORT`, `NODE_ENV`, `CORS_ORIGIN` – server bootstrap and CORS allow list.【F:apps/api/src/server.ts†L17-L62】
- `SUPABASE_JWT_SECRET` – auth verification for `attachAuthContext`.【F:apps/api/src/middleware/auth-context.ts†L1-L116】
- Alpaca OAuth credentials (`ALPACA_PAPER_CLIENT_ID`, `ALPACA_PAPER_CLIENT_SECRET`, `ALPACA_PAPER_REDIRECT_URI`, `ALPACA_LIVE_CLIENT_ID`, `ALPACA_LIVE_CLIENT_SECRET`, `ALPACA_LIVE_REDIRECT_URI`) for paper/live flows.【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】
- `ALPACA_WEBHOOK_SECRET` – validates `/api/alpaca/webhook` signatures.【F:apps/api/src/routes/alpaca-webhook.ts†L1-L39】
- `ALPHA_VANTAGE_API_KEY` – Alpha Vantage proxies and authenticated `/api/market/*` handlers.【F:apps/api/src/services/marketData.ts†L1-L222】【F:apps/api/src/routes/market.ts†L1-L218】
- `OPENAI_API_KEY` – Trading bot AI responses.【F:apps/api/src/routes/tradingbot.ts†L1-L182】
- `DATABASE_URL` – Prisma datasource.【F:apps/api/prisma/schema.prisma†L8-L33】
- `ENCRYPTION_KEY` – Secret storage crypto key for broker token encryption.【F:apps/api/src/lib/crypto.ts†L1-L44】

### Legacy backend extras
- `ALPACA_*` API keys, `ALPHA_VANTAGE_API_KEY`, `OPENAI_API_KEY` consumed directly by `apps/api/index.js` and services.【F:apps/api/index.js†L45-L173】
- `STRIPE_SECRET_KEY` for `stripeBackend.js` demo.【F:apps/api/stripeBackend.js†L1-L61】
- `SUPABASE_SERVICE_ROLE_KEY` for `supabaseClient.js` (should be secured).【F:apps/api/supabaseClient.js†L1-L11】

## Gaps, tech debt, and recommended focus areas
- **Consolidate backend:** Remove or quarantine the legacy JS server (`index.js`, `routes/`, `services/`, `stripeBackend.js`) and ensure scripts point to the TypeScript build to avoid running insecure endpoints.【F:apps/api/package.json†L8-L18】【F:apps/api/index.js†L1-L200】
- **Retire duplicate Alpha routes:** Migrate remaining legacy `/api/alpha-*` endpoints to reuse the `/api/market/*` Alpha proxy (or future provider) and remove redundant code paths.【F:apps/api/src/routes/alpha.ts†L1-L200】【F:apps/api/src/routes/market.ts†L1-L218】
- **Secure Alpaca access:** Continue routing all market data/trading through the authenticated backend; ensure straggling UI flows migrate from legacy `/api/alpha-*` endpoints to `/api/market/*` and keep Alpaca OAuth confined to `/api/v2/alpaca/oauth/*` alongside trading routes under `/api/v2/alpaca/*`.【F:apps/web/src/lib/api.ts†L96-L205】【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】【F:apps/api/src/routes/alpaca-v2.ts†L1-L480】
- **Align auth tokens:** Frontend contexts should reuse Supabase session tokens (already available in `lib/api.ts`) instead of `localStorage` placeholders to authenticate requests like `/api/account` and `/api/tradingbot/autopilot`.【F:apps/web/src/lib/api.ts†L104-L200】【F:apps/web/src/pages/Dashboard.tsx†L152-L167】
- **Implement missing endpoints:** Add `/api/clock`, `/api/tradingbot/execute`, `/api/tradingbot/plays`, `/api/ach/*` (or remove UI hooks) to avoid broken experiences in AutoBot, TradingBot, and FundsWallet flows.【F:apps/web/src/contexts/AutoBotContext.tsx†L98-L112】【F:apps/web/src/pages/tradingbot.tsx†L172-L208】【F:apps/web/src/components/FundsWallet.tsx†L23-L106】
- **Harden AI usage:** Add rate limiting and auth to OpenAI-backed routes and Supabase functions; ensure prompts/results are not exposed publicly.【F:apps/api/src/routes/tradingbot.ts†L31-L99】【F:apps/web/supabase/functions/trading-strategy/index.ts†L1-L116】
- **Clean repository:** Remove tracked `node_modules`, stray `.rtf` files, and ensure build artifacts are gitignored to keep the repo lean.【F:apps/api/package.json†L1-L59】【F:apps/api/index.js†L1-L200】

## Open questions & assumptions
- Assumed Supabase JWTs include role claims compatible with `auth-context`; confirm claim shapes in production before enforcing role guards.【F:apps/api/src/middleware/auth-context.ts†L20-L44】
- ACH flows appear to be prototypes; assumed they will be replaced with Plaid + Stripe ACH or Alpaca funding in future work.
- Autopilot Python scripts presume Alpha Vantage data availability; any move away from Alpha Vantage must include equivalent data feeds for ML pipelines.【F:apps/api/src/routes/tradingbot.ts†L121-L155】
- Deployment should clarify whether the Python runtime is provisioned alongside Node services; documentation is absent.

## Delta log
### 2025-02-15
- Added `docs/DEPLOY.md` to capture current local and production deployment steps for the API and web apps, highlighting the TypeScript server entrypoint and Python runtime needs.【F:docs/DEPLOY.md†L1-L64】
- Confirmed `apps/api` scripts still default to the legacy `index.js` entrypoint (`npm run start`), so teams must run `start:new` until the script is refactored.【F:apps/api/package.json†L7-L18】
- Noted the stray root-level `index.js` placeholder (contains only "nano index.js"), which should be cleaned during repository hygiene tasks.【F:index.js†L1-L1】

### 2025-02-16
- Replaced the browser-only Alpaca client usage with authenticated fetch helpers so market data and trading calls now flow through the backend.【F:apps/web/src/lib/api.ts†L96-L205】【F:apps/web/src/components/TradingChart.tsx†L1-L200】
- Hardened API perimeter by requiring `SUPABASE_JWT_SECRET`, rejecting wildcard origins, enabling Helmet defaults, and adding a signed Alpaca webhook entrypoint.【F:apps/api/src/middleware/auth-context.ts†L1-L116】【F:apps/api/src/server.ts†L17-L78】【F:apps/api/src/routes/alpaca-webhook.ts†L1-L39】
- Added per-user rate limiting and Prisma audit logging for Alpaca trades/autopilot executions, backed by a new `TradeAuditLog` migration.【F:apps/api/src/middleware/rate-limit.ts†L1-L12】【F:apps/api/src/routes/tradingbot.ts†L109-L182】【F:apps/api/prisma/schema.prisma†L122-L157】【F:apps/api/prisma/migrations/20250214_add_trade_audit_logs/migration.sql†L1-L16】

### 2025-02-17
- Introduced `/api/market/*` routes that proxy Alpha Vantage quotes, trades, bars, news, ticker search, and the market clock (with Alpaca-backed clock fallback) under Supabase-authenticated access.【F:apps/api/src/routes/market.ts†L1-L218】【F:apps/api/src/server.ts†L1-L90】

### 2025-02-18
- Added an Alpaca trading service that reuses Supabase-authenticated OAuth tokens for account, position, and order management with retry/backoff semantics, consolidating trading API access behind Express helpers.【F:apps/api/src/services/trading.ts†L1-L213】
- Documented server-only provider secrets in `ARCHITECTURE/ENV.md` and scrubbed `VITE_ALPHA_VANTAGE_API_KEY` usage from docs in favor of backend proxies.【F:ARCHITECTURE/ENV.md†L1-L15】【F:docs/DEPLOY.md†L20-L74】

### 2025-02-19
- Normalized `BrokerConnection` records to store per-user Alpaca OAuth tokens with AES-256-GCM encryption, introducing a required `ENCRYPTION_KEY` configuration and documenting the change across deployment guides.【F:apps/api/prisma/schema.prisma†L34-L55】【F:apps/api/src/lib/crypto.ts†L1-L44】【F:docs/DEPLOY.md†L20-L36】

### 2025-02-20
- Split Alpaca OAuth start/callback into a dedicated router with signed state, per-IP throttling, and Prisma persistence so trading routes stay focused on order/account operations.【F:apps/api/src/routes/alpaca-oauth.ts†L1-L214】【F:apps/api/src/routes/alpaca-v2.ts†L1-L480】
- Renamed Alpaca OAuth environment variables to `ALPACA_{PAPER|LIVE}_*` and updated deployment docs plus examples to match the new configuration surface.【F:ARCHITECTURE/ENV.md†L1-L15】【F:docs/DEPLOY.md†L12-L82】【F:.env.example†L1-L23】
- Tightened `attachAuthContext` to default trading requests to paper mode, attach `req.user`, and reject unauthenticated access to Alpaca routes with Supabase-backed 401s.【F:apps/api/src/middleware/auth-context.ts†L47-L112】
