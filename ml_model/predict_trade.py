# ml_model/predict_trade.py
import sys, json
import pandas as pd

def compute_rsi(prices, period=14):
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]


def compute_macd(prices, fast=12, slow=26, signal=9):
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    hist = macd_line - signal_line
    return macd_line.iloc[-1], signal_line.iloc[-1]


def compute_sma_cross(prices, short=50, long=200):
    sma_short = prices.rolling(window=short).mean()
    sma_long = prices.rolling(window=long).mean()
    if sma_short.iloc[-2] < sma_long.iloc[-2] and sma_short.iloc[-1] > sma_long.iloc[-1]:
        return "buy", 0.7
    if sma_short.iloc[-2] > sma_long.iloc[-2] and sma_short.iloc[-1] < sma_long.iloc[-1]:
        return "sell", 0.7
    return "hold", 0.3


def compute_momentum(prices, window=10):
    momentum = prices.pct_change(periods=window)
    val = momentum.iloc[-1]
    if val > 0.02:
        return "buy", min(val * 50, 0.9)
    if val < -0.02:
        return "sell", min(-val * 50, 0.9)
    return "hold", 0.3


def main():
    # Read input JSON { history: [{date:, o:, h:, l:, c:}], ... }
    data = json.load(sys.stdin)
    hist = pd.DataFrame(data['history'])
    hist['date'] = pd.to_datetime(hist['date'])
    hist.set_index('date', inplace=True)
    close = hist['value'] if 'value' in hist else hist['c']

    results = []

    # RSI strategy
    rsi_val = compute_rsi(close)
    if rsi_val > 70:
        results.append({"strategy": "RSI", "recommendation": "sell", "confidence": (rsi_val - 50)/50})
    elif rsi_val < 30:
        results.append({"strategy": "RSI", "recommendation": "buy", "confidence": (50 - rsi_val)/50})
    else:
        results.append({"strategy": "RSI", "recommendation": "hold", "confidence": 0.3})

    # MACD strategy
    macd, signal = compute_macd(close)
    if macd > signal:
        results.append({"strategy": "MACD", "recommendation": "buy", "confidence": min((macd - signal)/close.iloc[-1], 0.9)})
    else:
        results.append({"strategy": "MACD", "recommendation": "sell", "confidence": min((signal - macd)/close.iloc[-1], 0.9)})

    # Moving Average Crossover
    rec, conf = compute_sma_cross(close)
    results.append({"strategy": "SMA_Crossover", "recommendation": rec, "confidence": conf})

    # Momentum
    rec, conf = compute_momentum(close)
    results.append({"strategy": "Momentum", "recommendation": rec, "confidence": conf})

    # Pick best
    best = max(results, key=lambda x: x['confidence'])
    print(json.dumps(best))

if __name__ == "__main__":
    main()
