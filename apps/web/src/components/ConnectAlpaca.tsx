import React from 'react';
import { resolveApiPath } from '../lib/backendConfig';

interface ConnectAlpacaProps {
  mode: 'paper' | 'live';
  className?: string;
}

export function ConnectAlpaca({ mode, className }: ConnectAlpacaProps) {
  const label = mode === 'live' ? 'Live' : 'Paper';

  const handleClick = () => {
    window.location.href = resolveApiPath(`/v2/alpaca/oauth/start?mode=${mode}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-lg border border-brand-primary/60 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/20 focus:outline-none focus-visible:ring focus-visible:ring-brand-primary/40 ${className ?? ''}`.trim()}
    >
      Connect Alpaca ({label})
    </button>
  );
}

export default ConnectAlpaca;
