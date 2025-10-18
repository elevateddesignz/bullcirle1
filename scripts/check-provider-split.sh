#!/usr/bin/env bash
set -euo pipefail

if ! command -v rg >/dev/null 2>&1; then
  echo "[provider-split] ripgrep (rg) is required" >&2
  exit 1
fi

status=0

if rg --files-with-matches --iglob 'apps/api/src/routes/market*.ts' -n --regexp "from\\s+['\"]{1}[^'\"]*alpaca" >/dev/null; then
  echo "[provider-split] Alpaca imports detected in market routes" >&2
  status=1
fi

if rg --files-with-matches --iglob 'apps/api/src/routes/alpaca*.ts' -n --regexp "from\\s+['\"]{1}[^'\"]*alpha" >/dev/null; then
  echo "[provider-split] Alpha helpers detected in Alpaca trading routes" >&2
  status=1
fi

if rg --files-with-matches --iglob 'apps/api/src/routes/market*.ts' -n --regexp "from\\s+['\"]{1}\.\./services/alpaca" >/dev/null; then
  echo "[provider-split] services/alpaca.ts should not be imported in market routes" >&2
  status=1
fi

if rg --files-with-matches --iglob 'apps/api/src/routes/alpaca*.ts' -n --regexp "from\\s+['\"]{1}\.\./services/marketData" >/dev/null; then
  echo "[provider-split] services/marketData.ts should not be imported in Alpaca trading routes" >&2
  status=1
fi

exit $status
