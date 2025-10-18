# Architecture & Product Decisions

## 2025-02-14 – Provider Split
- **Market data** (quotes, bars, news, symbol search) must source data from Alpha Vantage only. No Alpaca market-data clients are allowed in `/api/market/*` handlers or their dependencies.
- **Trading flows** (account state, positions, orders, streaming fills, funding) remain Alpaca-only and require OAuth tokens stored in Prisma. These flows live under `/api/v2/alpaca/*` and related trading automation routes.
- **Route ownership**: `/api/market/*` exposes Alpha-backed read-only endpoints, while `/api/v2/alpaca/*` serves authenticated trading mutations. Cross-calling between the two stacks is prohibited.
- **Market clock**: `/api/clock` should use the Alpaca market clock when an authenticated Alpaca session is available. When unavailable, return a synthetic schedule documented in the handler until full connectivity is restored.
- **Tooling guardrails**: provider-specific lint checks block merges if Alpha helpers appear in trading routes or Alpaca clients appear in market routes. Update `scripts/check-provider-split.sh` when adding new route namespaces.
