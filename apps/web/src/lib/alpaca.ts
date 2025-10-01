import { format } from 'date-fns';

// Custom Alpaca client for browser
class AlpacaClient {
  private baseUrl: string;
  private dataUrl: string;
  private wsUrl: string;
  private keyId: string;
  private secretKey: string;
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = 'https://paper-api.alpaca.markets';
    this.dataUrl = 'https://data.alpaca.markets';
    this.wsUrl = 'wss://stream.data.alpaca.markets/v2/iex';
    this.keyId = import.meta.env.VITE_ALPACA_KEY_ID;
    this.secretKey = import.meta.env.VITE_ALPACA_SECRET_KEY;

    if (!this.keyId || !this.secretKey) {
      throw new Error('Missing Alpaca API credentials');
    }
  }

  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return this.connectionPromise!;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.authenticate();
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.T === 'success' && data.msg === 'authenticated') {
              this.subscribe();
            } else if (data.T === 'error') {
              console.error('WebSocket error:', data.msg);
            } else {
              this.handleStreamMessage(data);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
          this.isConnecting = false;
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect().catch(console.error);
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('Failed to connect to WebSocket:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      action: 'auth',
      key: this.keyId,
      secret: this.secretKey
    }));
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.subscriptions.size === 0) return;

    this.ws.send(JSON.stringify({
      action: 'subscribe',
      trades: Array.from(this.subscriptions),
      quotes: Array.from(this.subscriptions)
    }));
  }

  private handleStreamMessage(data: any): void {
    const handler = this.messageHandlers.get(data.S);
    if (handler) {
      handler(data);
    }
  }

  async subscribeToSymbol(symbol: string, onUpdate: (data: any) => void): Promise<void> {
    try {
      await this.connect();
      this.subscriptions.add(symbol);
      this.messageHandlers.set(symbol, onUpdate);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.subscribe();
      }
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      throw error;
    }
  }

  unsubscribeFromSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.subscriptions.delete(symbol);
      this.messageHandlers.delete(symbol);
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        trades: [symbol],
        quotes: [symbol]
      }));
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
    }

    this.subscriptions.delete(symbol);
    this.messageHandlers.delete(symbol);
  }

  async getBars(
    symbol: string,
    timeframe: string,
    start: Date,
    end: Date = new Date(),
    limit: number = 1000
  ): Promise<any[]> {
    const url = new URL(`${this.dataUrl}/v2/stocks/${encodeURIComponent(symbol)}/bars`);
    url.searchParams.append('start', format(start, "yyyy-MM-dd'T'HH:mm:ss'Z'"));
    url.searchParams.append('end', format(end, "yyyy-MM-dd'T'HH:mm:ss'Z'"));
    url.searchParams.append('timeframe', timeframe);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('adjustment', 'raw');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'APCA-API-KEY-ID': this.keyId,
          'APCA-API-SECRET-KEY': this.secretKey
        }
      });

      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.bars || [];
    } catch (error) {
      console.error(`Failed to get bars for ${symbol}:`, error);
      return [];
    }
  }

  disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
    this.ws = null;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.subscriptions.clear();
    this.messageHandlers.clear();
  }
}

const alpacaClient = new AlpacaClient();

export const marketData = {
  subscribeToSymbol: (symbol: string, onUpdate: (data: any) => void) =>
    alpacaClient.subscribeToSymbol(symbol, onUpdate),
  unsubscribeFromSymbol: (symbol: string) =>
    alpacaClient.unsubscribeFromSymbol(symbol),
  getBars: (symbol: string, timeframe: string, start: Date, end?: Date, limit?: number) =>
    alpacaClient.getBars(symbol, timeframe, start, end, limit),
  disconnect: () => alpacaClient.disconnect()
};