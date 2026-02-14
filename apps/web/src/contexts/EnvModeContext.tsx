import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

/**
 * Trading environment mode.
 *
 * This toggle only affects Alpaca TRADING actions (orders, account, positions).
 * Market data always comes from the Alpha provider and ignores this setting.
 */
export type EnvMode = 'paper' | 'live';

let envModeSnapshot: EnvMode = 'paper';

export function getEnvModeSnapshot(): EnvMode {
  return envModeSnapshot;
}

interface EnvModeContextType {
  envMode: EnvMode;
  toggleEnvMode: () => Promise<void>;
  setEnvModeExplicit: (mode: EnvMode) => Promise<void>;
  isSyncing: boolean;
}

const STORAGE_KEY = 'bullcircle:env-mode';

const EnvModeContext = createContext<EnvModeContextType>({
  envMode: 'paper',
  toggleEnvMode: async () => undefined,
  setEnvModeExplicit: async () => undefined,
  isSyncing: false,
});

EnvModeContext.displayName = 'EnvModeContext';

export function EnvModeProvider({ children }: { children: ReactNode }) {
  const [envMode, setEnvMode] = useState<EnvMode>('paper');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(STORAGE_KEY) as EnvMode | null;
    if (stored === 'paper' || stored === 'live') {
      envModeSnapshot = stored;
      setEnvMode(stored);
    }
  }, []);

  const setEnvModeExplicit = async (mode: EnvMode) => {
    envModeSnapshot = mode;
    setEnvMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    setIsSyncing(false);
  };

  const toggleEnvMode = async () => {
    const next = envMode === 'paper' ? 'live' : 'paper';
    await setEnvModeExplicit(next);
  };

  return (
    <EnvModeContext.Provider value={{ envMode, toggleEnvMode, setEnvModeExplicit, isSyncing }}>
      {children}
    </EnvModeContext.Provider>
  );
}

export const useEnvMode = () => useContext(EnvModeContext);
