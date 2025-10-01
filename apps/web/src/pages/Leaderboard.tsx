import React from 'react';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';
import type { LeaderboardEntry } from '../types';

export default function Leaderboard() {
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        // Transform and normalize the data
        const normalizedData = data.map((entry, index) => ({
          rank: index + 1,
          userId: entry.id,
          username: entry.username || 'Anonymous',
          avatar: entry.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.id}`,
          winRate: 0,
          totalTrades: 0,
          profitLoss: 0,
        }));
        setEntries(normalizedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <div className="flex items-center gap-2 text-gray-400">
          <Trophy size={20} />
          <span>Top Traders</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-2">Trader</div>
          <div className="text-right">Win Rate</div>
          <div className="text-right">Trades</div>
          <div className="text-right">P/L</div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {entries.map((entry) => (
            <div
              key={entry.userId}
              className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="col-span-1 text-center">
                <span className={`
                  inline-flex items-center justify-center w-8 h-8 rounded-full font-bold
                  ${entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                    entry.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                    entry.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                `}>
                  {entry.rank}
                </span>
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <img
                  src={entry.avatar}
                  alt={entry.username}
                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
                />
                <span className="font-medium text-gray-900 dark:text-white">{entry.username}</span>
              </div>

              <div className="text-right font-medium text-gray-900 dark:text-white">
                {entry.winRate?.toFixed(1) ?? '0.0'}%
              </div>

              <div className="text-right text-gray-500 dark:text-gray-400">
                {entry.totalTrades?.toLocaleString() ?? '0'}
              </div>

              <div className={`text-right font-medium ${
                (entry.profitLoss ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <div className="flex items-center justify-end gap-1">
                  {(entry.profitLoss ?? 0) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  ${Math.abs(entry.profitLoss ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}