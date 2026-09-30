import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PortfolioOverview } from './components/PortfolioOverview';
import { WatchlistSectorRadar } from './components/WatchlistSectorRadar';
import { InteractiveChart } from './components/InteractiveChart';
import { OrderExecutionDesk } from './components/OrderExecutionDesk';
import { PositionsAndJournal } from './components/PositionsAndJournal';
import { TradeBrigadeFeed } from './components/TradeBrigadeFeed';
import { BacktestModelEngine } from './components/BacktestModelEngine';
import { RiskMitigationPanel } from './components/RiskMitigationPanel';
import { DrawdownCircuitBreakerModal } from './components/DrawdownCircuitBreakerModal';
import { BrokerageSettingsModal } from './components/BrokerageSettingsModal';
import { TradingViewWebhookModal } from './components/TradingViewWebhookModal';
import { DiscordLiveModal } from './components/DiscordLiveModal';

import {
  INITIAL_MARKET_QUOTES,
  INITIAL_POSITIONS,
  INITIAL_CLOSED_TRADES,
  TRADE_BRIGADE_SIGNALS,
  PREMARKET_BRIEFINGS,
  INITIAL_RISK_CONFIG,
  INITIAL_BROKERAGE_CONFIG,
  INITIAL_CLOUD_CONFIG
} from './data/mockMarketData';
import {
  AssetQuote,
  Position,
  ClosedTrade,
  TradeBrigadeSignal,
  RiskManagementConfig,
  BrokerageConfig,
  CloudDatabaseConfig,
  TradeOrder
} from './types/trading';
import { marketEngine, MarketUpdateEvent } from './services/marketFeed';
import { CloudStorageService, STORAGE_KEYS } from './services/cloudStorage';

