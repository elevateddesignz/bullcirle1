# BullCircle Refactor Plan

## Current State (2025-09-30)
- **Backend (`apps/api`)** written in JavaScript, Bun runtime, Express.
  - Uses Alpaca API keys from env + shared headers.
  - No Prisma or database models for broker connections.
  - No role-based middleware or token encryption.
  - Supabase client present, but not integrated with API auth middleware.
- **Frontend (`apps/web`)** Vite + React.
  - Supabase Auth context, but Alpaca connections assumed global (no OAuth).
  - Environment toggle limited / inconsistent.
  - Pages mostly exist for dashboard/trading/bot/learn; missing many sections (Community, Pricing, Support, Legal, etc.).
- **Tooling**
  - No monorepo workspace tooling beyond npm workspaces (added 2025-09-30).
  - No shared config for logging, security, or testing.

## Refactor Goals
1. Multi-tenant Alpaca via OAuth (paper + live).
2. Environment toggle that flows through UI and API.
3. Expanded app surface: Trading Hub, Autopilot TradeBot, Bull Circle University, Community, Pricing, Support, Legal, Developers/API, Admin, Status/Changelog/Roadmap.
4. Security hardening: encrypted tokens, role guards, logging redaction, row-level checks.
5. Tests, seed data, smoke checklist.

## Architecture Direction
- **Backend**
  - Migrate to TypeScript (ts-node or build step via `tsup`).
  - Introduce Prisma ORM (PostgreSQL). Add `BrokerConnection`, `User`, `Role`, `AppPage`, `StatusEntry`, etc.
  - Use an encryption service: AES-256-GCM with rotating key (env `ENCRYPTION_KEY`). Support AWS KMS envelope.
  - Add Alpaca OAuth flow: `/api/alpaca/connect`, `/api/alpaca/callback`, `/api/alpaca/accounts`, `/api/alpaca/orders` etc. Use `BrokerConnection` records keyed by `userId+env`.
  - Add role middleware `requireRole` + `requireVerifiedEmail` hooking into Supabase/JWT.
  - Implement per-request context deriving `userId`, `roles`, `envMode`.
  - Add logging via Pino with redaction for auth headers + secrets.
  - Tests: Jest for unit + supertest for API integration.
  - Seeds: Prisma seed for demo users, connections (mock), course catalog, community posts placeholder.

- **Frontend**
  - Update auth context to capture roles + verification.
  - Add Alpaca Connect UI: Connect/Disconnect, environment toggle persisted per user.
  - Build new navigation sections & placeholder content aligning with requested pages.
  - Trading Hub reorganized to surface environment-specific data via new API endpoints.
  - Autopilot TradeBot config to call new API endpoints using OAuth tokens.
  - Admin dashboard gating by role.
  - University, Community, Pricing, Support, Legal, Developers/API, Status/Changelog/Roadmap pages with modular components.
  - Tests: React Testing Library smoke tests for critical routes.

- **DevOps**
  - Update `.env.example`, `.env.local`.
  - Document deployment steps for API (PM2) & frontend (Bluehost static) referencing new build outputs.
  - Smoke checklist covering login, Alpaca connect (paper), env toggle, basic trading, admin access.

## Implementation Phases
1. **Backend Foundation**
   - Convert backend to TypeScript, add build tooling.
   - Introduce Prisma schema & migrations (`BrokerConnection`, `User`, etc.).
   - Implement encryption utility + logging setup.
   - Create OAuth routes + service wrappers.
   - Replace existing Alpaca endpoints with new client abstraction (preserve compatibility via versioned routes `v1` vs `v2`).

2. **Frontend Integration**
   - Update contexts for roles/env toggle.
   - Implement Alpaca OAuth flow + Connect UI.
   - Refactor dashboard/trade/autopilot to call new endpoints.
   - Build new site sections & navigation.

3. **Security & QA**
   - Add role/verification middleware to sensitive routes.
   - Implement test suites (unit + integration + UI smoke).
   - Seed data + smoke checklist.
   - Documentation updates.

## Open Questions
- Exact Supabase auth payload: confirm JWT claims for roles/verification.
- Deployment build pipeline: confirm Bun vs Node for API (recommend Node + ts-node/pm2 for consistency).
- Access to Alpaca OAuth credentials for both envs.

