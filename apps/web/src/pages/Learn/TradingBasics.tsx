import React, { useState } from 'react';
import { 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  BarChart2, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowRight 
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  content: string[];
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    tip: string;
  }[];
}

const sections: Section[] = [
  // Lesson 1: What is Trading?
  {
    id: 'introduction',
    title: 'What is Trading?',
    icon: TrendingUp,
    content: [
      'Trading is the act of buying and selling assets (stocks, currencies, crypto, etc.) to make a profit. Unlike long-term investing, trading focuses on capitalizing on short to medium-term market movements.',
      'Key differences between Trading and Investing:',
      '• Trading = Short-term, frequent buying/selling for quick profits',
      '• Investing = Long-term wealth building through asset appreciation',
      'Commonly traded assets include:',
      '• Stocks: Shares of publicly traded companies',
      '• Forex: Global currency exchange',
      '• Crypto: Digital currencies like Bitcoin',
      '• Futures: Contracts for future delivery',
      '• Options: Contracts giving rights to buy/sell'
    ],
    quiz: [
      {
        question: 'What is the main difference between trading and investing?',
        options: [
          'Trading involves only stocks, while investing involves all assets',
          'Trading focuses on short-term profits, while investing aims for long-term growth',
          'Trading is risk-free, while investing is risky',
          'Trading requires more capital than investing'
        ],
        correctAnswer: 1,
        explanation: 'Trading typically involves more frequent transactions and shorter holding periods, focusing on price movements for quick profits. Investing involves buying and holding assets for long-term appreciation.',
        tip: 'Think about the time horizon - trading is about quick moves, investing is about patience.'
      },
      {
        question: 'Which of these is NOT a commonly traded asset?',
        options: [
          'Stocks',
          'Real Estate',
          'Cryptocurrencies',
          'Forex'
        ],
        correctAnswer: 1,
        explanation: 'While real estate can be invested in, it’s not commonly "traded" due to its illiquid nature and long transaction times.',
        tip: 'Consider which assets can be bought and sold quickly.'
      },
      {
        question: 'What characterizes a successful trader?',
        options: [
          'Always making profitable trades',
          'Having a consistent strategy and risk management',
          'Trading every market opportunity',
          'Using maximum leverage'
        ],
        correctAnswer: 1,
        explanation: 'Success in trading comes from having a well-defined strategy and proper risk management, not from trying to win every trade.',
        tip: 'Focus on consistency rather than trying to win every trade.'
      },
      {
        question: 'Why do most new traders fail?',
        options: [
          'Markets are rigged',
          'Lack of capital',
          'Poor emotional control and risk management',
          'Not enough trading indicators'
        ],
        correctAnswer: 2,
        explanation: 'Most traders fail due to poor emotional control and risk management, leading to impulsive decisions and large losses.',
        tip: 'Psychology and discipline are more important than technical knowledge.'
      },
      {
        question: 'What is the primary goal of trading?',
        options: [
          'To become a millionaire overnight',
          'To own parts of companies',
          'To generate consistent profits through market movements',
          'To collect dividends'
        ],
        correctAnswer: 2,
        explanation: 'Trading aims to generate consistent profits by capitalizing on market price movements, whether up or down.',
        tip: 'Think about sustainability rather than get-rich-quick schemes.'
      }
    ]
  },
  // Lesson 2: Types of Markets
  {
    id: 'markets',
    title: 'Types of Markets',
    icon: BarChart2,
    content: [
      'Financial markets are where traders buy and sell different assets. Each market has its own characteristics:',
      'Stock Market:',
      '• Trading company shares',
      '• Major exchanges like NYSE, NASDAQ',
      '• Regular hours: 9:30 AM - 4:00 PM EST',
      '',
      'Forex Market:',
      '• Currency pair trading',
      '• 24/5 market operation',
      '• Highest daily trading volume',
      '',
      'Crypto Market:',
      '• Digital asset trading',
      '• 24/7 operation',
      '• High volatility',
      '',
      'Commodities Market:',
      '• Trading raw materials',
      '• Futures contracts',
      '• Global supply/demand driven'
    ],
    quiz: [
      {
        question: 'Which market operates 24 hours a day, 7 days a week?',
        options: [
          'Stock Market',
          'Forex Market',
          'Crypto Market',
          'Commodities Market'
        ],
        correctAnswer: 2,
        explanation: 'The cryptocurrency market is the only major financial market that operates continuously, 24/7, without closing on weekends or holidays.',
        tip: 'Think about which market never sleeps, even on weekends.'
      },
      {
        question: 'What are the regular trading hours for the US stock market?',
        options: [
          '24 hours a day',
          '9:30 AM - 4:00 PM EST',
          '6:00 AM - 5:00 PM EST',
          '8:00 AM - 8:00 PM EST'
        ],
        correctAnswer: 1,
        explanation: 'The US stock market regular trading session runs from 9:30 AM to 4:00 PM Eastern Time, Monday through Friday.',
        tip: 'Remember that the US stock market has fixed trading hours unlike some other markets.'
      },
      {
        question: 'Which market has the highest daily trading volume?',
        options: [
          'Stock Market',
          'Forex Market',
          'Crypto Market',
          'Commodities Market'
        ],
        correctAnswer: 1,
        explanation: 'The Forex market has the highest daily trading volume, with over $6 trillion traded daily.',
        tip: 'Consider which market is used by everyone from individuals to central banks.'
      },
      {
        question: 'What is a key characteristic of the crypto market?',
        options: [
          'Low volatility',
          'Government regulation',
          'High volatility',
          'Limited trading hours'
        ],
        correctAnswer: 2,
        explanation: 'The crypto market is known for its high volatility, with prices capable of large movements in short periods.',
        tip: 'Think about the price movements you often hear about in crypto news.'
      },
      {
        question: 'Which market is most influenced by interest rates?',
        options: [
          'Crypto Market',
          'Commodities Market',
          'Stock Market',
          'Forex Market'
        ],
        correctAnswer: 3,
        explanation: 'The Forex market is heavily influenced by interest rates as they affect currency values and carry trades.',
        tip: 'Consider which market deals directly with different countries\' currencies.'
      }
    ]
  },
  // Lesson 3: Trading Styles
  {
    id: 'styles',
    title: 'Trading Styles',
    icon: Users,
    content: [
      'Different trading styles suit different personalities and schedules:',
      '',
      'Scalping:',
      '• Very short-term trades (seconds to minutes)',
      '• Requires constant market attention',
      '• Aims for many small profits',
      '• Best for: Quick decision makers',
      '',
      'Day Trading:',
      '• All positions closed by day\'s end',
      '• No overnight exposure',
      '• Requires active daily participation',
      '• Best for: Full-time traders',
      '',
      'Swing Trading:',
      '• Holds positions for days to weeks',
      '• Captures larger market moves',
      '• Part-time friendly',
      '• Best for: Working professionals',
      '',
      'Position Trading:',
      '• Holds trades for weeks to months',
      '• Based on fundamental analysis',
      '• Requires less active management',
      '• Best for: Patient traders'
    ],
    quiz: [
      {
        question: 'Which trading style is most suitable for someone with a full-time job?',
        options: [
          'Scalping',
          'Day Trading',
          'Swing Trading',
          'Position Trading'
        ],
        correctAnswer: 2,
        explanation: 'Swing trading is ideal for working professionals as it doesn’t require constant market monitoring and can be managed around a regular work schedule.',
        tip: 'Consider which style requires the least real-time market attention.'
      },
      {
        question: 'What characterizes scalping as a trading style?',
        options: [
          'Long holding periods',
          'Very short-term trades with small profits',
          'Weekly trades',
          'Fundamental analysis'
        ],
        correctAnswer: 1,
        explanation: 'Scalping involves making many quick trades with small profit targets, often holding positions for just seconds or minutes.',
        tip: 'Think about the shortest possible trading timeframe.'
      },
      {
        question: 'Why is day trading challenging for most people?',
        options: [
          'It requires too much capital',
          'Markets are only open at night',
          'It demands full-time attention during market hours',
          'It’s too simple'
        ],
        correctAnswer: 2,
        explanation: 'Day trading requires constant attention during market hours, making it difficult to maintain other commitments or a regular job.',
        tip: 'Consider the time commitment needed for monitoring trades.'
      },
      {
        question: 'What is a key advantage of position trading?',
        options: [
          'Quick profits',
          'No need for analysis',
          'Less active management required',
          'More exciting'
        ],
        correctAnswer: 2,
        explanation: 'Position trading requires less active management as trades are held for longer periods, making it easier to balance with other activities.',
        tip: 'Think about which style requires the least day-to-day involvement.'
      },
      {
        question: 'Which trading style typically has the highest number of trades per day?',
        options: [
          'Position Trading',
          'Swing Trading',
          'Day Trading',
          'Scalping'
        ],
        correctAnswer: 3,
        explanation: 'Scalping involves making many small trades throughout the day, often dozens or even hundreds of trades.',
        tip: 'Consider which style aims for the smallest profit per trade.'
      }
    ]
  },
  // Lesson 4: Risk Management
  {
    id: 'risk',
    title: 'Risk Management',
    icon: Shield,
    content: [
      'Risk management is the foundation of successful trading. Key principles include:',
      '',
      'Position Sizing:',
      '• Never risk more than 1-2% per trade',
      '• Calculate position size based on stop loss',
      '• Adjust size for market volatility',
      '',
      'Stop Loss Strategy:',
      '• Always use stop losses',
      '• Place stops at logical levels',
      '• Never move stops to take larger losses',
      '',
      'Risk-Reward Ratio:',
      '• Aim for minimum 1:2 risk-reward',
      '• Higher ratio needed for lower win rate',
      '• Consider probability of success',
      '',
      'Common Pitfalls to Avoid:',
      '• Overtrading',
      '• Revenge trading after losses',
      '• Averaging down on losing positions',
      '• Trading without a plan',
      '• Ignoring market conditions'
    ],
    quiz: [
      {
        question: 'What is a recommended maximum risk per trade?',
        options: [
          '10% of account',
          '5% of account',
          '1-2% of account',
          '25% of account'
        ],
        correctAnswer: 2,
        explanation: 'Professional traders typically risk no more than 1-2% of their account per trade to ensure sustainability and survive drawdown periods.',
        tip: 'Think about long-term survival rather than maximum gains.'
      },
      {
        question: 'What is a good risk-reward ratio?',
        options: [
          '1:1',
          'At least 1:2',
          '1:0.5',
          'It doesn’t matter'
        ],
        correctAnswer: 1,
        explanation: 'A minimum risk-reward ratio of 1:2 means you’re targeting at least twice as much profit as your risk, improving long-term profitability.',
        tip: 'Consider how much profit you need to offset potential losses.'
      },
      {
        question: 'Why are stop losses important?',
        options: [
          'They guarantee profits',
          'They prevent emotional decisions',
          'They increase leverage',
          'They improve entry points'
        ],
        correctAnswer: 1,
        explanation: 'Stop losses help prevent emotional decisions by automatically limiting losses and protecting trading capital.',
        tip: 'Think about protecting yourself from your own emotions.'
      },
      {
        question: 'What is position sizing?',
        options: [
          'Using maximum leverage',
          'Trading the largest stocks',
          'Calculating appropriate trade size based on risk',
          'Always using the same trade size'
        ],
        correctAnswer: 2,
        explanation: 'Position sizing involves calculating the appropriate amount to trade based on your account size and risk tolerance.',
        tip: 'Consider how to protect your capital while still making meaningful trades.'
      },
      {
        question: 'What is the biggest risk management mistake?',
        options: [
          'Using stop losses',
          'Trading small positions',
          'Not having a plan',
          'Taking profits quickly'
        ],
        correctAnswer: 2,
        explanation: 'Trading without a clear plan and risk management strategy is the fastest way to lose money in the markets.',
        tip: 'Think about the importance of preparation and structure.'
      }
    ]
  },
  // Lesson 5: Trading Psychology
  {
    id: 'psychology',
    title: 'Trading Psychology',
    icon: Clock,
    content: [
      'Trading success is 80% psychology and 20% strategy. Key psychological aspects:',
      '',
      'Emotional Control:',
      '• Fear and greed management',
      '• Staying objective',
      '• Accepting losses as part of trading',
      '',
      'Common Psychological Challenges:',
      '• FOMO (Fear of Missing Out)',
      '• Revenge trading',
      '• Analysis paralysis',
      '• Overconfidence after wins',
      '• Loss aversion',
      '',
      'Developing Mental Discipline:',
      '• Follow your trading plan',
      '• Keep a trading journal',
      '• Review trades objectively',
      '• Take regular breaks',
      '• Focus on process over profits'
    ],
    quiz: [
      {
        question: 'What is revenge trading?',
        options: [
          'Trading with a clear strategy',
          'Taking larger positions to recover losses',
          'Following market trends',
          'Using stop losses properly'
        ],
        correctAnswer: 1,
        explanation: 'Revenge trading occurs when a trader tries to recover losses by taking larger or riskier trades, often leading to even bigger losses.',
        tip: 'Think about emotional versus rational decision-making.'
      },
      {
        question: 'Why is FOMO dangerous in trading?',
        options: [
          'It leads to missed opportunities',
          'It causes impulsive trades',
          'It improves decision making',
          'It reduces risk'
        ],
        correctAnswer: 1,
        explanation: 'FOMO (Fear of Missing Out) often leads to impulsive trades without proper analysis or risk management.',
        tip: 'Consider how emotions can override rational thinking.'
      },
      {
        question: 'What is the best way to handle losses?',
        options: [
          'Ignore them',
          'Double down to recover',
          'Accept them as part of trading',
          'Quit trading'
        ],
        correctAnswer: 2,
        explanation: 'Accepting losses as a normal part of trading is crucial for long-term success and emotional stability.',
        tip: 'Think about losses as a cost of doing business.'
      },
      {
        question: 'Why is overconfidence dangerous?',
        options: [
          'It improves performance',
          'It leads to excessive risk-taking',
          'It helps decision making',
          'It reduces stress'
        ],
        correctAnswer: 1,
        explanation: 'Overconfidence, especially after winning trades, can lead to excessive risk-taking and poor decision making.',
        tip: 'Consider how success can sometimes lead to failure.'
      },
      {
        question: 'What is the purpose of a trading journal?',
        options: [
          'To track profits only',
          'To analyze and improve performance',
          'To show others',
          'To waste time'
        ],
        correctAnswer: 1,
        explanation: 'A trading journal helps analyze performance, identify patterns, and improve trading decisions through objective review.',
        tip: 'Think about the importance of learning from experience.'
      }
    ]
  },
  // Lesson 6: Technical Analysis
  {
    id: 'technical-analysis',
    title: 'Technical Analysis',
    icon: DollarSign,
    content: [
      'Technical Analysis involves analyzing historical price data and trading volume to forecast future price movements.',
      'Key tools include charts, trend lines, support and resistance levels, and various technical indicators.',
      'Chart patterns, such as head and shoulders, triangles, and double tops/bottoms, are used to identify potential trend reversals.',
      'This approach is widely used by short-term traders to time their market entry and exit points.'
    ],
    quiz: [
      {
        question: 'What does technical analysis primarily focus on?',
        options: [
          'Fundamental data',
          'Historical price and volume data',
          'Economic news',
          'Trading psychology'
        ],
        correctAnswer: 1,
        explanation: 'Technical analysis centers on historical price movements and volume data rather than fundamentals or news events.',
        tip: 'Focus on the patterns that emerge in the price data.'
      },
      {
        question: 'Which of the following is a common chart pattern?',
        options: [
          'Cup and Handle',
          'Inflation rate',
          'Balance sheet',
          'Earnings report'
        ],
        correctAnswer: 0,
        explanation: 'The Cup and Handle is a well-known chart pattern used to indicate potential bullish continuations.',
        tip: 'Chart patterns are visual formations on a price chart.'
      },
      {
        question: 'What is a support level?',
        options: [
          'A price level where a downtrend is expected to pause',
          'A resistance level',
          'The average price',
          'A type of technical indicator'
        ],
        correctAnswer: 0,
        explanation: 'A support level is a price point where demand is strong enough to halt a decline in price.',
        tip: 'Think of support as a floor that stops prices from falling further.'
      },
      {
        question: 'Which indicator is commonly used to measure momentum?',
        options: [
          'MACD',
          'Volume',
          'Bollinger Bands',
          'Moving Average'
        ],
        correctAnswer: 0,
        explanation: 'The MACD (Moving Average Convergence Divergence) is a popular momentum indicator in technical analysis.',
        tip: 'Momentum indicators help gauge the strength of a trend.'
      },
      {
        question: 'What is the main purpose of technical analysis?',
        options: [
          'Predicting long-term market trends',
          'Timing market entry and exit points',
          'Determining company value',
          'Evaluating management quality'
        ],
        correctAnswer: 1,
        explanation: 'Technical analysis is primarily used to identify optimal entry and exit points based on historical market data.',
        tip: 'It is more about timing than evaluating the underlying asset’s worth.'
      }
    ]
  },
  // Lesson 7: Fundamental Analysis
  {
    id: 'fundamental-analysis',
    title: 'Fundamental Analysis',
    icon: AlertTriangle,
    content: [
      'Fundamental Analysis evaluates the intrinsic value of an asset by examining economic indicators, financial statements, and industry conditions.',
      'It involves analyzing company earnings, growth potential, management quality, and overall market conditions.',
      'Investors use fundamental analysis to determine whether an asset is overvalued or undervalued.',
      'This approach is typically favored by long-term investors over short-term traders.'
    ],
    quiz: [
      {
        question: 'What does fundamental analysis focus on?',
        options: [
          'Price charts',
          'Financial statements',
          'Technical indicators',
          'Market sentiment'
        ],
        correctAnswer: 1,
        explanation: 'Fundamental analysis relies on financial statements and economic data rather than just price movements.',
        tip: 'Consider the underlying financial health of the asset.'
      },
      {
        question: 'Which of these is NOT typically analyzed in fundamental analysis?',
        options: [
          'Earnings reports',
          'Industry trends',
          'Historical price data',
          'Management quality'
        ],
        correctAnswer: 2,
        explanation: 'While historical price data is used in technical analysis, fundamental analysis focuses on economic and company-specific factors.',
        tip: 'Focus on what makes a company or asset valuable.'
      },
      {
        question: 'Fundamental analysis helps determine if an asset is:',
        options: [
          'Overvalued or undervalued',
          'Trending',
          'Volatile',
          'Highly liquid'
        ],
        correctAnswer: 0,
        explanation: 'By evaluating intrinsic value, fundamental analysis can indicate whether an asset is mispriced.',
        tip: 'Think about comparing the market price to the asset’s true value.'
      },
      {
        question: 'Which type of investor is more likely to use fundamental analysis?',
        options: [
          'Day traders',
          'Swing traders',
          'Long-term investors',
          'Scalpers'
        ],
        correctAnswer: 2,
        explanation: 'Long-term investors typically use fundamental analysis to assess the long-term potential of an asset.',
        tip: 'This approach is less about quick trades and more about long-term value.'
      },
      {
        question: 'What is one of the main sources of information for fundamental analysis?',
        options: [
          'Chart patterns',
          'Company balance sheets',
          'Candlestick charts',
          'Support and resistance levels'
        ],
        correctAnswer: 1,
        explanation: 'Company balance sheets and other financial documents are primary sources in fundamental analysis.',
        tip: 'Look for detailed financial data when assessing an asset.'
      }
    ]
  },
  // Lesson 8: Chart Patterns
  {
    id: 'chart-patterns',
    title: 'Chart Patterns',
    icon: BookOpen,
    content: [
      'Chart Patterns are formations on price charts that help traders predict future market movements.',
      'Common patterns include head and shoulders, double tops and bottoms, triangles, and flags.',
      'Recognizing these patterns can signal potential reversals or trend continuations.',
      'Effective use of chart patterns requires practice and confirmation with other technical tools.'
    ],
    quiz: [
      {
        question: 'Which pattern is considered a reversal pattern?',
        options: [
          'Head and Shoulders',
          'Triangle',
          'Flag',
          'Rectangle'
        ],
        correctAnswer: 0,
        explanation: 'The head and shoulders pattern is widely recognized as a reversal signal in technical analysis.',
        tip: 'Pay attention to the formation of the pattern on the chart.'
      },
      {
        question: 'What does a double top pattern indicate?',
        options: [
          'A potential upward reversal',
          'A potential downward reversal',
          'Market consolidation',
          'No significant trend change'
        ],
        correctAnswer: 1,
        explanation: 'A double top pattern suggests that the price may have hit a resistance level twice and could reverse downward.',
        tip: 'Consider this pattern as a warning sign for a trend change.'
      },
      {
        question: 'Chart patterns are best used in conjunction with:',
        options: [
          'Fundamental analysis',
          'Other technical indicators',
          'Economic forecasts',
          'Trading psychology'
        ],
        correctAnswer: 1,
        explanation: 'Using chart patterns with other technical tools increases their reliability.',
        tip: 'Confirmation is key when interpreting chart patterns.'
      },
      {
        question: 'What is the significance of a breakout from a chart pattern?',
        options: [
          'It confirms the pattern',
          'It invalidates the pattern',
          'It signals market uncertainty',
          'It has no significance'
        ],
        correctAnswer: 0,
        explanation: 'A breakout from a pattern generally confirms the pattern and indicates the direction of the next move.',
        tip: 'Look for increased volume on breakouts for confirmation.'
      },
      {
        question: 'Which chart pattern is typically associated with continuation of a trend?',
        options: [
          'Flag',
          'Head and Shoulders',
          'Double Top',
          'Reversal'
        ],
        correctAnswer: 0,
        explanation: 'Flags are generally seen as continuation patterns, signaling that the trend will likely persist.',
        tip: 'Consider flags as short pauses in a longer trend.'
      }
    ]
  },
  // Lesson 9: Indicators & Oscillators
  {
    id: 'indicators-oscillators',
    title: 'Indicators & Oscillators',
    icon: TrendingUp,
    content: [
      'Indicators and oscillators are technical tools that help analyze price trends, momentum, and volatility.',
      'Common indicators include Moving Averages, RSI, MACD, and Bollinger Bands.',
      'Oscillators, such as the Stochastic Oscillator, help identify overbought and oversold conditions.',
      'These tools assist traders in making informed entry and exit decisions.'
    ],
    quiz: [
      {
        question: 'Which indicator is used to measure the average price over a period?',
        options: [
          'Moving Average',
          'RSI',
          'MACD',
          'Bollinger Bands'
        ],
        correctAnswer: 0,
        explanation: 'The Moving Average smooths out price data to identify the trend direction over time.',
        tip: 'This indicator helps reduce noise from random price fluctuations.'
      },
      {
        question: 'What does RSI stand for?',
        options: [
          'Relative Strength Index',
          'Rate of Stock Increase',
          'Rapid Signal Indicator',
          'Random Stock Index'
        ],
        correctAnswer: 0,
        explanation: 'RSI stands for Relative Strength Index, a momentum oscillator that measures the speed and change of price movements.',
        tip: 'RSI values can help indicate overbought or oversold conditions.'
      },
      {
        question: 'Bollinger Bands are used to measure:',
        options: [
          'Volume',
          'Volatility',
          'Market sentiment',
          'Trend direction'
        ],
        correctAnswer: 1,
        explanation: 'Bollinger Bands adjust based on market volatility, expanding when volatility increases and contracting during calmer periods.',
        tip: 'Watch for band squeezes which may indicate upcoming volatility.'
      },
      {
        question: 'Which oscillator helps identify overbought and oversold conditions?',
        options: [
          'Stochastic Oscillator',
          'Moving Average',
          'MACD',
          'Bollinger Bands'
        ],
        correctAnswer: 0,
        explanation: 'The Stochastic Oscillator compares a security’s closing price to its price range over a set period, helping to spot potential reversals.',
        tip: 'Overbought or oversold readings can be useful for timing entries and exits.'
      },
      {
        question: 'Indicators should be used in:',
        options: [
          'Isolation',
          'Combination with other tools',
          'Complete reliance',
          'Fundamental analysis only'
        ],
        correctAnswer: 1,
        explanation: 'Indicators work best when combined with other technical tools and analysis techniques.',
        tip: 'Multiple indicators can provide confirmation for trading decisions.'
      }
    ]
  },
  // Lesson 10: Developing a Trading Plan
  {
    id: 'trading-plan',
    title: 'Developing a Trading Plan',
    icon: Users,
    content: [
      'A Trading Plan is a comprehensive strategy that outlines your trading goals, risk management, and methodologies.',
      'It should include detailed entry and exit strategies, risk tolerance guidelines, and performance evaluation metrics.',
      'A well-developed plan helps maintain discipline and reduces the impact of emotional decisions.',
      'It is important to review and update your trading plan regularly based on your performance and changing market conditions.'
    ],
    quiz: [
      {
        question: 'What is the primary purpose of a trading plan?',
        options: [
          'To guarantee profits',
          'To outline strategies and risk management',
          'To follow market trends blindly',
          'To record past trades only'
        ],
        correctAnswer: 1,
        explanation: 'A trading plan serves as a roadmap for entering and exiting trades while managing risk effectively.',
        tip: 'A good plan minimizes impulsive decisions.'
      },
      {
        question: 'A trading plan should include:',
        options: [
          'Only entry strategies',
          'Only exit strategies',
          'Both entry and exit strategies',
          'Neither entry nor exit strategies'
        ],
        correctAnswer: 2,
        explanation: 'It is essential to plan both how you will enter and exit trades to manage risk and maximize potential profits.',
        tip: 'Think of your plan as a complete strategy, not just a checklist.'
      },
      {
        question: 'Regular review of your trading plan is important because:',
        options: [
          'Markets are static',
          'Market conditions change',
          'It is a one-time setup',
          'It guarantees success'
        ],
        correctAnswer: 1,
        explanation: 'Markets evolve over time, so your trading plan should be adaptable to new conditions.',
        tip: 'Keep your plan dynamic and responsive to market changes.'
      },
      {
        question: 'Risk management in a trading plan helps to:',
        options: [
          'Increase leverage',
          'Limit losses',
          'Ignore market volatility',
          'Predict market movements'
        ],
        correctAnswer: 1,
        explanation: 'Proper risk management is key to protecting your capital and ensuring long-term success in trading.',
        tip: 'Always know how much you are willing to risk on each trade.'
      },
      {
        question: 'A trading plan should be:',
        options: [
          'Rigid and unchangeable',
          'Flexible and adaptable',
          'Based solely on intuition',
          'Ignored once written'
        ],
        correctAnswer: 1,
        explanation: 'While discipline is important, a trading plan should be flexible enough to evolve as market conditions and personal strategies change.',
        tip: 'Review and adjust your plan periodically.'
      }
    ]
  },
  // Lesson 11: Backtesting and Simulation
  {
    id: 'backtesting',
    title: 'Backtesting and Simulation',
    icon: BarChart2,
    content: [
      'Backtesting involves testing a trading strategy on historical data to evaluate its performance.',
      'Simulation allows traders to practice strategies in a risk-free environment using virtual funds.',
      'Both processes are critical for validating and refining your trading plan before using real money.',
      'They help identify potential pitfalls and build confidence in your strategy over time.'
    ],
    quiz: [
      {
        question: 'What is backtesting?',
        options: [
          'Testing a strategy on historical data',
          'Trading in real-time',
          'Predicting future trends',
          'Analyzing market sentiment'
        ],
        correctAnswer: 0,
        explanation: 'Backtesting uses historical data to simulate how a trading strategy would have performed in the past.',
        tip: 'It helps refine your strategy before applying it live.'
      },
      {
        question: 'Simulation in trading helps by:',
        options: [
          'Guaranteeing profits',
          'Allowing practice without real financial risk',
          'Increasing trade frequency',
          'Eliminating all risk'
        ],
        correctAnswer: 1,
        explanation: 'Simulation lets traders test strategies and gain experience without risking actual money.',
        tip: 'It is a great way to learn and improve your trading skills safely.'
      },
      {
        question: 'Backtesting is important because it:',
        options: [
          'Validates a trading strategy',
          'Replaces the need for live trading',
          'Is a form of fundamental analysis',
          'Creates market trends'
        ],
        correctAnswer: 0,
        explanation: 'By testing a strategy on past data, you can assess its viability and make adjustments as needed.',
        tip: 'Always test your strategy before using it in live markets.'
      },
      {
        question: 'Which of the following is a benefit of simulation?',
        options: [
          'Instant profits',
          'Risk-free practice',
          'Avoiding market research',
          'Eliminating the need for planning'
        ],
        correctAnswer: 1,
        explanation: 'Simulation provides a safe environment to practice and refine strategies without financial risk.',
        tip: 'Use simulation to build experience and confidence.'
      },
      {
        question: 'Both backtesting and simulation are used to:',
        options: [
          'Refine trading strategies',
          'Ensure market accuracy',
          'Replace technical analysis',
          'Predict economic cycles'
        ],
        correctAnswer: 0,
        explanation: 'They are both tools to help you improve and validate your trading methods before committing real funds.',
        tip: 'These methods are crucial steps in developing a robust trading strategy.'
      }
    ]
  },
  // Lesson 12: Advanced Trading Strategies
  {
    id: 'advanced-strategies',
    title: 'Advanced Trading Strategies',
    icon: Shield,
    content: [
      'Advanced Trading Strategies involve complex techniques and methods used by experienced traders.',
      'They may include algorithmic trading, high-frequency trading, and sophisticated options strategies.',
      'Such strategies require a deeper market understanding and more robust risk management.',
      'They are not recommended for beginners due to the higher complexity and associated risks.'
    ],
    quiz: [
      {
        question: 'Which of these is considered an advanced trading strategy?',
        options: [
          'Day Trading',
          'High-frequency trading',
          'Swing Trading',
          'Scalping'
        ],
        correctAnswer: 1,
        explanation: 'High-frequency trading uses complex algorithms and high-speed data to execute a large number of orders in fractions of a second.',
        tip: 'Advanced strategies often rely on technology and specialized knowledge.'
      },
      {
        question: 'Advanced strategies typically require:',
        options: [
          'Less research',
          'More market understanding',
          'Lower risk management',
          'Ignoring market trends'
        ],
        correctAnswer: 1,
        explanation: 'They require a deeper understanding of market dynamics and a robust approach to risk management.',
        tip: 'Experience and continuous learning are key for advanced strategies.'
      },
      {
        question: 'Algorithmic trading involves:',
        options: [
          'Manual trade execution',
          'Using computer algorithms to trade',
          'Trading based on intuition',
          'Ignoring market data'
        ],
        correctAnswer: 1,
        explanation: 'Algorithmic trading automates the trade process using pre-programmed instructions based on market data.',
        tip: 'It reduces the need for manual intervention in trade execution.'
      },
      {
        question: 'Options strategies are considered advanced because:',
        options: [
          'They are simple',
          'They involve multiple variables and risks',
          'They guarantee returns',
          'They do not require analysis'
        ],
        correctAnswer: 1,
        explanation: 'Options involve various factors like volatility, time decay, and complex risk profiles that require careful analysis.',
        tip: 'Understanding options requires a higher level of trading knowledge.'
      },
      {
        question: 'Advanced trading strategies are best suited for:',
        options: [
          'Beginners',
          'Inexperienced traders',
          'Experienced traders',
          'Casual investors'
        ],
        correctAnswer: 2,
        explanation: 'These strategies are typically used by experienced traders who can handle their complexity and associated risks.',
        tip: 'It is important to master the basics before moving to advanced strategies.'
      }
    ]
  }
];

