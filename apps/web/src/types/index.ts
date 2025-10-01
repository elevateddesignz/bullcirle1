import { Database } from './supabase';

export type ChartType = 'candlestick' | 'line';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  joinDate: string;
  tradingStats: {
    totalTrades: number;
    winRate: number;
    profitLoss: number;
  };
  user_subscriptions?: {
    tier_id: string;
    status: string;
  }[];
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  winRate: number;
  totalTrades: number;
  profitLoss: number;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  features: {
    features: string[];
    limits: {
      trades_per_month: number;
      watchlist_items: number;
      real_time_quotes: boolean;
      advanced_charts: boolean;
      api_access: boolean;
    };
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  tierId: string;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface PeerConnection {
  id: string;
  userId: string;
  peerId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isPrivate: boolean;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
  settings: {
    allowMemberInvites: boolean;
    showMemberTrades: boolean;
    allowTradeTags: boolean;
  };
}

export interface CircleMember {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'active' | 'banned';
  badges: string[];
  joinedAt: string;
}

export interface CirclePost {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  postType: 'message' | 'trade' | 'resource';
  metadata: {
    tradeId?: string;
    symbol?: string;
    resourceUrl?: string;
    resourceType?: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
}

export interface CircleWatchlistItem {
  id: string;
  symbol: string;
  notes: string | null;
  alerts: {
    type: 'price' | 'volume' | 'change';
    value: number;
    condition: 'above' | 'below';
  }[];
  addedBy: {
    userId: string;
    username: string;
  };
  createdAt: string;
}