import React, { useState } from 'react';
import { 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart2, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  ArrowRight, 
  LineChart, 
  Gauge, 
  Target, 
  CandlestickChart as Candlestick 
} from 'lucide-react';
import TradingChart from '../../components/TradingChart';

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
  {
    id: 'introduction',
    title: 'What is Technical Analysis?',
    icon: BookOpen,
    content: [
      'Technical Analysis (TA) is a method of evaluating securities by analyzing statistics generated by market activity, such as past prices and volume.',
      '',
      'Core Principles:',
      '• Price reflects everything - All known information is already priced in',
      '• Prices move in trends - Once established, trends are more likely to continue than reverse',
      '• History tends to repeat - Market patterns tend to recur due to market psychology',
      '',
      'Key Differences from Fundamental Analysis:',
      '• Technical Analysis focuses on price action and charts',
      '• Fundamental Analysis examines business metrics and economic factors',
      '• TA is typically used for shorter-term trading',
      '• FA is often used for longer-term investing',
      '',
      'Why Technical Analysis Matters:',
      '• Helps identify entry and exit points',
      '• Provides objective trading signals',
      '• Useful for risk management',
      '• Works across different markets and timeframes'
    ],
    quiz: [
      {
        question: 'What is the main principle of Technical Analysis?',
        options: [
          'Company fundamentals determine price',
          'Price reflects all known information',
          'Economic data drives markets',
          'News events control price'
        ],
        correctAnswer: 1,
        explanation: 'Technical Analysis is based on the principle that all known information is already reflected in the price, making price action the primary focus of analysis.',
        tip: 'Think about how price incorporates all market participants’ knowledge and decisions.'
      },
      {
        question: 'How does Technical Analysis differ from Fundamental Analysis?',
        options: [
          'TA only works in bull markets',
          'TA focuses on price and volume data',
          'TA requires more capital',
          'TA is only for long-term investing'
        ],
        correctAnswer: 1,
        explanation: 'Technical Analysis focuses on analyzing price movements and volume data through charts, while Fundamental Analysis examines business and economic factors.',
        tip: 'Remember that TA is about "what" is happening, while FA is about "why" it’s happening.'
      },
      {
        question: 'Which of the following is NOT a focus of Technical Analysis?',
        options: [
          'Chart patterns',
          'Price and volume data',
          'Company management quality',
          'Trendlines'
        ],
        correctAnswer: 2,
        explanation: 'Technical Analysis centers on charts and price data rather than qualitative factors like management quality.',
        tip: 'Management quality is a fundamental factor, not a technical one.'
      },
      {
        question: 'Technical Analysis is best suited for which type of trading?',
        options: [
          'Long-term investing',
          'Short-term trading',
          'Real estate trading',
          'Fixed income investments'
        ],
        correctAnswer: 1,
        explanation: 'TA is typically used by traders focusing on shorter timeframes rather than long-term investors.',
        tip: 'It helps identify entry and exit points over days or weeks.'
      },
      {
        question: 'What tool is most commonly used in Technical Analysis?',
        options: [
          'Price chart',
          'Income statement',
          'Balance sheet',
          'Cash flow statement'
        ],
        correctAnswer: 0,
        explanation: 'Price charts are one of the primary tools for Technical Analysis, displaying historical price movements and trends.',
        tip: 'Charts reveal patterns that help in making trading decisions.'
      }
    ]
  },
  {
    id: 'volume-momentum',
    title: 'Volume & Momentum',
    icon: TrendingUp,
    content: [
      'Volume and momentum are crucial indicators that help confirm price movements and identify potential reversals.',
      '',
      'Volume Analysis:',
      '• Higher volume validates price moves',
      '• Volume spikes can signal exhaustion or strong trend confirmation',
      '• Low volume during price moves suggests weak conviction',
      '',
      'Common Volume Patterns:',
      '• Rising prices + rising volume = Strong uptrend',
      '• Rising prices + falling volume = Potential reversal',
      '• Falling prices + rising volume = Strong downtrend',
      '• Falling prices + falling volume = Potential reversal',
      '',
      'Momentum Indicators:',
      '',
      '1. Relative Strength Index (RSI):',
      '• Measures speed and magnitude of price changes',
      '• Ranges from 0 to 100',
      '• Above 70 = Overbought',
      '• Below 30 = Oversold',
      '',
      '2. MACD (Moving Average Convergence Divergence):',
      '• Shows relationship between two moving averages',
      '• Signal line crossovers generate trading signals',
      '• Histogram shows momentum strength',
      '',
      '3. Stochastic Oscillator:',
      '• Compares closing price to price range',
      '• Also uses overbought/oversold levels',
      '• Fast and slow versions available'
    ],
    quiz: [
      {
        question: 'What does increasing volume with rising prices typically indicate?',
        options: [
          'Market weakness',
          'Strong uptrend',
          'Potential reversal',
          'No significance'
        ],
        correctAnswer: 1,
        explanation: 'Rising prices accompanied by increasing volume typically indicates a strong uptrend, as it shows growing participation and conviction in the move.',
        tip: 'Think about how more buyers entering the market affects both price and volume.'
      },
      {
        question: 'When is an RSI reading considered overbought?',
        options: [
          'Below 30',
          'Above 70',
          'At 50',
          'Below 20'
        ],
        correctAnswer: 1,
        explanation: 'An RSI reading above 70 is traditionally considered overbought, suggesting that the price may be due for a pullback.',
        tip: 'Remember that overbought doesn’t always mean immediate reversal.'
      },
      {
        question: 'A decrease in volume during an uptrend may indicate:',
        options: [
          'Sustained momentum',
          'Weakening trend',
          'Overbought conditions',
          'Stable market conditions'
        ],
        correctAnswer: 1,
        explanation: 'Lower volume during an uptrend can signal that the buying interest is diminishing, potentially weakening the trend.',
        tip: 'Volume is a key factor in confirming trends.'
      },
      {
        question: 'Which of the following is a momentum indicator?',
        options: [
          'RSI',
          'Support levels',
          'Moving averages',
          'Trendlines'
        ],
        correctAnswer: 0,
        explanation: 'RSI is a popular momentum oscillator that measures the speed and change of price movements.',
        tip: 'It helps identify overbought and oversold conditions.'
      },
      {
        question: 'If prices are rising but volume is decreasing, this could be a sign of:',
        options: [
          'A strong bull market',
          'A potential reversal',
          'Market equilibrium',
          'Stable market conditions'
        ],
        correctAnswer: 1,
        explanation: 'Declining volume during a price rise may indicate that the upward move lacks strong participation and could reverse.',
        tip: 'Confirm trends with volume for more reliable signals.'
      }
    ]
  },
  {
    id: 'moving-averages',
    title: 'Moving Averages',
    icon: TrendingUp,
    content: [
      'Moving averages are one of the most versatile and widely used technical indicators.',
      '',
      'Types of Moving Averages:',
      '',
      '1. Simple Moving Average (SMA):',
      '• Equal weight to all prices',
      '• Smoother, slower to react',
      '• Good for identifying trends',
      '',
      '2. Exponential Moving Average (EMA):',
      '• More weight to recent prices',
      '• Faster to react to price changes',
      '• Better for shorter timeframes',
      '',
      'Common Moving Average Strategies:',
      '',
      '1. Golden Cross / Death Cross:',
      '• Golden Cross: 50 MA crosses above 200 MA (bullish)',
      '• Death Cross: 50 MA crosses below 200 MA (bearish)',
      '• Major trend change signals',
      '',
      '2. Dynamic Support/Resistance:',
      '• Price tends to bounce off moving averages',
      '• Multiple MA levels create zones',
      '• Common MAs: 20, 50, 100, 200',
      '',
      '3. Moving Average Ribbons:',
      '• Multiple MAs plotted together',
      '• Shows trend strength and potential reversals',
      '• Spacing between MAs indicates momentum'
    ],
    quiz: [
      {
        question: 'What is the main difference between SMA and EMA?',
        options: [
          'SMA is more accurate',
          'EMA gives more weight to recent prices',
          'SMA is only for daily charts',
          'EMA requires more data'
        ],
        correctAnswer: 1,
        explanation: 'The Exponential Moving Average (EMA) gives more weight to recent prices, making it more responsive to current price changes compared to the Simple Moving Average (SMA).',
        tip: 'EMA reacts faster than SMA.'
      },
      {
        question: 'What is a Golden Cross?',
        options: [
          '20 MA crossing 50 MA',
          '50 MA crossing above 200 MA',
          'Any bullish candlestick pattern',
          'Price crossing above a moving average'
        ],
        correctAnswer: 1,
        explanation: 'A Golden Cross occurs when the 50-period moving average crosses above the 200-period moving average, signaling a potential major bullish trend change.',
        tip: 'It is considered a longer-term signal.'
      },
      {
        question: 'Moving averages are primarily used to:',
        options: [
          'Predict short-term price movements',
          'Smooth out price data and filter noise',
          'Measure trading volume',
          'Determine a company’s fundamental value'
        ],
        correctAnswer: 1,
        explanation: 'Moving averages help smooth out price data to reveal the underlying trend by filtering out short-term fluctuations.',
        tip: 'They provide a clearer picture of trend direction.'
      },
      {
        question: 'Which moving average is typically more reactive to recent price changes?',
        options: [
          'Simple Moving Average (SMA)',
          'Exponential Moving Average (EMA)',
          'Both are equally reactive',
          'Neither; they are both lagging indicators'
        ],
        correctAnswer: 1,
        explanation: 'The EMA is more reactive because it places more weight on recent prices.',
        tip: 'EMA is preferred for quicker signal generation.'
      },
      {
        question: 'A Death Cross is considered a bearish signal when:',
        options: [
          'Short-term MA crosses above long-term MA',
          'Short-term MA crosses below long-term MA',
          'Volume increases dramatically',
          'Price reaches a moving average'
        ],
        correctAnswer: 1,
        explanation: 'A Death Cross occurs when a shorter-term moving average crosses below a longer-term moving average, indicating a potential downtrend.',
        tip: 'It is the opposite of a Golden Cross.'
      }
    ]
  },
  {
    id: 'chart-patterns',
    title: 'Chart Patterns',
    icon: BarChart2,
    content: [
      'Chart patterns are visual formations that can help predict future price movements.',
      '',
      'Reversal Patterns:',
      '',
      '1. Double Top/Bottom:',
      '• Price tests a level twice and then reverses',
      '• Indicates potential trend exhaustion',
      '',
      '2. Head and Shoulders:',
      '• Consists of three peaks with the middle (head) being the highest',
      '• Often signals a trend reversal',
      '',
      'Continuation Patterns:',
      '',
      '1. Triangles:',
      '• Represent convergence in price action',
      '• Can break out in either direction',
      '',
      '2. Flags and Pennants:',
      '• Indicate a brief pause before continuation of the trend',
      '',
      'Pattern Trading Tips:',
      '• Wait for pattern completion',
      '• Confirm signals with volume',
      '• Use stop losses to manage risk',
      '• Consider multiple timeframes for confirmation'
    ],
    quiz: [
      {
        question: 'What type of pattern is a Head and Shoulders?',
        options: [
          'Continuation pattern',
          'Reversal pattern',
          'Neutral pattern',
          'Volume pattern'
        ],
        correctAnswer: 1,
        explanation: 'The Head and Shoulders pattern is a reversal pattern, often marking the end of an uptrend.',
        tip: 'Look for three peaks with the middle being the highest.'
      },
      {
        question: 'Which pattern typically indicates a trend continuation?',
        options: [
          'Double Top',
          'Head and Shoulders',
          'Flag Pattern',
          'Triple Bottom'
        ],
        correctAnswer: 2,
        explanation: 'Flag patterns are continuation patterns that suggest a brief pause before the trend continues.',
        tip: 'They often occur after strong directional moves.'
      },
      {
        question: 'Double Top/Bottom patterns suggest:',
        options: [
          'Trend continuation',
          'Potential reversal',
          'Stable market conditions',
          'None of the above'
        ],
        correctAnswer: 1,
        explanation: 'Double Top/Bottom patterns indicate that the current trend may be exhausting and a reversal could be imminent.',
        tip: 'Confirmation with volume is key.'
      },
      {
        question: 'A key characteristic of a triangle pattern is that it:',
        options: [
          'Has equal highs and lows',
          'Shows convergence of price action',
          'Only appears in uptrends',
          'Lasts for several months'
        ],
        correctAnswer: 1,
        explanation: 'Triangles indicate that the price is consolidating as the highs and lows converge, often preceding a breakout.',
        tip: 'Watch the breakout direction closely.'
      },
      {
        question: 'Chart patterns are most reliable when confirmed by:',
        options: [
          'Volume',
          'Economic reports',
          'Fundamental analysis',
          'Social media sentiment'
        ],
        correctAnswer: 0,
        explanation: 'Volume confirmation increases the reliability of chart patterns as signals for trend changes.',
        tip: 'Look for volume spikes during breakouts.'
      }
    ]
  },
  {
    id: 'indicators-oscillators',
    title: 'Indicators & Oscillators',
    icon: Gauge,
    content: [
      'Indicators and oscillators provide signals for market conditions by analyzing price momentum and volatility.',
      'They help traders determine overbought or oversold conditions, confirm trends, and identify potential reversals.',
      'Common indicators include the Relative Strength Index (RSI), MACD, and Stochastic Oscillator.',
      'Oscillators can also be used to spot divergences that may indicate a reversal in trend.'
    ],
    quiz: [
      {
        question: 'What does RSI stand for?',
        options: [
          'Relative Strength Index',
          'Rapid Signal Indicator',
          'Realistic Stock Index',
          'None of the above'
        ],
        correctAnswer: 0,
        explanation: 'RSI stands for Relative Strength Index, a momentum oscillator that measures the speed and change of price movements.',
        tip: 'It is widely used to gauge overbought or oversold conditions.'
      },
      {
        question: 'Which oscillator compares a security’s closing price to its price range over a period?',
        options: [
          'MACD',
          'Stochastic Oscillator',
          'Bollinger Bands',
          'Moving Average'
        ],
        correctAnswer: 1,
        explanation: 'The Stochastic Oscillator compares the closing price to the range of prices over a given period, helping identify potential reversals.',
        tip: 'Divergence in this oscillator can be a key signal.'
      },
      {
        question: 'Which of the following is NOT typically used as an oscillator?',
        options: [
          'MACD',
          'RSI',
          'Stochastic Oscillator',
          'Simple Moving Average'
        ],
        correctAnswer: 3,
        explanation: 'A Simple Moving Average is used to smooth price data and is not considered an oscillator.',
        tip: 'Oscillators typically indicate momentum conditions.'
      },
      {
        question: 'Oscillators can help identify:',
        options: [
          'Overbought and oversold conditions',
          'Support and resistance levels',
          'Market capitalization',
          'Dividend yield'
        ],
        correctAnswer: 0,
        explanation: 'Oscillators such as RSI and Stochastic are used to identify overbought or oversold conditions.',
        tip: 'They are most effective when combined with other analysis tools.'
      },
      {
        question: 'Divergence between price and an oscillator often suggests:',
        options: [
          'Continuation of the trend',
          'A potential trend reversal',
          'Stable market conditions',
          'No actionable signal'
        ],
        correctAnswer: 1,
        explanation: 'Divergence occurs when the price and the oscillator move in opposite directions, which can signal a weakening trend and potential reversal.',
        tip: 'Watch for divergence as an early warning sign.'
      }
    ]
  },
  {
    id: 'candlestick-patterns',
    title: 'Candlestick Patterns',
    icon: Candlestick,
    content: [
      'Candlestick patterns are formed by price action and provide insights into market sentiment.',
      'They include patterns such as Doji, Hammer, Engulfing, and Shooting Star.',
      'Recognizing these patterns helps traders anticipate reversals and continuations in the market.'
    ],
    quiz: [
      {
        question: 'What does a Doji candlestick typically indicate?',
        options: [
          'Strong trend',
          'Market indecision',
          'High volatility',
          'Guaranteed reversal'
        ],
        correctAnswer: 1,
        explanation: 'A Doji indicates that the opening and closing prices are very close together, suggesting indecision in the market.',
        tip: 'It can signal a potential reversal when combined with other factors.'
      },
      {
        question: 'Which candlestick pattern is considered bullish?',
        options: [
          'Shooting Star',
          'Bearish Engulfing',
          'Hammer',
          'Dark Cloud Cover'
        ],
        correctAnswer: 2,
        explanation: 'A Hammer candlestick is considered a bullish reversal pattern, particularly when it appears after a downtrend.',
        tip: 'Look for a small body with a long lower shadow.'
      },
      {
        question: 'An Engulfing pattern occurs when:',
        options: [
          'A small candle is followed by a larger candle that completely engulfs it',
          'Two candles are the same size',
          'The first candle engulfs the second',
          'There is a gap between candles'
        ],
        correctAnswer: 0,
        explanation: 'In an Engulfing pattern, a small candle is followed by a larger candle whose body completely covers the previous candle’s body, indicating a potential reversal.',
        tip: 'This pattern can signal a shift in market sentiment.'
      },
      {
        question: 'The Shooting Star candlestick is typically a sign of:',
        options: [
          'Bullish reversal',
          'Bearish reversal',
          'Market indecision',
          'Stable trends'
        ],
        correctAnswer: 1,
        explanation: 'A Shooting Star is a bearish reversal pattern, particularly after an uptrend, due to its small body and long upper shadow.',
        tip: 'It suggests that buyers are losing control.'
      },
      {
        question: 'Candlestick patterns are most effective when used in:',
        options: [
          'Isolation',
          'Conjunction with support/resistance analysis',
          'Only with moving averages',
          'Without any other indicators'
        ],
        correctAnswer: 1,
        explanation: 'Candlestick patterns work best when combined with other technical tools like support and resistance levels for confirmation.',
        tip: 'Always look for additional signals to confirm the pattern.'
      }
    ]
  },
  {
    id: 'support-resistance',
    title: 'Support & Resistance',
    icon: Target,
    content: [
      'Support and resistance levels are key concepts in technical analysis.',
      'Support is a price level where buying is strong enough to prevent further decline, while resistance is where selling is strong enough to prevent further gains.',
      'These levels help traders decide when to enter or exit positions and can act as price barriers.'
    ],
    quiz: [
      {
        question: 'What does a support level represent?',
        options: [
          'A price level where selling is strong',
          'A price level where buying is strong',
          'The average price',
          'A moving average'
        ],
        correctAnswer: 1,
        explanation: 'A support level is a price at which buyers are expected to enter the market, preventing further price declines.',
        tip: 'Think of support as a floor for prices.'
      },
      {
        question: 'Resistance levels are typically associated with:',
        options: [
          'Low trading volume',
          'High selling pressure',
          'Strong demand',
          'Bullish trends'
        ],
        correctAnswer: 1,
        explanation: 'Resistance levels occur where selling pressure is strong enough to stop prices from rising further.',
        tip: 'They act as a ceiling for prices.'
      },
      {
        question: 'Support and resistance levels are determined by:',
        options: [
          'Historical price data',
          'Random selection',
          'Economic forecasts',
          'Company fundamentals'
        ],
        correctAnswer: 0,
        explanation: 'These levels are typically identified by analyzing historical price data to see where prices have repeatedly reversed.',
        tip: 'Past price action is a strong indicator of future support/resistance.'
      },
      {
        question: 'When a price breaks above resistance, it may become:',
        options: [
          'A new resistance',
          'A new support',
          'Irrelevant',
          'A moving average'
        ],
        correctAnswer: 1,
        explanation: 'When a price breaks above resistance, that level can turn into a new support level.',
        tip: 'This is a common concept in technical analysis.'
      },
      {
        question: 'The strength of support or resistance is often confirmed by:',
        options: [
          'The number of times it has been tested',
          'High volume at those levels',
          'The duration it has held',
          'All of the above'
        ],
        correctAnswer: 3,
        explanation: 'A strong support or resistance level is often confirmed by multiple tests, significant volume, and the length of time it has held.',
        tip: 'Look at several factors to judge the strength of these levels.'
      }
    ]
  },
  {
    id: 'advanced-chart-techniques',
    title: 'Advanced Chart Techniques',
    icon: LineChart,
    content: [
      'Advanced chart techniques involve tools such as Fibonacci retracements, Elliott Wave Theory, and detailed trendlines.',
      'These methods provide insights into market corrections and continuation patterns that go beyond basic chart reading.',
      'They are typically used by experienced traders to refine their entry and exit strategies with greater precision.'
    ],
    quiz: [
      {
        question: 'What is the purpose of Fibonacci retracements?',
        options: [
          'Identify potential support and resistance levels',
          'Measure trading volume',
          'Predict economic events',
          'Calculate moving averages'
        ],
        correctAnswer: 0,
        explanation: 'Fibonacci retracements help identify potential support and resistance levels based on key Fibonacci ratios derived from historical price movements.',
        tip: 'Common retracement levels include 38.2%, 50%, and 61.8%.'
      },
      {
        question: 'Elliott Wave Theory is used to:',
        options: [
          'Predict market cycles',
          'Measure volatility',
          'Determine fundamental value',
          'Set stop-loss orders'
        ],
        correctAnswer: 0,
        explanation: 'Elliott Wave Theory attempts to predict market cycles by identifying recurring patterns (waves) in price movements.',
        tip: 'It is based on the idea that market sentiment follows a repetitive wave-like pattern.'
      },
      {
        question: 'Fibonacci retracement levels are derived from:',
        options: [
          'Fibonacci numbers',
          'Moving averages',
          'Price volume data',
          'Random ratios'
        ],
        correctAnswer: 0,
        explanation: 'Fibonacci retracements are based on ratios derived from the Fibonacci sequence, which help predict potential reversal levels.',
        tip: 'The most common ratios are 38.2%, 50%, and 61.8%.'
      },
      {
        question: 'Advanced chart techniques help traders by:',
        options: [
          'Providing precise entry and exit points',
          'Guaranteeing profits',
          'Eliminating all risk',
          'Replacing basic technical analysis'
        ],
        correctAnswer: 0,
        explanation: 'These techniques offer additional layers of insight, helping traders fine-tune their entry and exit points.',
        tip: 'They complement rather than replace basic analysis.'
      },
      {
        question: 'Elliott Wave Theory suggests that market movements:',
        options: [
          'Are random and unpredictable',
          'Follow predictable wave patterns',
          'Are solely driven by fundamentals',
          'Do not repeat over time'
        ],
        correctAnswer: 1,
        explanation: 'According to Elliott Wave Theory, markets move in repetitive cycles or waves that can be analyzed to predict future price action.',
        tip: 'Identifying wave structures can provide insight into market sentiment.'
      }
    ]
  }
];

export default function TechnicalAnalysis() {
  const [selectedSection, setSelectedSection] = useState<string>('introduction');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const currentSection = sections.find(section => section.id === selectedSection);
  const currentQuestion = currentSection?.quiz[currentQuestionIndex];

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setCurrentQuestionIndex(0);
    setUserAnswer(null);
    setShowExplanation(false);
    setShowTip(false);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BarChart2 className="text-brand-primary" size={32} />
          <div>
            <h1 className="text-3xl font-bold">Technical Analysis</h1>
            <p className="text-gray-500 dark:text-gray-400">Master the Art of Chart Analysis</p>
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

                {selectedSection === 'chart-patterns' && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">Live Chart Example</h3>
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-brand-primary/20 overflow-hidden">
                      <TradingChart symbol="AAPL" className="h-[300px]" />
                    </div>
                  </div>
                )}
                
                <div className="space-y-4 mb-8">
                  {currentSection.content.map((paragraph, index) => (
                    <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
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