export default function TradingBasics() {
  const [selectedSection, setSelectedSection] = useState<string>('introduction');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const currentSection = sections.find(section => section.id === selectedSection);
  const currentQuestion = currentSection?.quiz[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    setUserAnswer(answerIndex);
    setShowExplanation(true);
    
    if (answerIndex === currentQuestion?.correctAnswer) {
      if (currentQuestionIndex === currentSection!.quiz.length - 1) {
        setCompletedSections(prev => new Set([...prev, selectedSection]));
      }
    } else {
      setShowTip(true);
    }
  };

  const handleNextQuestion = () => {
    if (userAnswer === currentQuestion?.correctAnswer) {
      if (currentQuestionIndex < currentSection!.quiz.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer(null);
        setShowExplanation(false);
        setShowTip(false);
      }
    }
  };

  const handleSectionChange = (id: string) => {
    setSelectedSection(id);
    setCurrentQuestionIndex(0);
    setUserAnswer(null);
    setShowExplanation(false);
    setShowTip(false);
  };

  const handleNextLesson = () => {
    const currentIndex = sections.findIndex(sec => sec.id === selectedSection);
    if (currentIndex !== -1 && currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1];
      setSelectedSection(nextSection.id);
      setCurrentQuestionIndex(0);
      setUserAnswer(null);
      setShowExplanation(false);
      setShowTip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="text-brand-primary" size={32} />
          <div>
            <h1 className="text-3xl font-bold">Trading Basics</h1>
            <p className="text-gray-500 dark:text-gray-400">Master the fundamentals of trading</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isCompleted = completedSections.has(section.id);
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                    selectedSection === section.id
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-lg shadow-brand-primary/10'
                      : 'bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:border-brand-primary/50'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium flex-1 text-left">{section.title}</span>
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            {currentSection && (
              <div className="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-brand-primary/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <currentSection.icon size={24} className="text-brand-primary" />
                  <h2 className="text-2xl font-bold">{currentSection.title}</h2>
                </div>

                <div className="space-y-4 mb-8">
                  {currentSection.content.map((paragraph, index) => (
                    <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="mb-8">
                  <a 
                    href="/learn" 
                    className="px-4 py-2 bg-brand-primary text-white rounded transition-colors duration-200 hover:bg-brand-primary/80"
                  >
                    Back to BullCircle University
                  </a>
                </div>

                {currentQuestion && (
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-brand-primary/20">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Shield size={24} className="text-brand-primary" />
                        Knowledge Check
                      </h3>
                      <span className="text-gray-500 dark:text-gray-400">
                        Question {currentQuestionIndex + 1} of {currentSection.quiz.length}
                      </span>
                    </div>

                    <div className="space-y-6">
                      <p className="font-medium text-lg">{currentQuestion.question}</p>
                      
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            disabled={userAnswer !== null}
                            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                              userAnswer === index
                                ? index === currentQuestion.correctAnswer
                                  ? 'bg-green-500/20 border-green-500 text-green-500'
                                  : 'bg-red-500/20 border-red-500 text-red-500'
                                : 'bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700/50 hover:border-brand-primary/50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>

                      {showExplanation && (
                        <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-brand-primary/20">
                          <p className="text-gray-700 dark:text-gray-300">{currentQuestion.explanation}</p>
                        </div>
                      )}

                      {showTip && (
                        <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                          <p className="text-yellow-600 dark:text-yellow-400">
                            <span className="font-medium">Tip: </span>
                            {currentQuestion.tip}
                          </p>
                        </div>
                      )}

                      {userAnswer === currentQuestion.correctAnswer && currentQuestionIndex < currentSection.quiz.length - 1 && (
                        <button
                          onClick={handleNextQuestion}
                          className="mt-4 px-6 py-3 rounded-lg bg-brand-primary text-black font-semibold flex items-center gap-2 hover:bg-brand-primary/90 transition-colors"
                        >
                          Next Question
                          <ArrowRight size={18} />
                        </button>
                      )}

                      {userAnswer === currentQuestion.correctAnswer && currentQuestionIndex === currentSection.quiz.length - 1 && (
                        <div className="mt-6 p-4 rounded-lg bg-green-500/20 border border-green-500 text-green-500">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-1" size={20} />
                            <div>
                              <p className="font-medium">Congratulations!</p>
                              <p className="text-sm">You've completed this section.</p>
                            </div>
                          </div>
                          <button
                            onClick={handleNextLesson}
                            className="mt-4 px-6 py-3 rounded-lg bg-brand-primary text-black font-semibold flex items-center gap-2 hover:bg-brand-primary/90 transition-colors"
                          >
                            Next Lesson
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
