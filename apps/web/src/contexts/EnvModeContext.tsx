import { createContext, useContext, useState, ReactNode } from 'react';

type EnvMode = 'paper' | 'live';

interface EnvModeContextType {
  envMode: EnvMode;
  toggleEnvMode: () => void;
}

const EnvModeContext = createContext<EnvModeContextType>({
  envMode: 'paper',
  toggleEnvMode: () => {},
});

export function EnvModeProvider({ children }: { children: ReactNode }) {
  const [envMode, setEnvMode] = useState<EnvMode>('paper');

  const toggleEnvMode = () => {
    setEnvMode((prev) => (prev === 'paper' ? 'live' : 'paper'));
  };

  return (
    <EnvModeContext.Provider value={{ envMode, toggleEnvMode }}>
      {children}
    </EnvModeContext.Provider>
  );
}

export const useEnvMode = () => useContext(EnvModeContext);
