# Audit Confirmation (2025-02-14)

This document double-checks the previously captured audit details against the current repository snapshot.

## Monorepo structure & runtime entrypoints
- Root `package.json` exposes two npm workspaces (`apps/web`, `apps/api`) and delegates `npm run start:api` to the API workspace, confirming the monorepo layout.【F:package.json†L1-L17】
- The API package still points its default `start` script at the legacy JavaScript server (`node index.js`) while the TypeScript build emits `dist/server.js`, leaving deployments prone to launching the outdated stack unless `start:new` is invoked explicitly.【F:apps/api/package.json†L7-L19】
- `apps/api/src/server.ts` boots the modern Express server with Helmet, CORS, Supabase-aware auth context, and mounts routers for `/api/v2/alpaca/oauth`, `/api/v2/alpaca`, `/api/market`, `/api/autopilot`, and `/api/tradingbot`, matching the audit’s description of the TypeScript server plumbing.【F:apps/api/src/server.ts†L1-L90】

## Frontend auth contexts & token storage
- `AuthContext` sources authentication exclusively from Supabase (`supabase.auth.getSession()`), handling register/login/logout flows without ever touching `localStorage` for bearer tokens, matching the audit’s Supabase-centric flow.【F:apps/web/src/contexts/AuthContext.tsx†L18-L106】
- `AutoBotContext` still reads a `token` from `localStorage` to build `Authorization` headers for `/api/account` and `/api/clock` calls, confirming the audit’s note about divergent token handling between contexts.【F:apps/web/src/contexts/AutoBotContext.tsx†L68-L110】

## Market data providers & secret exposure
- The trading chart component now uses `marketFetch` to call the backend Alpha proxy, so no Alpha Vantage secrets are bundled into the browser build.【F:apps/web/src/components/TradingChart.tsx†L49-L140】【F:apps/web/src/lib/api.ts†L96-L205】
- Shared API utilities initialise the Supabase JS client with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and call backend routes via `marketFetch`/`tradeFetch`, mirroring the audit’s environment-variable assessment while avoiding provider secrets in the client.【F:apps/web/src/lib/api.ts†L5-L205】
- The rebuilt `apps/api/src/services/marketData.ts` proxies Alpha Vantage quote, trade, bar, news, and search payloads while keeping `/api/clock` wired to Alpaca when an OAuth session is available, codifying the provider split in TypeScript.【F:apps/api/src/services/marketData.ts†L1-L222】【F:apps/api/src/routes/market.ts†L1-L115】

## Provider split guardrails
- `docs/DECISIONS.md` now records the “Provider Split” decision: Alpha Vantage powers `/api/market/*`, Alpaca handles `/api/v2/alpaca/*`, and `/api/clock` prefers Alpaca with a synthetic fallback, preventing future regressions.【F:docs/DECISIONS.md†L1-L12】
- `scripts/check-provider-split.sh` runs during `npm run precommit` to fail builds if market routes import Alpaca clients or Alpaca routes pull in Alpha helpers, enforcing the documented boundary.【F:scripts/check-provider-split.sh†L1-L44】【F:package.json†L10-L18】

## Endpoint coverage vs. UI expectations
- The TypeScript trading bot router offers `/signal`, `/` (analysis), `/journal`, and `/autopilot` endpoints but omits `/execute` or `/plays`, aligning with the reported gaps.【F:apps/api/src/routes/tradingbot.ts†L31-L157】
- The dashboard/automation UI still targets `/api/account?mode=...` and `/api/clock`, and the new `/api/clock` handler in the market router now fulfils part of that contract while account endpoints remain incomplete.【F:apps/web/src/contexts/AutoBotContext.tsx†L76-L110】【F:apps/api/src/routes/market.ts†L1-L218】
- TradingBot and FundsWallet screens continue to call `/api/tradingbot/execute`, `/api/tradingbot/plays`, and `/api/ach/*`, none of which are implemented in the active routers (only a standalone Stripe sandbox exposes `/api/ach-payment`).【F:apps/web/src/pages/tradingbot.tsx†L172-L208】【F:apps/web/src/components/FundsWallet.tsx†L23-L108】【F:apps/api/stripeBackend.js†L18-L44】

## Python ML integration
- `/api/tradingbot/autopilot` launches `ml_model/predict_trade.py` via `python-shell`, matching the audit’s description of Python-assisted trade decisions.【F:apps/api/src/routes/tradingbot.ts†L106-L152】【F:ml_model/predict_trade.py†L1-L84】
- The standalone autopilot router expects a long-running `ml_model/autopilot_loop.py`, but that script is absent from the `ml_model/` directory today, explaining current autopilot start failures and confirming the audit’s concern about missing ML assets.【F:apps/api/src/routes/autopilot.ts†L9-L59】【5c1511†L1-L2】

