import { AssetQuote, Position, TradeOrder, ClosedTrade, RiskManagementConfig, SectorCategory } from '../types/trading';
import {
  INITIAL_MARKET_QUOTES,
  INITIAL_POSITIONS,
  INITIAL_CLOSED_TRADES,
  INITIAL_RISK_CONFIG
} from '../data/mockMarketData';

export interface MarketUpdateEvent {
  quotes: AssetQuote[];
  positions: Position[];
  closedTrades: ClosedTrade[];
  triggeredOrders: TradeOrder[];
  circuitBreakerTriggered: boolean;
  circuitBreakerReason?: string;
  drawdownPercent: number;
  totalPortfolioValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  lastUpdatedTimestamp: number;
  isLiveFeedRunning: boolean;
}

type Subscriber = (event: MarketUpdateEvent) => void;

class MarketFeedEngine {
  private quotes: AssetQuote[] = [];
  private positions: Position[] = [];
  private closedTrades: ClosedTrade[] = [];
  private pendingOrders: TradeOrder[] = [];
  private riskConfig: RiskManagementConfig;
  private peakEquity: number = 104500;
  private startOfDayEquity: number = 99800;
  private subscribers: Set<Subscriber> = new Set();
  private intervalId: any = null;
  private isLiveFeedActive: boolean = true;
  private latencyMs: number = 24; // Simulated ultra-low latency
  private lastUpdatedTimestamp: number = Date.now();

  constructor(
    initialQuotes: AssetQuote[] = INITIAL_MARKET_QUOTES,
    initialPositions: Position[] = INITIAL_POSITIONS,
    initialClosedTrades: ClosedTrade[] = INITIAL_CLOSED_TRADES,
    riskConfig: RiskManagementConfig = INITIAL_RISK_CONFIG
  ) {
    this.quotes = initialQuotes && initialQuotes.length > 0
      ? JSON.parse(JSON.stringify(initialQuotes))
      : JSON.parse(JSON.stringify(INITIAL_MARKET_QUOTES));
    this.positions = initialPositions && initialPositions.length > 0
      ? JSON.parse(JSON.stringify(initialPositions))
      : JSON.parse(JSON.stringify(INITIAL_POSITIONS));
    this.closedTrades = initialClosedTrades && initialClosedTrades.length > 0
      ? JSON.parse(JSON.stringify(initialClosedTrades))
      : JSON.parse(JSON.stringify(INITIAL_CLOSED_TRADES));
    this.riskConfig = riskConfig
      ? JSON.parse(JSON.stringify(riskConfig))
      : JSON.parse(JSON.stringify(INITIAL_RISK_CONFIG));
    this.start();
  }

