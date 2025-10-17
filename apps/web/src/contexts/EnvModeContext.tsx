import { createContext, useContext, useState, ReactNode } from 'react';

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export type EnvMode = 'paper' | 'live';

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

async function persistPreference(mode: EnvMode) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ env_mode: mode })
      .eq('id', user.id);
  } catch (error) {
    console.error('Failed to persist env mode', error);
  }
}

export function EnvModeProvider({ children }: { children: ReactNode }) {
  const [envMode, setEnvMode] = useState<EnvMode>('paper');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(STORAGE_KEY) as EnvMode | null;
    if (stored === 'paper' || stored === 'live') {
      setEnvMode(stored);
      return;
    }

    const loadPreference = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('env_mode')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.env_mode === 'paper' || data?.env_mode === 'live') {
          setEnvMode(data.env_mode);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, data.env_mode);
          }
        }
      } catch (error) {
        console.warn('Failed to load env mode preference', error);
      }
    };

    void loadPreference();
  }, []);

  const setEnvModeExplicit = async (mode: EnvMode) => {
    setEnvMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    setIsSyncing(true);
    await persistPreference(mode);
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