export default function App() {
  // Load persisted or default initial state
  const [quotes, setQuotes] = useState<AssetQuote[]>(INITIAL_MARKET_QUOTES);
  const [positions, setPositions] = useState<Position[]>(() =>
    CloudStorageService.loadState<Position[]>(STORAGE_KEYS.POSITIONS, INITIAL_POSITIONS)
  );
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(() =>
    CloudStorageService.loadState<ClosedTrade[]>(STORAGE_KEYS.CLOSED_TRADES, INITIAL_CLOSED_TRADES)
  );
  const [riskConfig, setRiskConfig] = useState<RiskManagementConfig>(() =>
    CloudStorageService.loadState<RiskManagementConfig>(STORAGE_KEYS.RISK_CONFIG, INITIAL_RISK_CONFIG)
  );
  const [brokerageConfig, setBrokerageConfig] = useState<BrokerageConfig>(INITIAL_BROKERAGE_CONFIG);
  const [cloudConfig, setCloudConfig] = useState<CloudDatabaseConfig>(INITIAL_CLOUD_CONFIG);

  // Active UI Navigation & View states
  const [activeTab, setActiveTab] = useState<'terminal' | 'signals' | 'risk' | 'backtest' | 'journal'>('terminal');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('MU'); // Memory sector focus!

  // Real-time market state metrics
  const [portfolioValue, setPortfolioValue] = useState<number>(102380.0);
  const [dailyPnL, setDailyPnL] = useState<number>(1820.0);
  const [dailyPnLPercent, setDailyPnLPercent] = useState<number>(1.81);
  const [drawdownPercent, setDrawdownPercent] = useState<number>(1.93);
  const [latencyMs, setLatencyMs] = useState<number>(22);

  // Modals & Alerts
  const [isCircuitBreakerModalOpen, setIsCircuitBreakerModalOpen] = useState<boolean>(false);
  const [circuitBreakerAlertReason, setCircuitBreakerAlertReason] = useState<string | undefined>();
  const [isBrokerageModalOpen, setIsBrokerageModalOpen] = useState<boolean>(false);
  const [isTradingViewModalOpen, setIsTradingViewModalOpen] = useState<boolean>(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [isLiveFeedRunning, setIsLiveFeedRunning] = useState<boolean>(true);
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState<number>(Date.now());

  // Hook into live market feed engine
  useEffect(() => {
    marketEngine.updateRiskConfig(riskConfig);

    const unsubscribe = marketEngine.subscribe((event: MarketUpdateEvent) => {
      if (event.quotes && event.quotes.length > 0) {
        setQuotes(event.quotes);
      }
      if (event.positions) setPositions(event.positions);
      if (event.closedTrades) setClosedTrades(event.closedTrades);
      if (typeof event.totalPortfolioValue === 'number') setPortfolioValue(event.totalPortfolioValue);
      if (typeof event.dailyPnL === 'number') setDailyPnL(event.dailyPnL);
      if (typeof event.dailyPnLPercent === 'number') setDailyPnLPercent(event.dailyPnLPercent);
      if (typeof event.drawdownPercent === 'number') setDrawdownPercent(event.drawdownPercent);
      if (typeof event.lastUpdatedTimestamp === 'number') setLastUpdatedTimestamp(event.lastUpdatedTimestamp);
      if (typeof event.isLiveFeedRunning === 'boolean') setIsLiveFeedRunning(event.isLiveFeedRunning);
      setLatencyMs(marketEngine.getLatency());

      if (event.circuitBreakerTriggered) {
        setCircuitBreakerAlertReason(event.circuitBreakerReason);
        setIsCircuitBreakerModalOpen(true);
        setRiskConfig((prev) => ({ ...prev, isCircuitBreakerActive: true }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle Order Execution
  const handleExecuteOrder = (order: Omit<TradeOrder, 'id' | 'status' | 'timestamp'>) => {
    try {
      marketEngine.executeOrder(order);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Simulated TradingView Webhook order
  const handleSimulateWebhookOrder = (payload: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    stopLoss: number;
    takeProfit: number;
    shares: number;
  }) => {
    handleExecuteOrder({
      symbol: payload.symbol,
      side: payload.side,
      orderType: 'LIMIT',
      limitPrice: payload.price,
      shares: payload.shares,
      stopLoss: payload.stopLoss,
      takeProfit: payload.takeProfit,
      brokerageRoute: brokerageConfig.provider === 'SIMULATED_ENGINE' ? 'SANDBOX_ENGINE' : (brokerageConfig.provider as any)
    });
  };

  // Handle Closing Position
  const handleClosePosition = (id: string, reason: any) => {
    marketEngine.closePosition(id, reason);
  };

  // Handle Modifying Position Stop
  const handleUpdateStop = (id: string, newStop: number, newTakeProfit?: number) => {
    marketEngine.updatePositionStop(id, newStop, newTakeProfit);
  };

  // Handle Panic Liquidation
  const handlePanicLiquidate = () => {
    if (confirm('EMERGENCY DEFENSE: Are you sure you want to close ALL active swing positions immediately and lock trading for 60 minutes to prevent further loss?')) {
      marketEngine.panicLiquidateAll('Emergency Manual Lockout Invoked');
      setIsCircuitBreakerModalOpen(true);
      setCircuitBreakerAlertReason('Emergency Manual Lockout initiated by user to protect capital.');
    }
  };

  // Reset Circuit Breaker
  const handleResetCircuitBreaker = () => {
    marketEngine.resetCircuitBreaker();
    setRiskConfig((prev) => ({ ...prev, isCircuitBreakerActive: false, cooldownRemainingMinutes: 0 }));
    setIsCircuitBreakerModalOpen(false);
  };

  // Test Trigger Circuit Breaker
  const handleTestTriggerCircuitBreaker = () => {
    setRiskConfig((prev) => ({ ...prev, isCircuitBreakerActive: true, cooldownRemainingMinutes: 45 }));
    setCircuitBreakerAlertReason('Simulated Drawdown Test: Max daily loss limit (-2.50%) reached.');
    setIsCircuitBreakerModalOpen(true);
  };

  // Manual Cloud Sync
  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    await CloudStorageService.syncToCloud({
      positions,
      closedTrades,
      riskConfig,
      portfolioValue,
      peakEquity: 104500
    });
    setCloudConfig((prev) => ({
      ...prev,
      lastSyncedTimestamp: Date.now(),
      cloudStatus: 'CONNECTED'
    }));
    setIsSyncingCloud(false);
  };

  // Load Trade Brigade Signal into Order Desk
  const handleLoadSignalIntoDesk = (signal: TradeBrigadeSignal) => {
    setSelectedSymbol(signal.symbol);
    setActiveTab('terminal');
  };

  // Watchlist Universe Radar dynamic ticker management
  const handleAddQuote = (quote: AssetQuote) => {
    marketEngine.addAssetQuote(quote);
  };

  const handleEditQuote = (symbol: string, updates: Partial<AssetQuote>) => {
    marketEngine.updateAssetQuote(symbol, updates);
  };

  const handleRemoveQuote = (symbol: string) => {
    marketEngine.removeAssetQuote(symbol);
  };

  // Portfolio Existing Positions & Stocks management
  const handleAddExistingPosition = (posData: any) => {
    marketEngine.addExistingPosition(posData);
  };

  const handleUpdatePosition = (id: string, updates: Partial<Position>) => {
    marketEngine.updatePosition(id, updates);
  };

  const handleRemovePosition = (id: string) => {
    marketEngine.removePosition(id);
  };

  // Load Discord Trade Idea into Order Execution Desk
  const handleLoadIdeaIntoDesk = (idea: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    stopLoss: number;
    takeProfit: number;
  }) => {
    setSelectedSymbol(idea.symbol);
    setActiveTab('terminal');
    setIsDiscordModalOpen(false);
  };

  const currentQuote =
    quotes.find((q) => q.symbol === selectedSymbol) ||
    quotes[0] ||
    INITIAL_MARKET_QUOTES[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        quotes={quotes}
        riskConfig={riskConfig}
        brokerageConfig={brokerageConfig}
        cloudConfig={cloudConfig}
        latencyMs={latencyMs}
        drawdownPercent={drawdownPercent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBrokerageModal={() => setIsBrokerageModalOpen(true)}
        onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
        onPanicLiquidate={handlePanicLiquidate}
        onResetCircuitBreaker={handleResetCircuitBreaker}
        onManualCloudSync={handleManualCloudSync}
        isSyncing={isSyncingCloud}
        isLiveFeedRunning={isLiveFeedRunning}
        onToggleLiveFeed={() => marketEngine.toggleLiveFeed()}
        onForceTick={() => marketEngine.forceTick()}
        lastUpdatedTimestamp={lastUpdatedTimestamp}
      />

      {/* Real-Time Portfolio Performance & Drawdown Mitigation Metrics Bar */}
      <PortfolioOverview
        portfolioValue={portfolioValue}
        dailyPnL={dailyPnL}
        dailyPnLPercent={dailyPnLPercent}
        drawdownPercent={drawdownPercent}
        positions={positions}
        riskConfig={riskConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 max-w-[1700px] w-full mx-auto">
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Column: Watchlist Radar & Candlestick Chart */}
            <div className="lg:col-span-7 space-y-4">
              <InteractiveChart
                quote={currentQuote}
                signals={TRADE_BRIGADE_SIGNALS}
                onQuickTrade={(sym) => setSelectedSymbol(sym)}
                onOpenTradingViewWebhookModal={() => setIsTradingViewModalOpen(true)}
                onOpenDiscordModal={() => setIsDiscordModalOpen(true)}
              />
              <WatchlistSectorRadar
                quotes={quotes}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={(sym) => setSelectedSymbol(sym)}
                onLoadIntoOrderDesk={(sym) => setSelectedSymbol(sym)}
                onAddQuote={handleAddQuote}
                onEditQuote={handleEditQuote}
                onRemoveQuote={handleRemoveQuote}
              />
            </div>

            {/* Right Column: Brokerage Order Execution Desk & Live Positions */}
            <div className="lg:col-span-5 space-y-4">
              <OrderExecutionDesk
                quote={currentQuote}
                allQuotes={quotes}
                portfolioValue={portfolioValue}
                riskConfig={riskConfig}
                brokerageConfig={brokerageConfig}
                onExecuteOrder={handleExecuteOrder}
                onSymbolChange={(sym) => setSelectedSymbol(sym)}
                onUpdateAssetPrice={(sym, newPrice) => marketEngine.updateAssetPrice(sym, newPrice)}
              />
              <PositionsAndJournal
                positions={positions}
                closedTrades={closedTrades}
                quotes={quotes}
                onClosePosition={handleClosePosition}
                onUpdateStop={handleUpdateStop}
                onAddExistingPosition={handleAddExistingPosition}
                onUpdatePosition={handleUpdatePosition}
                onRemovePosition={handleRemovePosition}
                onOpenTradingViewModal={() => setIsTradingViewModalOpen(true)}
              />
            </div>
          </div>
        )}

        {activeTab === 'signals' && (
          <TradeBrigadeFeed
            signals={TRADE_BRIGADE_SIGNALS}
            briefings={PREMARKET_BRIEFINGS}
            onLoadSignalIntoDesk={handleLoadSignalIntoDesk}
          />
        )}

        {activeTab === 'risk' && (
          <RiskMitigationPanel
            riskConfig={riskConfig}
            positions={positions}
            portfolioValue={portfolioValue}
            drawdownPercent={drawdownPercent}
            onUpdateRiskConfig={(newCfg) => {
              setRiskConfig(newCfg);
              marketEngine.updateRiskConfig(newCfg);
            }}
            onTriggerCircuitBreakerTest={handleTestTriggerCircuitBreaker}
            onResetCircuitBreaker={handleResetCircuitBreaker}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestModelEngine
            quotes={quotes}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
          />
        )}

        {activeTab === 'journal' && (
          <div className="space-y-4">
            <PositionsAndJournal
              positions={positions}
              closedTrades={closedTrades}
              quotes={quotes}
              onClosePosition={handleClosePosition}
              onUpdateStop={handleUpdateStop}
              onAddExistingPosition={handleAddExistingPosition}
              onUpdatePosition={handleUpdatePosition}
              onRemovePosition={handleRemovePosition}
              onOpenTradingViewModal={() => setIsTradingViewModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <DrawdownCircuitBreakerModal
        isOpen={isCircuitBreakerModalOpen}
        onClose={() => setIsCircuitBreakerModalOpen(false)}
        reason={circuitBreakerAlertReason}
        drawdownPercent={drawdownPercent}
        riskConfig={riskConfig}
        onReset={handleResetCircuitBreaker}
        onPanicLiquidate={handlePanicLiquidate}
      />

      <BrokerageSettingsModal
        isOpen={isBrokerageModalOpen}
        onClose={() => setIsBrokerageModalOpen(false)}
        brokerageConfig={brokerageConfig}
        cloudConfig={cloudConfig}
        positions={positions}
        closedTrades={closedTrades}
        riskConfig={riskConfig}
        portfolioValue={portfolioValue}
        onUpdateBrokerageConfig={(newCfg) => setBrokerageConfig(newCfg)}
        onUpdateCloudConfig={(newCfg) => setCloudConfig(newCfg)}
        onManualSync={handleManualCloudSync}
        isSyncing={isSyncingCloud}
      />

      <TradingViewWebhookModal
        isOpen={isTradingViewModalOpen}
        onClose={() => setIsTradingViewModalOpen(false)}
        activeSymbol={selectedSymbol}
        activePrice={currentQuote?.price}
        positions={positions}
        quotes={quotes}
        onSimulateWebhookOrder={handleSimulateWebhookOrder}
        onImportTradingViewPosition={handleAddExistingPosition}
      />

      <DiscordLiveModal
        isOpen={isDiscordModalOpen}
        onClose={() => setIsDiscordModalOpen(false)}
        activeSymbol={selectedSymbol}
        activePrice={currentQuote?.price || 114.80}
        onLoadIdeaIntoDesk={handleLoadIdeaIntoDesk}
      />
    </div>
  );
}
