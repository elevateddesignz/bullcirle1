import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useEnvMode } from './EnvModeContext';
import { analyzeStock, executeTrade, runTradingBot, findBestStrategy } from '../lib/tradingBotService';

export interface StartOpts {
  targetProfit: number;
  stopLossPct: number;
  takeProfitPct: number;
}

type LogLine = string;

interface AutoBotCtx {
  running: boolean;
  busy: boolean;
  interval: number;
  equity: number;
  log: LogLine[];
  strategyLog: LogLine[];
  error: string | null;
  start: (opts: StartOpts) => void;
  stop: () => void;
  setIntervalMin: (min: number) => void;
}

const Ctx = createContext<AutoBotCtx | null>(null);
export const useAutoBot = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAutoBot must be used within AutoBotProvider');
  return ctx;
};

export function AutoBotProvider({ children }: { children: React.ReactNode }) {
  const { envMode } = useEnvMode();           // "paper" or "live"
  const modeParam   = envMode.toLowerCase();  // lowercase for API

  const [running, setRunning]         = useState(false);
  const [interval, setIntervalMin]    = useState(30);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [log, setLog]                 = useState<LogLine[]>([]);
  const [strategyLog, setStrategyLog] = useState<LogLine[]>([]);
  const [equity, setEquity]           = useState<number>(0);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const optsRef    = useRef<StartOpts>({ targetProfit: 0, stopLossPct: 0, takeProfitPct: 0 });

  const addLog = (msg: string) =>
    setLog(prev => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.length > 300 ? next.slice(-300) : next;
    });

  const addStrategyLog = (msg: string) =>
    setStrategyLog(prev => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.length > 300 ? next.slice(-300) : next;
    });

  // include Bearer token like Dashboard
  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  // Fetch & return the latest equity
  const fetchEquity = useCallback(async (): Promise<number> => {
    const api = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${api}/api/account?mode=${modeParam}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Equity HTTP ${res.status}`);
    const { account } = await res.json();
    const eq = parseFloat(account.equity);
    setEquity(eq);
    return eq;
  }, [modeParam]);

  // One bot cycle
  const tick = useCallback(async () => {
    if (!runningRef.current) return;
    const api = import.meta.env.VITE_API_URL || '';
    const hdr = getHeaders();
    const { targetProfit, stopLossPct, takeProfitPct } = optsRef.current;

    try {
      setBusy(true);
      setError(null);

      // 1) Fetch & log equity
      const currentEq = await fetchEquity();
      addLog(`Equity: $${currentEq.toFixed(2)}`);

      // 2) Market hours check
      const clockRes = await fetch(`${api}/api/clock?mode=${modeParam}`, { headers: hdr });
      if (clockRes.ok) {
        const { is_open, next_open } = await clockRes.json();
        if (!is_open) {
          addLog(`⏸ Market closed; opens at ${new Date(next_open).toLocaleTimeString()}`);
          return;
        }
      }

      // 3) Find best strategy
      addLog(`🔍 Searching for best trading strategy...`);
      const bestStrategy = await findBestStrategy(modeParam as 'paper' | 'live');
      
      if (bestStrategy) {
        addLog(`✓ Found best strategy: ${bestStrategy.strategy.strategy} for ${bestStrategy.symbol}`);
        addLog(`📊 Confidence: ${bestStrategy.strategy.confidence}%`);
        addStrategyLog(`💡 Strategy: ${bestStrategy.strategy.strategy} for ${bestStrategy.symbol}`);
        addStrategyLog(`📝 Analysis: ${bestStrategy.strategy.analysis}`);
        
        // 4) Execute trade if confidence is high enough
        if (
          bestStrategy.strategy.recommendation === 'buy' && 
          bestStrategy.strategy.confidence >= 70
        ) {
          addLog(`🔄 Executing trade for ${bestStrategy.symbol}...`);
          
          try {
            const quantity = Math.max(1, Math.floor(targetProfit / bestStrategy.price));
            const tradeResult = await executeTrade(
              bestStrategy.symbol,
              'buy',
              quantity,
              modeParam as 'paper' | 'live'
            );
            
            addLog(`✅ Trade executed: Bought ${quantity} shares of ${bestStrategy.symbol}`);
            addStrategyLog(`✅ Bought ${quantity} shares of ${bestStrategy.symbol} at $${bestStrategy.price.toFixed(2)}`);
          } catch (tradeError: any) {
            addLog(`❌ Trade failed: ${tradeError.message}`);
          }
        } else {
          addLog(`⏹ No trade executed - confidence too low or not a buy signal`);
        }
      } else {
        addLog(`⚠️ No suitable strategy found at this time`);
      }

      // 5) Run the trading bot analysis
      addLog(`🔍 Running trading bot analysis...`);
      const botResult = await runTradingBot(targetProfit, stopLossPct, takeProfitPct, modeParam as 'paper' | 'live');
      
      // 6) Log results
      addLog(`✓ Analyzed ${botResult.analyzed} symbols`);
      
      if (botResult.topPicks.length > 0) {
        addLog(`📊 Top picks:`);
        botResult.topPicks.forEach(pick => {
          addLog(`  ${pick.symbol}: ${pick.strategy.recommendation.toUpperCase()} (${pick.strategy.confidence}% confidence)`);
        });
      }
      
      // 7) Log executed trades
      if (botResult.executedTrades.length > 0) {
        addLog(`🔄 Executed ${botResult.executedTrades.length} trades`);
        botResult.executedTrades.forEach(trade => {
          const action = trade.side === 'buy' ? 'Bought' : 'Sold';
          addStrategyLog(`✅ ${action} ${trade.quantity} shares of ${trade.symbol} at $${trade.price.toFixed(2)}`);
          addStrategyLog(`   Strategy: ${trade.strategy} (${trade.confidence}% confidence)`);
        });
      } else {
        addLog(`⏹ No additional trades executed this cycle`);
      }
    } catch (err: any) {
      const msg = err.message || 'request failed';
      addLog(`✗ ${msg}`);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [modeParam, fetchEquity]);

  const start = (opts: StartOpts) => {
    if (runningRef.current) return;
    optsRef.current    = opts;
    runningRef.current = true;
    setRunning(true);
    addLog(`▶ started [${envMode.toUpperCase()}]`);
    tick();
    timerRef.current = setInterval(tick, interval * 60_000);
  };

  const stop = () => {
    if (!runningRef.current) return;
    runningRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setBusy(false);
    addLog('⏹ stopped');
  };

  // react to interval change
  useEffect(() => {
    if (runningRef.current && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, interval * 60_000);
      addLog(`↻ interval → ${interval}m`);
    }
  }, [interval, tick]);

  // react to PAPER/LIVE toggle
  useEffect(() => {
    fetchEquity();
    if (runningRef.current) {
      if (timerRef.current) clearInterval(timerRef.current);
      addLog(`↻ mode → ${envMode.toUpperCase()}`);
      tick();
      timerRef.current = setInterval(tick, interval * 60_000);
    }
  }, [envMode, fetchEquity, tick, interval]);

  // initial equity load
  useEffect(() => {
    fetchEquity();
  }, [fetchEquity]);

  // cleanup on unmount
  useEffect(() => () => stop(), []);

  return (
    <Ctx.Provider
      value={{
        running,
        busy,
        interval,
        equity,
        log,
        strategyLog,
        error,
        start,
        stop,
        setIntervalMin,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}