  public subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    // Emit initial snapshot immediately to subscriber
    cb(this.getSnapshot());
    return () => this.subscribers.delete(cb);
  }

  public getSnapshot(): MarketUpdateEvent {
    const totalUnrealized = this.positions.reduce((acc, pos) => acc + (pos.unrealizedPnL || 0), 0);
    const cashBase = 42350;
    const investedBase = this.positions.reduce((acc, pos) => acc + pos.shares * pos.entryPrice, 0);
    const currentEquity = cashBase + investedBase + totalUnrealized;
    const dd = Number((((this.peakEquity - currentEquity) / this.peakEquity) * 100).toFixed(2));
    const dPnL = currentEquity - this.startOfDayEquity;
    const dPnLPct = Number(((dPnL / this.startOfDayEquity) * 100).toFixed(2));

    return {
      quotes: this.quotes.map((q) => ({ ...q, priceHistory: [...q.priceHistory] })),
      positions: this.positions.map((p) => ({ ...p })),
      closedTrades: [...this.closedTrades],
      triggeredOrders: [],
      circuitBreakerTriggered: !!this.riskConfig.isCircuitBreakerActive,
      circuitBreakerReason: this.riskConfig.isCircuitBreakerActive ? 'Circuit Breaker Active' : undefined,
      drawdownPercent: Math.max(0, dd),
      totalPortfolioValue: currentEquity,
      dailyPnL: dPnL,
      dailyPnLPercent: dPnLPct,
      lastUpdatedTimestamp: this.lastUpdatedTimestamp,
      isLiveFeedRunning: this.isLiveFeedActive
    };
  }

  public setLiveFeedActive(active: boolean) {
    this.isLiveFeedActive = active;
    this.emit();
  }

  public toggleLiveFeed(): boolean {
    this.isLiveFeedActive = !this.isLiveFeedActive;
    this.emit();
    return this.isLiveFeedActive;
  }

  public isFeedActive(): boolean {
    return this.isLiveFeedActive;
  }

  public forceTick() {
    this.tick();
  }

  public updateAssetPrice(symbol: string, newPrice: number) {
    const qIndex = this.quotes.findIndex((q) => q.symbol.toUpperCase() === symbol.toUpperCase());
    if (qIndex >= 0) {
      const q = this.quotes[qIndex];
      const delta = Number((newPrice - q.price).toFixed(2));
      const newHistory = [...q.priceHistory, newPrice];
      if (newHistory.length > 25) newHistory.shift();
      this.quotes[qIndex] = {
        ...q,
        price: newPrice,
        change: delta,
        changePercent: Number(((delta / (newPrice || 1)) * 100).toFixed(2)),
        high24h: Math.max(q.high24h, newPrice),
        low24h: Math.min(q.low24h, newPrice),
        priceHistory: newHistory
      };
      this.emit();
    }
  }

  public addAssetQuote(quote: AssetQuote) {
    const existingIndex = this.quotes.findIndex((q) => q.symbol.toUpperCase() === quote.symbol.toUpperCase());
    if (existingIndex >= 0) {
      this.quotes[existingIndex] = { ...this.quotes[existingIndex], ...quote };
    } else {
      this.quotes.unshift(quote);
    }
    this.emit();
  }

  public updateAssetQuote(symbol: string, updates: Partial<AssetQuote>) {
    const qIndex = this.quotes.findIndex((q) => q.symbol.toUpperCase() === symbol.toUpperCase());
    if (qIndex >= 0) {
      this.quotes[qIndex] = { ...this.quotes[qIndex], ...updates };
      this.emit();
    }
  }

  public removeAssetQuote(symbol: string) {
    this.quotes = this.quotes.filter((q) => q.symbol.toUpperCase() !== symbol.toUpperCase());
    this.emit();
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public updateRiskConfig(config: RiskManagementConfig) {
    this.riskConfig = config;
  }

  public getRiskConfig(): RiskManagementConfig {
    return this.riskConfig;
  }

  public resetCircuitBreaker() {
    this.riskConfig.isCircuitBreakerActive = false;
    this.riskConfig.cooldownRemainingMinutes = 0;
    this.emit();
  }

  public executeOrder(order: Omit<TradeOrder, 'id' | 'status' | 'timestamp'>): TradeOrder {
    if (this.riskConfig.isCircuitBreakerActive) {
      throw new Error('Circuit Breaker is ACTIVE. Trading is locked to protect capital from emotional decisions.');
    }

    const newOrder: TradeOrder = {
      ...order,
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'FILLED',
      timestamp: Date.now()
    };

    const quote = this.quotes.find((q) => q.symbol === order.symbol);
    const executionPrice = order.limitPrice && order.orderType === 'LIMIT' ? order.limitPrice : quote?.price || 100;

    // Check if position already exists for this symbol
    const existingIndex = this.positions.findIndex((p) => p.symbol === order.symbol);
    if (existingIndex >= 0) {
      const p = this.positions[existingIndex];
      if (p.side === (order.side === 'BUY' ? 'LONG' : 'SHORT')) {
        // add to position
        const totalShares = p.shares + order.shares;
        const totalCost = p.shares * p.entryPrice + order.shares * executionPrice;
        p.entryPrice = Number((totalCost / totalShares).toFixed(2));
        p.shares = totalShares;
        p.stopLoss = order.stopLoss;
        p.takeProfit = order.takeProfit;
        p.allocatedCapital = Number((totalShares * p.entryPrice).toFixed(2));
      } else {
        // closing or reducing opposite position
        this.closePosition(p.id, 'MANUAL', 'Order opposite side execution');
      }
    } else {
      const riskPerShare = Math.abs(executionPrice - order.stopLoss);
      const totalRisk = Number((riskPerShare * order.shares).toFixed(2));
      const allocatedCap = Number((executionPrice * order.shares).toFixed(2));

      const newPos: Position = {
        id: `pos-${Date.now()}`,
        symbol: order.symbol,
        side: order.side === 'BUY' ? 'LONG' : 'SHORT',
        shares: order.shares,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        trailingStopPercent: this.riskConfig.trailingStopDefaultPercent,
        highestPriceSinceEntry: executionPrice,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        allocatedCapital: allocatedCap,
        riskAmount: totalRisk,
        openTimestamp: Date.now(),
        source: 'MANUAL',
        notes: `Order filled via ${order.brokerageRoute}`
      };
      this.positions.push(newPos);
    }

    this.pendingOrders.push(newOrder);
    this.emit();
    return newOrder;
  }

  public closePosition(
    positionId: string,
    reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'CIRCUIT_BREAKER' | 'MANUAL',
    userNotes?: string
  ) {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx === -1) return;

    const p = this.positions[idx];
    const exitPrice = p.currentPrice;
    const realizedPnL = Number(((exitPrice - p.entryPrice) * p.shares * (p.side === 'LONG' ? 1 : -1)).toFixed(2));
    const realizedPnLPercent = Number((((exitPrice - p.entryPrice) / p.entryPrice) * 100 * (p.side === 'LONG' ? 1 : -1)).toFixed(2));

    const closed: ClosedTrade = {
      id: `closed-${Date.now()}`,
      symbol: p.symbol,
      side: p.side,
      shares: p.shares,
      entryPrice: p.entryPrice,
      exitPrice: exitPrice,
      realizedPnL: realizedPnL,
      realizedPnLPercent: realizedPnLPercent,
      holdingPeriod: this.formatHoldingPeriod(Date.now() - p.openTimestamp),
      exitReason: reason,
      emotionalDisciplineRating: reason === 'STOP_LOSS' || reason === 'TAKE_PROFIT' ? 5 : 4,
      adheredToPlan: reason !== 'MANUAL',
      notes: userNotes || `${reason} triggered at $${exitPrice.toFixed(2)}`,
      closedTimestamp: Date.now()
    };

    this.closedTrades.unshift(closed);
    this.positions.splice(idx, 1);
    this.emit();
  }

  public updatePositionStop(positionId: string, newStop: number, newTakeProfit?: number) {
    const p = this.positions.find((pos) => pos.id === positionId);
    if (p) {
      p.stopLoss = newStop;
      if (newTakeProfit) p.takeProfit = newTakeProfit;
      this.emit();
    }
  }

  public addExistingPosition(positionData: {
    symbol: string;
    name?: string;
    sector?: SectorCategory;
    side: 'LONG' | 'SHORT';
    shares: number;
    entryPrice: number;
    currentPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    trailingStopPercent?: number;
    notes?: string;
    openTimestamp?: number;
    addToRadar?: boolean;
  }): Position {
    const symbolUpper = positionData.symbol.toUpperCase().trim();
    let quote = this.quotes.find((q) => q.symbol.toUpperCase() === symbolUpper);

    const curPrice =
      positionData.currentPrice && positionData.currentPrice > 0
        ? positionData.currentPrice
        : quote
        ? quote.price
        : positionData.entryPrice;

    // If quote doesn't exist or user requested add to radar, add quote
    if (!quote || positionData.addToRadar) {
      if (!quote) {
        const newQuote: AssetQuote = {
          symbol: symbolUpper,
          name: positionData.name || `${symbolUpper} Inc`,
          sector: positionData.sector || 'SP100_LEADERS',
          price: curPrice,
          change: Number((curPrice - positionData.entryPrice).toFixed(2)),
          changePercent: Number((((curPrice - positionData.entryPrice) / (positionData.entryPrice || 1)) * 100).toFixed(2)),
          high24h: Number((Math.max(curPrice, positionData.entryPrice) * 1.015).toFixed(2)),
          low24h: Number((Math.min(curPrice, positionData.entryPrice) * 0.985).toFixed(2)),
          volume: '18.4M',
          volatilityRank: 65,
          beta: 1.25,
          rsi14: 55.0,
          trend: curPrice >= positionData.entryPrice ? 'BULLISH' : 'BEARISH',
          timeframeSignals: { '1H': 'BUY', '4H': 'BUY', '1D': 'BUY' },
          keyLevels: {
            support: Number((curPrice * 0.95).toFixed(2)),
            resistance: Number((curPrice * 1.05).toFixed(2)),
            pivot: curPrice
          },
          priceHistory: [
            Number((positionData.entryPrice * 0.98).toFixed(2)),
            Number((positionData.entryPrice * 0.99).toFixed(2)),
            Number((positionData.entryPrice).toFixed(2)),
            curPrice
          ]
        };
        this.quotes.unshift(newQuote);
      }
    }

    const defaultSl =
      positionData.side === 'LONG'
        ? Number((positionData.entryPrice * 0.95).toFixed(2))
        : Number((positionData.entryPrice * 1.05).toFixed(2));
    const defaultTp =
      positionData.side === 'LONG'
        ? Number((positionData.entryPrice * 1.10).toFixed(2))
        : Number((positionData.entryPrice * 0.90).toFixed(2));

    const sl = positionData.stopLoss && positionData.stopLoss > 0 ? positionData.stopLoss : defaultSl;
    const tp = positionData.takeProfit && positionData.takeProfit > 0 ? positionData.takeProfit : defaultTp;

    const unrealizedPnL = Number(
      ((curPrice - positionData.entryPrice) * positionData.shares * (positionData.side === 'LONG' ? 1 : -1)).toFixed(2)
    );
    const unrealizedPnLPercent = Number(
      (((curPrice - positionData.entryPrice) / (positionData.entryPrice || 1)) * 100 * (positionData.side === 'LONG' ? 1 : -1)).toFixed(2)
    );
    const riskPerShare = Math.abs(curPrice - sl);
    const totalRisk = Number((riskPerShare * positionData.shares).toFixed(2));
    const allocatedCap = Number((positionData.entryPrice * positionData.shares).toFixed(2));

    const newPos: Position = {
      id: `pos-user-${Date.now()}`,
      symbol: symbolUpper,
      side: positionData.side,
      shares: positionData.shares,
      entryPrice: positionData.entryPrice,
      currentPrice: curPrice,
      stopLoss: sl,
      takeProfit: tp,
      trailingStopPercent: positionData.trailingStopPercent ?? this.riskConfig.trailingStopDefaultPercent,
      highestPriceSinceEntry: Math.max(curPrice, positionData.entryPrice),
      unrealizedPnL: unrealizedPnL,
      unrealizedPnLPercent: unrealizedPnLPercent,
      allocatedCapital: allocatedCap,
      riskAmount: totalRisk,
      openTimestamp: positionData.openTimestamp || Date.now(),
      source: 'MANUAL',
      notes: positionData.notes || 'Existing holding added to ApexTrade portfolio'
    };

    this.positions.unshift(newPos);
    this.emit();
    return newPos;
  }

  public updatePosition(positionId: string, updates: Partial<Position>) {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx >= 0) {
      const p = this.positions[idx];
      const merged = { ...p, ...updates };
      const curPrice = merged.currentPrice;
      merged.unrealizedPnL = Number(
        ((curPrice - merged.entryPrice) * merged.shares * (merged.side === 'LONG' ? 1 : -1)).toFixed(2)
      );
      merged.unrealizedPnLPercent = Number(
        (((curPrice - merged.entryPrice) / (merged.entryPrice || 1)) * 100 * (merged.side === 'LONG' ? 1 : -1)).toFixed(2)
      );
      merged.allocatedCapital = Number((merged.entryPrice * merged.shares).toFixed(2));
      const riskPerShare = Math.abs(curPrice - merged.stopLoss);
      merged.riskAmount = Number((riskPerShare * merged.shares).toFixed(2));

      this.positions[idx] = merged;
      this.emit();
    }
  }

  public removePosition(positionId: string) {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx >= 0) {
      this.positions.splice(idx, 1);
      this.emit();
    }
  }

  public panicLiquidateAll(reason: string = 'EMERGENCY_PANIC_PROTECTION') {
    const posCopy = [...this.positions];
    for (const p of posCopy) {
      this.closePosition(p.id, 'CIRCUIT_BREAKER', reason);
    }
    this.riskConfig.isCircuitBreakerActive = true;
    this.riskConfig.cooldownRemainingMinutes = 60;
    this.emit();
  }

  private start() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      if (!this.isLiveFeedActive) return;
      this.tick();
    }, 1200);
  }

  private tick() {
    this.lastUpdatedTimestamp = Date.now();
    this.latencyMs = Math.floor(18 + Math.random() * 12); // Realistic 18-30ms low-latency jitter

    // IMMUTABLE price fluctuation simulation
    this.quotes = this.quotes.map((q) => {
      const volMultiplier = q.sector === 'CRYPTO' ? 0.0035 : q.sector === 'VOLATILITY' ? 0.004 : 0.0018;
      const delta = (Math.random() - 0.49) * q.price * volMultiplier;
      const newPrice = Number(Math.max(0.1, q.price + delta).toFixed(q.price > 1000 ? 1 : 2));
      const newChange = Number((newPrice - (q.high24h + q.low24h) / 2).toFixed(2));
      const newChangePercent = Number(((newChange / newPrice) * 100).toFixed(2));
      const newHigh = Math.max(q.high24h, newPrice);
      const newLow = Math.min(q.low24h, newPrice);

      const newHistory = [...q.priceHistory];
      if (Math.random() > 0.4) {
        newHistory.push(newPrice);
        if (newHistory.length > 25) {
          newHistory.shift();
        }
      }

      return {
        ...q,
        price: newPrice,
        change: newChange,
        changePercent: newChangePercent,
        high24h: newHigh,
        low24h: newLow,
        priceHistory: newHistory
      };
    });

    // Update positions and check stop losses / trailing stops immutably
    const positionsToClose: { id: string; reason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP'; note: string }[] = [];

    this.positions = this.positions.map((p) => {
      const quote = this.quotes.find((q) => q.symbol === p.symbol);
      if (!quote) return p;

      const currentPrice = quote.price;
      const unrealizedPnL = Number(((currentPrice - p.entryPrice) * p.shares * (p.side === 'LONG' ? 1 : -1)).toFixed(2));
      const unrealizedPnLPercent = Number((((currentPrice - p.entryPrice) / p.entryPrice) * 100 * (p.side === 'LONG' ? 1 : -1)).toFixed(2));

      let highestPrice = p.highestPriceSinceEntry;
      let stopLoss = p.stopLoss;

      // Trailing stop logic
      if (p.trailingStopPercent && p.trailingStopPercent > 0) {
        if (!highestPrice || currentPrice > highestPrice) {
          highestPrice = currentPrice;
          const trailingStopLevel = Number((highestPrice * (1 - p.trailingStopPercent / 100)).toFixed(2));
          if (trailingStopLevel > stopLoss) {
            stopLoss = trailingStopLevel;
          }
        }
      }

      // Check Stop Loss Trigger
      if (p.side === 'LONG' && currentPrice <= stopLoss) {
        positionsToClose.push({
          id: p.id,
          reason: 'STOP_LOSS',
          note: `Automated Stop Loss triggered at $${currentPrice.toFixed(2)} (SL: $${stopLoss.toFixed(2)})`
        });
      } else if (p.side === 'SHORT' && currentPrice >= stopLoss) {
        positionsToClose.push({
          id: p.id,
          reason: 'STOP_LOSS',
          note: `Automated Stop Loss triggered at $${currentPrice.toFixed(2)} (SL: $${stopLoss.toFixed(2)})`
        });
      }
      // Check Take Profit Trigger
      else if (p.side === 'LONG' && currentPrice >= p.takeProfit) {
        positionsToClose.push({
          id: p.id,
          reason: 'TAKE_PROFIT',
          note: `Target hit at $${currentPrice.toFixed(2)}! Locked in gain.`
        });
      } else if (p.side === 'SHORT' && currentPrice <= p.takeProfit) {
        positionsToClose.push({
          id: p.id,
          reason: 'TAKE_PROFIT',
          note: `Target hit at $${currentPrice.toFixed(2)}! Locked in gain.`
        });
      }

      return {
        ...p,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        stopLoss,
        highestPriceSinceEntry: highestPrice
      };
    });

    // Close any triggered positions immediately
    positionsToClose.forEach((item) => {
      this.closePosition(item.id, item.reason, item.note);
    });

    // Portfolio and drawdown calculation
    const totalUnrealized = this.positions.reduce((acc, pos) => acc + pos.unrealizedPnL, 0);
    const cashBase = 42350;
    const investedBase = this.positions.reduce((acc, pos) => acc + pos.shares * pos.entryPrice, 0);
    const currentEquity = cashBase + investedBase + totalUnrealized;
    const drawdownPercent = Number((((this.peakEquity - currentEquity) / this.peakEquity) * 100).toFixed(2));
    const dailyPnL = currentEquity - this.startOfDayEquity;
    const dailyPnLPercent = Number(((dailyPnL / this.startOfDayEquity) * 100).toFixed(2));

    // Evaluate Circuit Breaker Trigger
    let circuitBreakerTriggered = false;
    let circuitBreakerReason: string | undefined = undefined;

    if (
      !this.riskConfig.isCircuitBreakerActive &&
      (drawdownPercent >= this.riskConfig.maxPortfolioDrawdownThreshold ||
        (dailyPnLPercent < 0 && Math.abs(dailyPnLPercent) >= this.riskConfig.maxDailyDrawdownThreshold))
    ) {
      this.riskConfig.isCircuitBreakerActive = true;
      this.riskConfig.cooldownRemainingMinutes = 45;
      circuitBreakerTriggered = true;
      circuitBreakerReason =
        drawdownPercent >= this.riskConfig.maxPortfolioDrawdownThreshold
          ? `Max Portfolio Drawdown limit reached (${drawdownPercent}% >= ${this.riskConfig.maxPortfolioDrawdownThreshold}%). System locked to prevent revenge trading.`
          : `Daily loss limit breached (${Math.abs(dailyPnLPercent)}% >= ${this.riskConfig.maxDailyDrawdownThreshold}%). Cooldown protocol engaged.`;
    }

    this.emit(circuitBreakerTriggered, circuitBreakerReason, drawdownPercent, currentEquity, dailyPnL, dailyPnLPercent);
  }

  private emit(
    circuitBreakerTriggered: boolean = false,
    circuitBreakerReason?: string,
    drawdownPercent?: number,
    totalPortfolioValue?: number,
    dailyPnL?: number,
    dailyPnLPercent?: number
  ) {
    const totalUnrealized = this.positions.reduce((acc, pos) => acc + pos.unrealizedPnL, 0);
    const cashBase = 42350;
    const investedBase = this.positions.reduce((acc, pos) => acc + pos.shares * pos.entryPrice, 0);
    const currentEquity = totalPortfolioValue ?? cashBase + investedBase + totalUnrealized;
    const dd = drawdownPercent ?? Number((((this.peakEquity - currentEquity) / this.peakEquity) * 100).toFixed(2));
    const dPnL = dailyPnL ?? currentEquity - this.startOfDayEquity;
    const dPnLPct = dailyPnLPercent ?? Number(((dPnL / this.startOfDayEquity) * 100).toFixed(2));

    const event: MarketUpdateEvent = {
      quotes: this.quotes.map((q) => ({ ...q, priceHistory: [...q.priceHistory] })),
      positions: this.positions.map((p) => ({ ...p })),
      closedTrades: [...this.closedTrades],
      triggeredOrders: [],
      circuitBreakerTriggered,
      circuitBreakerReason,
      drawdownPercent: Math.max(0, dd),
      totalPortfolioValue: currentEquity,
      dailyPnL: dPnL,
      dailyPnLPercent: dPnLPct,
      lastUpdatedTimestamp: this.lastUpdatedTimestamp,
      isLiveFeedRunning: this.isLiveFeedActive
    };

    this.subscribers.forEach((cb) => cb(event));
  }

  private formatHoldingPeriod(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return `${Math.max(1, hours)} hours`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}

export const marketEngine = new MarketFeedEngine();
