export type SectorCategory = 'SOX_TECH' | 'MEMORY_SECTOR' | 'SP100_LEADERS' | 'CRYPTO' | 'VOLATILITY';

export interface AssetQuote {
  symbol: string;
  name: string;
  sector: SectorCategory;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: string;
  volatilityRank: number; // 1-100
  beta: number;
  rsi14: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframeSignals: {
    '1H': 'BUY' | 'SELL' | 'HOLD';
    '4H': 'BUY' | 'SELL' | 'HOLD';
    '1D': 'BUY' | 'SELL' | 'HOLD';
  };
  keyLevels: {
    support: number;
    resistance: number;
    pivot: number;
  };
  priceHistory: number[]; // recent 30 points for sparkline
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  shares: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  trailingStopPercent?: number;
  highestPriceSinceEntry?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocatedCapital: number;
  riskAmount: number;
  openTimestamp: number;
  source: 'MANUAL' | 'TRADE_BRIGADE_SIGNAL' | 'AUTOMATED_STRATEGY';
  notes?: string;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LIMIT';
  limitPrice?: number;
  shares: number;
  stopLoss: number;
  takeProfit: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'TRIGGERED';
  timestamp: number;
  brokerageRoute: 'ALPACA_PAPER' | 'ALPACA_LIVE' | 'INTERACTIVE_BROKERS' | 'SANDBOX_ENGINE';
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  shares: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  holdingPeriod: string;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'CIRCUIT_BREAKER' | 'MANUAL';
  emotionalDisciplineRating: number; // 1 to 5
  adheredToPlan: boolean;
  notes: string;
  closedTimestamp: number;
}

export interface TradeBrigadeSignal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskRewardRatio: number;
  timeframe: string;
  status: 'ACTIVE' | 'TRIGGERED' | 'TARGET_HIT' | 'STOPPED_OUT';
  confidence: 'HIGH' | 'MEDIUM';
  rationale: string;
  timestamp: string;
  author: string;
  sourceChannel: 'Trade Brigade Discord #swing-alerts' | 'Trade Brigade YouTube Pre-Market';
}

export interface PreMarketBriefing {
  id: string;
  date: string;
  title: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  videoDuration: string;
  summary: string;
  sp500Pivot: number;
  qqqPivot: number;
  soxKeyLevel: string;
  memorySectorNote: string;
  cryptoCorrelationNote: string;
  actionableSetups: string[];
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  timeframe: '1H' | '4H' | '1D';
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  cagr: number;
  averageRMultiple: number;
  drawdownCurve: { date: string; equity: number; drawdown: number }[];
  predictedPriceMovement: {
    forecastNext5Bars: number[];
    upperConfidenceBand: number[];
    lowerConfidenceBand: number[];
    confidenceScore: number;
  };
}

export interface RiskManagementConfig {
  maxRiskPerTradePercent: number; // default 1.0% or 1.5%
  maxDailyDrawdownThreshold: number; // default 2.5%
  maxPortfolioDrawdownThreshold: number; // default 5.0%
  autoStopLossDefaultPercent: number; // default 2.0%
  trailingStopDefaultPercent: number; // default 2.5%
  isCircuitBreakerActive: boolean;
  preventNewOrdersOnTilt: boolean;
  cooldownRemainingMinutes: number;
}

export interface BrokerageConfig {
  provider: 'ALPACA_PAPER' | 'ALPACA_LIVE' | 'INTERACTIVE_BROKERS' | 'SIMULATED_ENGINE';
  apiKey: string;
  secretKey: string;
  isConnected: boolean;
  endpointUrl: string;
  accountNumber: string;
  buyingPower: number;
  cashBalance: number;
  portfolioValue: number;
}

export interface CloudDatabaseConfig {
  provider: 'FIRESTORE_REST' | 'SECURE_CLOUD_WEBHOOK' | 'ENCRYPTED_LOCAL_REPLICA';
  cloudStatus: 'CONNECTED' | 'SYNCING' | 'OFFLINE';
  lastSyncedTimestamp: number;
  endpoint: string;
  syncFrequencySeconds: number;
}
