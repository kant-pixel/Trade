import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Cloud,
  AlertTriangle,
  Sliders,
  Radio,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { AssetQuote, RiskManagementConfig, BrokerageConfig, CloudDatabaseConfig } from '../types/trading';

interface HeaderProps {
  quotes: AssetQuote[];
  riskConfig: RiskManagementConfig;
  brokerageConfig: BrokerageConfig;
  cloudConfig: CloudDatabaseConfig;
  latencyMs: number;
  drawdownPercent: number;
  activeTab: 'terminal' | 'signals' | 'risk' | 'backtest' | 'journal';
  setActiveTab: (tab: 'terminal' | 'signals' | 'risk' | 'backtest' | 'journal') => void;
  onOpenBrokerageModal: () => void;
  onOpenDiscordModal?: () => void;
  onPanicLiquidate: () => void;
  onResetCircuitBreaker: () => void;
  onManualCloudSync: () => void;
  isSyncing: boolean;
  isLiveFeedRunning?: boolean;
  onToggleLiveFeed?: () => void;
  onForceTick?: () => void;
  lastUpdatedTimestamp?: number;
}

export const Header: React.FC<HeaderProps> = ({
  quotes,
  riskConfig,
  brokerageConfig,
  cloudConfig,
  latencyMs,
  drawdownPercent,
  activeTab,
  setActiveTab,
  onOpenBrokerageModal,
  onOpenDiscordModal,
  onPanicLiquidate,
  onResetCircuitBreaker,
  onManualCloudSync,
  isSyncing,
  isLiveFeedRunning = true,
  onToggleLiveFeed,
  onForceTick,
  lastUpdatedTimestamp
}) => {
  // Highlight ticker symbols: VIX, BTC-USD, MU, NVDA, SP100 / AAPL
  const tickerItems = (quotes || []).filter(
    (q) => q && typeof q.price === 'number' && ['VIX', 'VXN', 'MU', 'WDC', 'NVDA', 'BTC-USD', 'ETH-USD'].includes(q.symbol)
  );

  const formattedTime = lastUpdatedTimestamp
    ? new Date(lastUpdatedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Live';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Real-time Ticker Ticker Bar */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs overflow-x-auto gap-6 scrollbar-none">
        <div className="flex items-center gap-2 shrink-0 font-medium">
          <span className="flex h-2 w-2 relative">
            {isLiveFeedRunning ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
          </span>
          <span className={`tracking-wider uppercase font-semibold text-[11px] ${isLiveFeedRunning ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isLiveFeedRunning ? 'Live Stream (1.2s)' : 'Feed Paused'}
          </span>
          <span className="font-mono text-slate-600">|</span>
          <span className="font-mono text-[11px] text-slate-400" title="Last tick time">
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center gap-5 shrink-0 overflow-x-auto">
          {tickerItems.map((q) => {
            const isPos = q.change >= 0;
            const isVix = q.symbol.startsWith('V');
            return (
              <div key={q.symbol} className="flex items-center gap-1.5 font-mono text-[12px]">
                <span className={`font-semibold ${isVix ? 'text-amber-400' : 'text-slate-200'}`}>{q.symbol}</span>
                <span className="text-slate-300">${(q?.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`flex items-center text-[11px] font-medium ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                  {isPos ? '+' : ''}
                  {q.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-400">
          {/* Tick Now Button */}
          {onForceTick && (
            <button
              id="btn-force-tick"
              onClick={onForceTick}
              className="flex items-center gap-1 text-indigo-300 hover:text-white transition-colors bg-indigo-950/70 hover:bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-700/60"
              title="Force an immediate price tick update"
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>Tick Now</span>
            </button>
          )}

          {/* Toggle Stream */}
          {onToggleLiveFeed && (
            <button
              id="btn-toggle-feed"
              onClick={onToggleLiveFeed}
              className={`flex items-center gap-1 transition-colors px-2 py-0.5 rounded border ${
                isLiveFeedRunning
                  ? 'text-slate-300 hover:text-white bg-slate-800/80 border-slate-700/60'
                  : 'text-amber-300 bg-amber-950/60 border-amber-800/70'
              }`}
              title={isLiveFeedRunning ? 'Pause live market simulator' : 'Resume live market simulator'}
            >
              <Radio className={`w-3 h-3 ${isLiveFeedRunning ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>{isLiveFeedRunning ? 'Streaming' : 'Resume'}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5" title="Execution feed latency">
            <span>Latency:</span>
            <span className="text-emerald-400 font-semibold">{latencyMs}ms</span>
          </div>

          <button
            id="btn-cloud-sync"
            onClick={onManualCloudSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
            title="Sync portfolio & journal to Cloud Database"
          >
            <Cloud className={`w-3 h-3 ${cloudConfig.cloudStatus === 'CONNECTED' ? 'text-sky-400' : 'text-amber-400'}`} />
            <span>Cloud DB</span>
            <RefreshCw className={`w-2.5 h-2.5 ml-0.5 ${isSyncing ? 'animate-spin text-sky-300' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {/* Main Top Navigation & System Status */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-2 rounded-lg shadow-md border border-indigo-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-display">ApexTrade Pro</h1>
              <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 text-[10px] uppercase font-semibold px-2 py-0.5 rounded tracking-wide">
                Institutional Desk
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Disciplined Swing Trading • Drawdown Mitigation • Trade Brigade Signal Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            id="nav-tab-terminal"
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'terminal'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Command Desk
          </button>
          <button
            id="nav-tab-signals"
            onClick={() => setActiveTab('signals')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'signals'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Trade Brigade</span>
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              Live
            </span>
          </button>
          <button
            id="nav-tab-risk"
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-1.5 rounded transition-all flex items-center gap-1 ${
              activeTab === 'risk'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Risk & Drawdown</span>
          </button>
          <button
            id="nav-tab-backtest"
            onClick={() => setActiveTab('backtest')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'backtest'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Backtest & Models
          </button>
          <button
            id="nav-tab-journal"
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'journal'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discipline Journal
          </button>
        </div>

        {/* Right Action Bar: Circuit Breaker Status & Emergency Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Circuit Breaker Status Indicator */}
          {riskConfig.isCircuitBreakerActive ? (
            <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-600/80 text-rose-200 px-2.5 py-1 rounded text-xs animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div>
                <div className="font-bold text-[11px] leading-tight">CIRCUIT BREAKER ENGAGED</div>
                <div className="text-[10px] text-rose-300">New orders blocked ({riskConfig.cooldownRemainingMinutes}m cooldown)</div>
              </div>
              <button
                id="btn-reset-cb"
                onClick={onResetCircuitBreaker}
                className="ml-1 bg-rose-800 hover:bg-rose-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-700/40 text-emerald-300 px-2.5 py-1 rounded text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Risk Protocol: <strong className="text-emerald-400">Strict 1% Guard</strong></span>
            </div>
          )}

          {/* Panic Liquidation Button with double confirmation safeguard */}
          <button
            id="btn-panic-liquidate"
            onClick={onPanicLiquidate}
            className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 hover:text-white px-2.5 py-1.5 rounded text-xs font-semibold transition-all shadow-sm"
            title="Emergency protection: Immediately closes all positions and locks trading to stop drawdown spirals"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Emergency Lockout</span>
          </button>

          {/* Discord Live Trading Ideas Button */}
          <button
            id="btn-discord-live"
            onClick={onOpenDiscordModal}
            className="flex items-center gap-1.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/50 text-indigo-200 hover:text-white px-2.5 py-1.5 rounded text-xs font-semibold transition-all shadow-sm"
            title="Discord Live Trading Ideas & Webhook Broadcast"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
            <span className="hidden sm:inline">Discord Live</span>
          </button>

          {/* Brokerage & Database Config button */}
          <button
            id="btn-open-settings"
            onClick={onOpenBrokerageModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
            title="Configure Brokerage API (Alpaca / IBKR) and Cloud DB"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-[11px] hidden sm:inline">{brokerageConfig.provider.replace('_', ' ')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
