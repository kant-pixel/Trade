import React, { useState } from 'react';
import {
  X,
  Zap,
  Copy,
  Check,
  Code,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Sliders,
  Terminal,
  Layers,
  Upload,
  Download,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { getTradingViewSymbol } from './TradingViewChart';
import { Position, AssetQuote } from '../types/trading';

interface TradingViewWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol: string;
  activePrice?: number;
  positions?: Position[];
  quotes?: AssetQuote[];
  onSimulateWebhookOrder: (orderPayload: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    stopLoss: number;
    takeProfit: number;
    shares: number;
  }) => void;
  onImportTradingViewPosition?: (posData: any) => void;
}

export const TradingViewWebhookModal: React.FC<TradingViewWebhookModalProps> = ({
  isOpen,
  onClose,
  activeSymbol,
  activePrice,
  positions = [],
  quotes = [],
  onSimulateWebhookOrder,
  onImportTradingViewPosition
}) => {
  const [activeTab, setActiveTab] = useState<'PORTFOLIO_SYNC' | 'WEBHOOK_ALERTS' | 'PINE_SCRIPT' | 'SIMULATOR'>('PORTFOLIO_SYNC');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testNotification, setTestNotification] = useState<string | null>(null);

  // Portfolio Sync states
  const [tvUsername, setTvUsername] = useState<string>('trader_pro');
  const [connectedBroker, setConnectedBroker] = useState<string>('TradingView Paper Trading');
  const [isTvLinked, setIsTvLinked] = useState<boolean>(true);
  const [pasteInput, setPasteInput] = useState<string>('NASDAQ:NVDA, 50, 138.45\nNASDAQ:MU, 100, 114.80\nNASDAQ:AMD, 40, 154.20');
  const [importNotification, setImportNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const tvSymbol = getTradingViewSymbol(activeSymbol);
  const webhookUrl = `${window.location.origin}/api/v1/tradingview/webhook`;
  const secretKey = 'apex_tv_sec_994821a';

  // Sample JSON payload for TradingView Webhook alert message
  const sampleJsonAlert = `{
  "secret": "${secretKey}",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "stopLoss": {{plot_0}},
  "takeProfit": {{plot_1}},
  "riskPercent": 1.0,
  "shares": {{strategy.order.contracts}},
  "comment": "Trade Brigade automated swing bracket"
}`;

  // Pine Script snippet for strategy alert
  const pineScriptSnippet = `//@version=5
strategy("ApexTrade Automated Swing Bracket", overlay=true, margin_long=100, margin_short=100)

// 1. Calculate Technical Moving Averages & Volatility
fastEMA = ta.ema(close, 8)
slowEMA = ta.ema(close, 21)
atrVal  = ta.atr(14)

// 2. Entry Conditions (e.g. 8 EMA bounce continuation)
longCondition = ta.crossover(fastEMA, slowEMA) and close > ta.sma(close, 50)
shortCondition = ta.crossunder(fastEMA, slowEMA) and close < ta.sma(close, 50)

// 3. MANDATORY BRACKET STOPS: Enforce Stop Loss & Take Profit on every trade
longStopLoss   = close - (atrVal * 1.5)
longTakeProfit = close + (atrVal * 3.0) // 1:2 Risk to Reward

if (longCondition)
    strategy.entry("Long Entry", strategy.long)
    strategy.exit("Bracket Exit", "Long Entry", stop=longStopLoss, limit=longTakeProfit)
    
    // Webhook message sent to your ApexTrade Dashboard
    alert('{"secret":"${secretKey}","ticker":"' + syminfo.ticker + '","action":"BUY","price":' + str.tostring(close) + ',"stopLoss":' + str.tostring(longStopLoss) + ',"takeProfit":' + str.tostring(longTakeProfit) + '}', alert.freq_once_per_bar_close)`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleRunSimulation = () => {
    const basePrice = activePrice && activePrice > 0 ? activePrice : 114.80;
    const sl = Number((basePrice * 0.975).toFixed(2));
    const tp = Number((basePrice * 1.05).toFixed(2));
    const shares = Math.max(1, Math.round(10000 / basePrice));

    onSimulateWebhookOrder({
      symbol: activeSymbol,
      side: 'BUY',
      price: basePrice,
      stopLoss: sl,
      takeProfit: tp,
      shares: shares
    });

    setTestNotification(`Simulated TradingView Webhook alert received for ${activeSymbol}! Order queued with mandatory SL: $${sl} and TP: $${tp} (1:2 R:R, ${shares} shs).`);
    setTimeout(() => setTestNotification(null), 5000);
  };

  // Generate exported TradingView Watchlist format from dashboard positions
  const exportToTvWatchlist = () => {
    if (!positions || positions.length === 0) {
      return 'NASDAQ:NVDA, NASDAQ:MU, NASDAQ:AMD';
    }
    const set = new Set<string>();
    positions.forEach((p) => {
      set.add(getTradingViewSymbol(p.symbol));
    });
    return Array.from(set).join(', ');
  };

  // Import parsed positions from TradingView text/CSV
  const handleImportParsedPositions = () => {
    if (!onImportTradingViewPosition) {
      alert('Position import handler not ready');
      return;
    }

    const lines = pasteInput.split('\n').filter((l) => l.trim().length > 0);
    let count = 0;

    lines.forEach((line) => {
      // Formats: "NASDAQ:NVDA, 50, 138.45" OR "NVDA" OR "NVDA, 100"
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length > 0 && parts[0]) {
        let sym = parts[0].replace(/^(NASDAQ:|NYSE:|BINANCE:|CBOE:)/, '').toUpperCase();
        let shares = parts[1] ? parseFloat(parts[1]) : 50;
        let entry = parts[2] ? parseFloat(parts[2]) : 0;

        if (isNaN(shares) || shares <= 0) shares = 50;

        // Find quote for current price
        const quote = quotes.find((q) => q.symbol.toUpperCase() === sym);
        if (!entry || isNaN(entry) || entry <= 0) {
          entry = quote ? quote.price : 100;
        }

        const sl = Number((entry * 0.96).toFixed(2));
        const tp = Number((entry * 1.08).toFixed(2));

        onImportTradingViewPosition({
          symbol: sym,
          name: quote?.name || `${sym} Corp`,
          sector: quote?.sector || 'SOX_TECH',
          side: 'LONG',
          shares: shares,
          entryPrice: entry,
          currentPrice: quote ? quote.price : entry,
          stopLoss: sl,
          takeProfit: tp,
          trailingStopPercent: 3.0,
          notes: `Imported from TradingView (${connectedBroker})`,
          addToRadar: true
        });
        count++;
      }
    });

    setImportNotification(`Successfully imported ${count} position(s) from TradingView into your active Portfolio!`);
    setTimeout(() => setImportNotification(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>TradingView Portfolio &amp; Webhook Integration Hub</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded uppercase font-mono">
                  {isTvLinked ? 'Connected' : 'Ready to Link'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Link your TradingView portfolio, sync watchlists &amp; auto-execute swing orders with mandatory brackets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-semibold px-4 pt-1 gap-2">
          <button
            onClick={() => setActiveTab('PORTFOLIO_SYNC')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'PORTFOLIO_SYNC'
                ? 'border-blue-500 text-white font-bold bg-slate-900/80 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Link Portfolio &amp; Watchlist</span>
          </button>
          <button
            onClick={() => setActiveTab('WEBHOOK_ALERTS')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'WEBHOOK_ALERTS'
                ? 'border-blue-500 text-white font-bold bg-slate-900/80 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Webhook Endpoints</span>
          </button>
          <button
            onClick={() => setActiveTab('PINE_SCRIPT')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'PINE_SCRIPT'
                ? 'border-blue-500 text-white font-bold bg-slate-900/80 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
            <span>Pine Script v5</span>
          </button>
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'SIMULATOR'
                ? 'border-blue-500 text-white font-bold bg-slate-900/80 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Order Simulator</span>
          </button>
        </div>

        {/* Tab 1: Link Portfolio & Watchlist Sync */}
        {activeTab === 'PORTFOLIO_SYNC' && (
          <div className="p-5 space-y-5 text-xs text-slate-300">
            {importNotification && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-600 rounded-lg text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{importNotification}</span>
              </div>
            )}

            {/* TradingView Account Link Status */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white text-sm">TradingView Account Connection</span>
                </div>
                <span className="text-[11px] text-blue-400 font-mono bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
                  Connected Bridge
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">TradingView Username / Handle</label>
                  <input
                    type="text"
                    value={tvUsername}
                    onChange={(e) => setTvUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. swing_trader_apex"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Connected Trading Broker</label>
                  <select
                    value={connectedBroker}
                    onChange={(e) => setConnectedBroker(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-white font-mono text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="TradingView Paper Trading">TradingView Paper Trading (Simulated)</option>
                    <option value="Interactive Brokers (IBKR)">Interactive Brokers (IBKR Connected)</option>
                    <option value="TradeStation">TradeStation (API Bridge)</option>
                    <option value="Tradovate / NinjaTrader">Tradovate / Futures Bridge</option>
                    <option value="Alpaca Trading">Alpaca Paper / Live Bridge</option>
                    <option value="Binance / OKX Crypto">Binance / Crypto Spot &amp; Futures</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Import TradingView Positions & Watchlist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Import TradingView Positions / Watchlist</span>
                </h3>
                <span className="text-[11px] text-slate-400">Paste tickers or CSV data</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Exported positions from your TradingView paper account or broker can be imported here instantly. Enter lines as <code className="text-emerald-400 font-mono">SYMBOL, SHARES, PRICE</code> or simple comma-separated tickers.
              </p>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => setPasteInput('NASDAQ:NVDA, 50, 138.45\nNASDAQ:MU, 100, 114.80\nNASDAQ:AMD, 40, 154.20\nNASDAQ:TSM, 35, 182.40')}
                  className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-0.5 rounded border border-slate-700 transition"
                >
                  Tech &amp; Semis (NVDA, MU, AMD, TSM)
                </button>
                <button
                  type="button"
                  onClick={() => setPasteInput('NASDAQ:MU, 120, 114.80\nNASDAQ:WDC, 80, 68.50\nNASDAQ:STX, 60, 95.00')}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 transition"
                >
                  Memory Sector (MU, WDC, STX)
                </button>
              </div>

              <textarea
                rows={4}
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-emerald-400 focus:outline-none focus:border-blue-500"
                placeholder="NASDAQ:NVDA, 50, 138.45&#10;NASDAQ:MU, 100, 114.80"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 italic">
                  * Each imported position will automatically receive a mandatory 1.5x ATR stop loss bracket.
                </span>
                <button
                  type="button"
                  onClick={handleImportParsedPositions}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import into Active Portfolio</span>
                </button>
              </div>
            </div>

            {/* Export Dashboard Positions to TradingView Watchlist format */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Export Active Portfolio to TradingView Watchlist</span>
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(exportToTvWatchlist(), 'tv_export')}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold text-xs"
                >
                  {copiedSection === 'tv_export' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'tv_export' ? 'Copied Watchlist!' : 'Copy TV Watchlist'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Copy this list and paste into TradingView’s <strong>Watchlist &gt; Import List</strong> to synchronize your chart symbols with current open holdings:
              </p>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-cyan-300 truncate">
                {exportToTvWatchlist()}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Webhook Alerts */}
        {activeTab === 'WEBHOOK_ALERTS' && (
          <div className="p-5 space-y-5 text-xs text-slate-300">
            {/* Status banner */}
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-blue-200">How paid TradingView works best with this setup:</div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Paid TradingView tiers (Essential, Plus, Premium) unlock <strong>server-side Webhook Alerts</strong>. When your Pine Script strategy or custom indicator triggers an alert, TradingView sends a sub-second HTTP POST request to this dashboard, executing your trade with your configured Stop Loss and Take Profit brackets.
                </p>
              </div>
            </div>

            {/* Configuration Parameters */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>1. Your Webhook Endpoint &amp; Security Passphrase</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Webhook URL (Paste into TradingView alert)</span>
                    <button
                      onClick={() => handleCopy(webhookUrl, 'url')}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                    >
                      {copiedSection === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'url' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[11px] truncate">
                    {webhookUrl}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Webhook Passphrase Token</span>
                    <button
                      onClick={() => handleCopy(secretKey, 'token')}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                    >
                      {copiedSection === 'token' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'token' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-amber-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[11px] truncate">
                    {secretKey}
                  </div>
                </div>
              </div>
            </div>

            {/* Webhook JSON Payload Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span>2. TradingView Alert Message JSON (Includes Mandatory TP/SL)</span>
                </h3>
                <button
                  onClick={() => handleCopy(sampleJsonAlert, 'json')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs font-medium"
                >
                  {copiedSection === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'json' ? 'Copied JSON' : 'Copy Alert Message'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] p-3 rounded-lg overflow-x-auto leading-relaxed">
                {sampleJsonAlert}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Pine Script v5 Strategy */}
        {activeTab === 'PINE_SCRIPT' && (
          <div className="p-5 space-y-4 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Pine Script v5 Automated Bracket Strategy</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Paste this into TradingView Pine Editor to run automated swing entries with 1.5x ATR stops &amp; 3x ATR profit targets.
                </p>
              </div>
              <button
                onClick={() => handleCopy(pineScriptSnippet, 'pinescript')}
                className="text-purple-400 hover:text-purple-300 bg-purple-950/60 border border-purple-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
              >
                {copiedSection === 'pinescript' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'pinescript' ? 'Copied Code' : 'Copy Pine Script'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] p-4 rounded-lg overflow-x-auto max-h-[380px] leading-relaxed">
              {pineScriptSnippet}
            </pre>
          </div>
        )}

        {/* Tab 4: Simulator */}
        {activeTab === 'SIMULATOR' && (
          <div className="p-5 space-y-4 text-xs text-slate-300">
            {testNotification && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-600 rounded-lg text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testNotification}</span>
              </div>
            )}

            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Test TradingView Webhook Signal Simulator</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Simulate an incoming TradingView signal for <strong>{activeSymbol} ({tvSymbol})</strong> with strict bracket Stop Loss &amp; Take Profit.
                  </p>
                </div>
                <button
                  onClick={handleRunSimulation}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Execute Simulated Webhook Trade</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-2">
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Symbol</span>
                  <span className="text-white font-bold">{activeSymbol} ({tvSymbol})</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Sample Entry</span>
                  <span className="text-emerald-400 font-bold">${(activePrice || 114.80).toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Enforced Stop Loss</span>
                  <span className="text-rose-400 font-bold">${((activePrice || 114.80) * 0.975).toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Take Profit Target</span>
                  <span className="text-cyan-400 font-bold">${((activePrice || 114.80) * 1.05).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>TradingView Pro Integration active with real-time portfolio synchronizer</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
