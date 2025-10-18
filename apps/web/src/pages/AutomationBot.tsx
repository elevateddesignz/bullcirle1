import React, { useState, useEffect } from 'react';
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
  Percent,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Target,
  Shield
} from 'lucide-react';

// Bot configuration interface
interface BotConfig {
  id: string;
  name: string;
  targetProfit: number;
  stopLossPct: number;
  takeProfitPct: number;
  interval: number;
  isRunning: boolean;
  strategy: string;
  symbols: string[];
  isExpanded: boolean;
  isEditing: boolean;
}

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
  
  // State for multiple bots
  const [bots, setBots] = useState<BotConfig[]>(() => {
    const savedBots = localStorage.getItem('automationBots');
    return savedBots ? JSON.parse(savedBots) : [
      {
        id: 'bot-' + Date.now(),
        name: 'Default Bot',
        targetProfit: 100,
        stopLossPct: 2,
        takeProfitPct: 5,
        interval: 30,
        isRunning: false,
        strategy: 'momentum',
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
        isExpanded: true,
        isEditing: false
      }
    ];
  });
  
  // State for new bot modal
  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [newBotConfig, setNewBotConfig] = useState<Omit<BotConfig, 'id' | 'isRunning' | 'isExpanded' | 'isEditing'>>({
    name: '',
    targetProfit: 100,
    stopLossPct: 2,
    takeProfitPct: 5,
    interval: 30,
    strategy: 'momentum',
    symbols: []
  });
  
  // State for symbol input
  const [symbolInput, setSymbolInput] = useState('');
  
  // Available strategies
  const strategies = [
    { value: 'momentum', label: 'Momentum' },
    { value: 'mean-reversion', label: 'Mean Reversion' },
    { value: 'breakout', label: 'Breakout' },
    { value: 'trend-following', label: 'Trend Following' },
    { value: 'rsi-strategy', label: 'RSI Strategy' }
  ];
  
  // Save bots to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('automationBots', JSON.stringify(bots));
  }, [bots]);

  // Handle starting a bot
  const handleStartBot = (botId: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, isRunning: true } 
          : bot
      )
    );
    
    const bot = bots.find(b => b.id === botId);
    if (bot) {
      start({
        targetProfit: bot.targetProfit,
        stopLossPct: bot.stopLossPct,
        takeProfitPct: bot.takeProfitPct
      });
    }
  };

  // Handle stopping a bot
  const handleStopBot = (botId: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, isRunning: false } 
          : bot
      )
    );
    stop();
  };

  // Handle adding a new bot
  const handleAddBot = () => {
    const newBot: BotConfig = {
      id: 'bot-' + Date.now(),
      name: newBotConfig.name || `Bot ${bots.length + 1}`,
      targetProfit: newBotConfig.targetProfit,
      stopLossPct: newBotConfig.stopLossPct,
      takeProfitPct: newBotConfig.takeProfitPct,
      interval: newBotConfig.interval,
      isRunning: false,
      strategy: newBotConfig.strategy,
      symbols: newBotConfig.symbols,
      isExpanded: true,
      isEditing: false
    };
    
    setBots(prevBots => [...prevBots, newBot]);
    setShowNewBotModal(false);
    setNewBotConfig({
      name: '',
      targetProfit: 100,
      stopLossPct: 2,
      takeProfitPct: 5,
      interval: 30,
      strategy: 'momentum',
      symbols: []
    });
    setSymbolInput('');
  };

  // Handle deleting a bot
  const handleDeleteBot = (botId: string) => {
    const bot = bots.find(b => b.id === botId);
    if (bot?.isRunning) {
      stop();
    }
    
    setBots(prevBots => prevBots.filter(bot => bot.id !== botId));
  };

  // Handle duplicating a bot
  const handleDuplicateBot = (botId: string) => {
    const botToDuplicate = bots.find(b => b.id === botId);
    if (botToDuplicate) {
      const newBot = {
        ...botToDuplicate,
        id: 'bot-' + Date.now(),
        name: `${botToDuplicate.name} (Copy)`,
        isRunning: false,
        isExpanded: true
      };
      
      setBots(prevBots => [...prevBots, newBot]);
    }
  };

  // Toggle bot expansion
  const toggleBotExpansion = (botId: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, isExpanded: !bot.isExpanded } 
          : bot
      )
    );
  };

  // Toggle bot editing
  const toggleBotEditing = (botId: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, isEditing: !bot.isEditing } 
          : bot
      )
    );
  };

  // Update bot configuration
  const updateBotConfig = (botId: string, updates: Partial<BotConfig>) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId 
          ? { ...bot, ...updates } 
          : bot
      )
    );
  };

  // Add symbol to new bot
  const handleAddSymbol = () => {
    if (symbolInput.trim()) {
      const symbol = symbolInput.trim().toUpperCase();
      if (!newBotConfig.symbols.includes(symbol)) {
        setNewBotConfig({
          ...newBotConfig,
          symbols: [...newBotConfig.symbols, symbol]
        });
      }
      setSymbolInput('');
    }
  };

  // Remove symbol from new bot
  const handleRemoveSymbol = (symbol: string) => {
    setNewBotConfig({
      ...newBotConfig,
      symbols: newBotConfig.symbols.filter(s => s !== symbol)
    });
  };

  // Add symbol to existing bot
  const handleAddSymbolToBot = (botId: string, symbol: string) => {
    if (symbol.trim()) {
      const formattedSymbol = symbol.trim().toUpperCase();
      setBots(prevBots => 
        prevBots.map(bot => 
          bot.id === botId && !bot.symbols.includes(formattedSymbol)
            ? { ...bot, symbols: [...bot.symbols, formattedSymbol] } 
            : bot
        )
      );
    }
  };

  // Remove symbol from existing bot
  const handleRemoveSymbolFromBot = (botId: string, symbol: string) => {
    setBots(prevBots => 
      prevBots.map(bot => 
        bot.id === botId
          ? { ...bot, symbols: bot.symbols.filter(s => s !== symbol) } 
          : bot
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl">
            <Zap className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Automation Bots</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create and manage multiple automated trading strategies
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            envMode === 'paper' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
          }`}>
            Trading Mode (orders only): {envMode.toUpperCase()}
          </div>
          
          <button
            onClick={() => setShowNewBotModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            <span>New Bot</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-8">
        {bots.map(bot => (
          <div 
            key={bot.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  bot.isRunning 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {bot.isRunning ? <Zap size={20} /> : <Pause size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{bot.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{bot.strategy}</span>
                    <span>•</span>
                    <span>{bot.symbols.length} symbols</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {bot.isRunning ? (
                  <button
                    onClick={() => handleStopBot(bot.id)}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-1.5 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Pause size={16} />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartBot(bot.id)}
                    className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-1.5 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  >
                    <Play size={16} />
                    <span>Start</span>
                  </button>
                )}
                
                <button
                  onClick={() => toggleBotEditing(bot.id)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                
                <button
                  onClick={() => handleDuplicateBot(bot.id)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy size={16} />
                </button>
                
                <button
                  onClick={() => handleDeleteBot(bot.id)}
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                
                <button
                  onClick={() => toggleBotExpansion(bot.id)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {bot.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            
            {bot.isExpanded && (
              <div className="p-4">
                {bot.isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Bot Name
                        </label>
                        <input
                          type="text"
                          value={bot.name}
                          onChange={(e) => updateBotConfig(bot.id, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Strategy
                        </label>
                        <select
                          value={bot.strategy}
                          onChange={(e) => updateBotConfig(bot.id, { strategy: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                        >
                          {strategies.map(strategy => (
                            <option key={strategy.value} value={strategy.value}>
                              {strategy.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Target Profit
                          </label>
                          <span className="text-sm font-bold">${bot.targetProfit}</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          step="10"
                          value={bot.targetProfit}
                          onChange={(e) => updateBotConfig(bot.id, { targetProfit: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Stop Loss
                          </label>
                          <span className="text-sm font-bold">{bot.stopLossPct}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={bot.stopLossPct}
                          onChange={(e) => updateBotConfig(bot.id, { stopLossPct: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Take Profit
                          </label>
                          <span className="text-sm font-bold">{bot.takeProfitPct}%</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={bot.takeProfitPct}
                          onChange={(e) => updateBotConfig(bot.id, { takeProfitPct: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Check Interval
                        </label>
                        <span className="text-sm font-bold">{bot.interval} min</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={bot.interval}
                        onChange={(e) => updateBotConfig(bot.id, { interval: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Symbols
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {bot.symbols.map(symbol => (
                          <div 
                            key={symbol}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1"
                          >
                            <span>{symbol}</span>
                            <button
                              onClick={() => handleRemoveSymbolFromBot(bot.id, symbol)}
                              className="text-gray-500 hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add symbol (e.g., AAPL)"
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                          value={symbolInput}
                          onChange={(e) => setSymbolInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSymbolToBot(bot.id, symbolInput);
                              setSymbolInput('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            handleAddSymbolToBot(bot.id, symbolInput);
                            setSymbolInput('');
                          }}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleBotEditing(bot.id)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Target Profit</div>
                          <div className="font-bold text-lg flex items-center gap-1">
                            <DollarSign size={18} className="text-green-500" />
                            ${bot.targetProfit}
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Interval</div>
                          <div className="font-bold text-lg flex items-center gap-1">
                            <Clock size={18} className="text-blue-500" />
                            {bot.interval} min
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Stop Loss</div>
                          <div className="font-bold text-lg flex items-center gap-1">
                            <Shield size={18} className="text-red-500" />
                            {bot.stopLossPct}%
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Take Profit</div>
                          <div className="font-bold text-lg flex items-center gap-1">
                            <Target size={18} className="text-green-500" />
                            {bot.takeProfitPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Strategy: <span className="capitalize">{bot.strategy}</span>
                        </h4>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {bot.strategy === 'momentum' && 'Identifies stocks with strong price momentum and volume increases.'}
                          {bot.strategy === 'mean-reversion' && 'Trades stocks that have moved significantly away from their average price.'}
                          {bot.strategy === 'breakout' && 'Identifies stocks breaking through significant price levels.'}
                          {bot.strategy === 'trend-following' && 'Follows established market trends for longer-term positions.'}
                          {bot.strategy === 'rsi-strategy' && 'Uses the Relative Strength Index to identify overbought and oversold conditions.'}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Symbols ({bot.symbols.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {bot.symbols.map(symbol => (
                            <div 
                              key={symbol}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                            >
                              {symbol}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" />
              Activity Log
            </h3>
          </div>
          <div className="p-4 h-64 overflow-y-auto text-sm font-mono">
            {log.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 italic">No activity yet</div>
            ) : (
              log.map((line, i) => (
                <div key={i} className="mb-1 leading-relaxed">{line}</div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold flex items-center gap-2">
              <Target size={18} className="text-green-500" />
              Strategy Log
            </h3>
          </div>
          <div className="p-4 h-64 overflow-y-auto text-sm font-mono">
            {strategyLog.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 italic">No strategies executed yet</div>
            ) : (
              strategyLog.map((line, i) => (
                <div key={i} className="mb-1 leading-relaxed">{line}</div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm">
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

      {/* New Bot Modal */}
      {showNewBotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create New Bot</h3>
              <button
                onClick={() => setShowNewBotModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={newBotConfig.name}
                  onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                  placeholder="My Trading Bot"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Strategy
                </label>
                <select
                  value={newBotConfig.strategy}
                  onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  {strategies.map(strategy => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Target Profit
                    </label>
                    <span className="text-sm font-bold">${newBotConfig.targetProfit}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={newBotConfig.targetProfit}
                    onChange={(e) => setNewBotConfig({...newBotConfig, targetProfit: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Stop Loss
                    </label>
                    <span className="text-sm font-bold">{newBotConfig.stopLossPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={newBotConfig.stopLossPct}
                    onChange={(e) => setNewBotConfig({...newBotConfig, stopLossPct: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Take Profit
                    </label>
                    <span className="text-sm font-bold">{newBotConfig.takeProfitPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={newBotConfig.takeProfitPct}
                    onChange={(e) => setNewBotConfig({...newBotConfig, takeProfitPct: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Check Interval
                  </label>
                  <span className="text-sm font-bold">{newBotConfig.interval} min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={newBotConfig.interval}
                  onChange={(e) => setNewBotConfig({...newBotConfig, interval: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symbols
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newBotConfig.symbols.map(symbol => (
                    <div 
                      key={symbol}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1"
                    >
                      <span>{symbol}</span>
                      <button
                        onClick={() => handleRemoveSymbol(symbol)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add symbol (e.g., AAPL)"
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSymbol();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddSymbol}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewBotModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBot}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Create Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}