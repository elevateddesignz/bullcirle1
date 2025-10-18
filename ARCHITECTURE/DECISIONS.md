## 2025-02-22 – Alpaca OAuth & Provider Enforcement
- ✅ Each user connects their own Alpaca (paper/live) via OAuth; tokens stored encrypted in `BrokerConnection`. *(commit 8a579ae)*
- ✅ All trading routes fetch Alpaca tokens by `(userId, mode)` and NEVER use shared env creds for orders. *(commit 8a579ae)*
- ✅ `x-env-mode` header (`paper`|`live`) controls trading mode only; default `paper`. *(commit 8a579ae)*
- ✅ Market data remains Alpha Vantage-only; no client-side keys leaked. *(commit 8a579ae)*
- ✅ 412 “No Alpaca <mode> connection” handled with UI CTA. *(commit 8a579ae)*
- ✅ Audit logging of trade actions implemented. *(commit 8a579ae)*

