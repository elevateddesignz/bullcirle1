import React, { useState } from 'react';
import { useAutoBot } from '../contexts/AutoBotContext';
import { useEnvMode } from '../contexts/EnvModeContext';
import { 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Percent
} from 'lucide-react';

export default function AutomationBot() {
  const { 
    running, 
    busy, 
    interval, 
    equity, 
    log, 
    strategyLog, 
    error, 
    start, 
    stop, 
    setIntervalMin 
  } = useAutoBot();
  
  const { envMode } = useEnvMode();
  const [targetProfit, setTargetProfit] = useState(100);
  const [stopLossPct, setStopLossPct] = useState(2);
  const [takeProfitPct, setTakeProfitPct] = useState(5);

  const handleStart = () => {
    start({
      targetProfit,
      stopLossPct,
      takeProfitPct
    });
  };

  return (
    <div className="auto-bot-container">
      <div className="auto-bot-header">
        <h1 className="auto-bot-title">
          <Zap className={busy ? "auto-bot-spinner" : ""} />
          Automation Bot
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Automated trading with AI-powered signals
        </p>
      </div>

      {error && (
        <div className="auto-bot-error mb-4">
          <AlertTriangle size={16} className="inline mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings size={18} />
              Bot Settings
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} />
              <span>{interval} min interval</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Target Profit */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Target Profit</label>
                <span className="text-sm font-bold">${targetProfit}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={targetProfit}
                onChange={(e) => setTargetProfit(parseInt(e.target.value))}
                className="w-full"
                disabled={running}
              />
            </div>

            {/* Stop Loss */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Stop Loss</label>
                <span className="text-sm font-bold">{stopLossPct}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(parseFloat(e.target.value))}
                className="w-full"
                disabled={running}
              />
            </div>

            {/* Take Profit */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Take Profit</label>
                <span className="text-sm font-bold">{takeProfitPct}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={takeProfitPct}
                onChange={(e) => setTakeProfitPct(parseFloat(e.target.value))}
                className="w-full"
                disabled={running}
              />
            </div>

            {/* Interval */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Check Interval</label>
                <span className="text-sm font-bold">{interval} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={interval}
                onChange={(e) => setIntervalMin(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign size={18} />
              Account Status
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                envMode === 'paper' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
              }`}>
                {envMode.toUpperCase()} MODE
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Equity:</span>
              <span className="font-bold">${equity.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Bot Status:</span>
              <span className={`font-medium ${running ? 'text-green-500' : 'text-gray-500'}`}>
                {running ? 'Running' : 'Stopped'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Target per Trade:</span>
              <span className="font-medium">${targetProfit}</span>
            </div>

            <div className="mt-4">
              {running ? (
                <button
                  onClick={stop}
                  disabled={busy}
                  className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Pause size={18} />
                  Stop Bot
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  Start Bot
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="auto-bot-log-wrapper">
          <h3 className="auto-bot-log-title">Activity Log</h3>
          <div className="auto-bot-log">
            {log.length === 0 ? (
              <div className="auto-bot-log-empty">No activity yet</div>
            ) : (
              log.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>

        <div className="auto-bot-strategy-log-wrapper">
          <h3 className="auto-bot-strategy-title">Strategy Log</h3>
          <div className="auto-bot-strategy-log">
            {strategyLog.length === 0 ? (
              <div className="auto-bot-log-empty">No strategies executed yet</div>
            ) : (
              strategyLog.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-300">Risk Disclaimer</p>
            <p className="text-yellow-700 dark:text-yellow-400 mt-1">
              Automated trading involves substantial risk of loss. Only trade with capital you can afford to lose.
              Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}