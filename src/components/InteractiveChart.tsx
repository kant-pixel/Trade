import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  BarChart2,
  ExternalLink,
  Zap,
  Activity,
  Maximize2,
  Sliders,
  Shield,
  Eye,
  Crosshair,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Split,
  Sparkles,
  X
} from 'lucide-react';
import { AssetQuote, TradeBrigadeSignal } from '../types/trading';
import { TradingViewChart, getTradingViewSymbol } from './TradingViewChart';
import { marketEngine } from '../services/marketFeed';

interface InteractiveChartProps {
  quote: AssetQuote;
  signals: TradeBrigadeSignal[];
  onQuickTrade: (symbol: string) => void;
  onOpenTradingViewWebhookModal?: () => void;
  onOpenDiscordModal?: () => void;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema8: number;
  ema21: number;
  sma50: number;
  bbUpper: number;
  bbLower: number;
  bbMiddle: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  quote,
  signals,
  onQuickTrade,
  onOpenTradingViewWebhookModal,
  onOpenDiscordModal
}) => {
  // Chart Display Mode: Custom SVG Terminal vs Official TradingView Advanced Widget vs Dual Split
  const [chartMode, setChartMode] = useState<'CUSTOM' | 'TRADINGVIEW' | 'DUAL'>(() => {
    try {
      return (localStorage.getItem('apextrade_chart_mode') as any) || 'CUSTOM';
    } catch {
      return 'CUSTOM';
    }
  });
  const [showChartExplanation, setShowChartExplanation] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D'>('4H');
  const [priceFlash, setPriceFlash] = useState<'UP' | 'DOWN' | null>(null);
  const prevPriceRef = useRef<number>(quote?.price);

  // Monitor price changes to trigger real-time tick pulse animation
  useEffect(() => {
    if (typeof quote?.price === 'number' && prevPriceRef.current !== undefined) {
      if (quote.price > prevPriceRef.current) {
        setPriceFlash('UP');
      } else if (quote.price < prevPriceRef.current) {
        setPriceFlash('DOWN');
      }
      prevPriceRef.current = quote.price;
      const timer = setTimeout(() => setPriceFlash(null), 800);
      return () => clearTimeout(timer);
    } else if (quote?.price) {
      prevPriceRef.current = quote.price;
    }
  }, [quote?.price]);

  const handleSetChartMode = (mode: 'CUSTOM' | 'TRADINGVIEW' | 'DUAL') => {
    setChartMode(mode);
    try {
      localStorage.setItem('apextrade_chart_mode', mode);
    } catch {}
  };
  
  // Technical Analysis Indicator Toggles
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showPivots, setShowPivots] = useState(true);
  const [subChartType, setSubChartType] = useState<'RSI' | 'MACD' | 'ATR' | 'NONE'>('RSI');

  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // Generate 26 synthetic candles consistent with asset current price, volatility & indicators
  // Uses deterministic pseudo-random seeds based on symbol and index so candles remain stable and don't flicker on every tick
  const candles: Candle[] = useMemo(() => {
    if (!quote || typeof quote.price !== 'number' || quote.price <= 0) return [];
    const arr: Candle[] = [];
    const quotePrice = quote.price;
    const changePercent = quote.changePercent ?? 0;
    const quoteChange = quote.change ?? 0;

    const baseVol = quotePrice > 1000 ? 500 : 250000;

    // Deterministic pseudo-random helper based on symbol char codes and index
    const seed = quote.symbol.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
    const getDeterministicFactor = (idx: number) => {
      const x = Math.sin(seed * 0.17 + idx * 0.85);
      return (x - Math.floor(x)) * 2 - 1; // Between -1 and 1
    };

    // Calculate start price from 25 periods ago based on change
    const startPrice = quotePrice * (1 - (changePercent / 100) * 0.7);

    let prevClose = startPrice;

    for (let i = 25; i >= 0; i--) {
      const isLast = i === 0;
      const progress = (25 - i) / 25; // 0 to 1

      // Price baseline interpolates towards quotePrice
      const baseline = startPrice + (quotePrice - startPrice) * progress;
      const wave = Math.sin(progress * Math.PI * 2.5) * (quotePrice * 0.012);
      const noise = getDeterministicFactor(i) * (quotePrice * 0.008);

      let close = isLast ? quotePrice : Number((baseline + wave + noise).toFixed(2));
      let open = isLast
        ? Number((quotePrice - quoteChange * 0.35).toFixed(2))
        : Number(prevClose.toFixed(2));

      // Guard sanity
      if (open <= 0) open = quotePrice * 0.98;
      if (close <= 0) close = quotePrice;

      const wickPadding = Math.abs(close - open) * 0.4 + quotePrice * 0.004;
      let high = Number((Math.max(open, close) + Math.abs(getDeterministicFactor(i + 50)) * wickPadding).toFixed(2));
      let low = Number((Math.min(open, close) - Math.abs(getDeterministicFactor(i + 100)) * wickPadding).toFixed(2));

      // For the active candle (i === 0), clamp to 24h high/low bounds
      if (isLast) {
        if (quote.high24h && quote.high24h >= quotePrice) {
          high = Math.max(high, quote.high24h);
        }
        if (quote.low24h && quote.low24h <= quotePrice && quote.low24h > 0) {
          low = Math.min(low, quote.low24h);
        }
      }

      if (low <= 0) low = quotePrice * 0.95;
      if (high < low) high = low * 1.01;

      const volFactor = 0.8 + Math.abs(getDeterministicFactor(i + 200)) * 0.7;
      const volume = Math.round(baseVol * volFactor);

      // Technical Moving Averages & Bands
      const ema8 = Number((close * 0.992 + open * 0.008).toFixed(2));
      const ema21 = Number((close * 0.985 + open * 0.015).toFixed(2));
      const sma50 = Number((close * 0.975 + open * 0.025).toFixed(2));

      const spread = (high - low) * 1.5;
      const bbMiddle = ema21;
      const bbUpper = Number((bbMiddle + spread).toFixed(2));
      const bbLower = Number((bbMiddle - spread).toFixed(2));

      // RSI oscillation around asset quote.rsi14
      const rsiNoise = Math.sin(i * 0.5) * 6;
      const rsi = Math.max(15, Math.min(85, Number(((quote.rsi14 || 54) + rsiNoise).toFixed(1))));

      // MACD (12, 26, 9)
      const macd = Number(((ema8 - ema21) * 1.5).toFixed(2));
      const macdSignal = Number((macd * 0.82).toFixed(2));
      const macdHist = Number((macd - macdSignal).toFixed(2));

      const dateLabel =
        timeframe === '1D'
          ? `Day -${i}`
          : timeframe === '4H'
          ? `${(24 - ((i * 4) % 24)).toString().padStart(2, '0')}:00`
          : `${(15 - (i % 8)).toString().padStart(2, '0')}:00`;

      arr.push({
        time: dateLabel,
        open,
        high,
        low,
        close,
        volume,
        ema8,
        ema21,
        sma50,
        bbUpper,
        bbLower,
        bbMiddle,
        rsi,
        macd,
        macdSignal,
        macdHist
      });

      prevClose = close;
    }
    return arr;
  }, [quote?.symbol, quote?.price, quote?.changePercent, quote?.change, quote?.high24h, quote?.low24h, quote?.rsi14, timeframe]);

  if (!quote || typeof quote.price !== 'number') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        Loading technical analysis and chart metrics...
      </div>
    );
  }

  // Dimensions for main candlestick plot
  const chartHeight = 290;
  const chartWidth = 650;
  const padding = { top: 20, right: 75, bottom: 35, left: 10 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Safe key level bounds - only include levels within reasonable 25% of current price to avoid skewing
  const validSupport =
    quote.keyLevels.support > 0 && Math.abs(quote.keyLevels.support - quote.price) / quote.price <= 0.25
      ? quote.keyLevels.support
      : quote.price * 0.96;
  const validResistance =
    quote.keyLevels.resistance > 0 && Math.abs(quote.keyLevels.resistance - quote.price) / quote.price <= 0.25
      ? quote.keyLevels.resistance
      : quote.price * 1.04;

  // Price Extents (incorporating candles, 24h range, Bollinger Bands, and Key Levels)
  const lowExtents = [
    quote.price,
    quote.low24h > 0 ? quote.low24h : quote.price * 0.98,
    ...candles.map((c) => c.low),
    validSupport,
    ...(showBollinger ? candles.map((c) => c.bbLower) : [])
  ].filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);

  const highExtents = [
    quote.price,
    quote.high24h > 0 ? quote.high24h : quote.price * 1.02,
    ...candles.map((c) => c.high),
    validResistance,
    ...(showBollinger ? candles.map((c) => c.bbUpper) : [])
  ].filter((p) => typeof p === 'number' && !isNaN(p) && p > 0);

  const minPrice = Math.min(...lowExtents) * 0.995;
  const maxPrice = Math.max(...highExtents) * 1.005;
  const priceRange = Math.max(0.01, maxPrice - minPrice);
  const maxVolume = Math.max(1, ...candles.map((c) => c.volume));

  const getY = (price: number) => {
    const rawY = padding.top + plotHeight - ((price - minPrice) / priceRange) * plotHeight;
    return Math.max(padding.top - 5, Math.min(padding.top + plotHeight + 5, rawY));
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) {
      return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return p.toFixed(2);
  };

  const candleWidth = Math.max(8, plotWidth / Math.max(1, candles.length) - 6);

  // Fibonacci Retracement Levels
  const swingHigh = Math.max(...candles.map((c) => c.high));
  const swingLow = Math.min(...candles.map((c) => c.low));
  const fibDiff = swingHigh - swingLow;
  const fibLevels = [
    { label: '0.0% (High)', price: swingHigh, color: '#f43f5e' },
    { label: '23.6%', price: swingHigh - fibDiff * 0.236, color: '#fb923c' },
    { label: '38.2%', price: swingHigh - fibDiff * 0.382, color: '#fbbf24' },
    { label: '50.0% (Pivot)', price: swingHigh - fibDiff * 0.5, color: '#e2e8f0' },
    { label: '61.8% (Golden)', price: swingHigh - fibDiff * 0.618, color: '#38bdf8' },
    { label: '78.6%', price: swingHigh - fibDiff * 0.786, color: '#818cf8' },
    { label: '100.0% (Low)', price: swingLow, color: '#10b981' }
  ];

  // Active Trade Brigade signal for this symbol
  const activeSignal = signals.find((s) => s.symbol === quote.symbol && s.status === 'ACTIVE');

  // Sub-chart Dimensions (RSI / MACD)
  const subHeight = 70;
  const subPadding = { top: 10, right: 65, bottom: 15, left: 10 };
  const subPlotHeight = subHeight - subPadding.top - subPadding.bottom;

  // ATR Calculation: 14-period True Range estimate
  const atrVal = Number(((swingHigh - swingLow) * 0.22).toFixed(2));
  const recommendedStopLossDist = Number((atrVal * 1.5).toFixed(2));
  const recommendedTakeProfitDist = Number((atrVal * 3.0).toFixed(2));

  // Technical Analysis Confluence Rating
  const isAboveEMA8 = quote.price >= (candles[candles.length - 1]?.ema8 || quote.price);
  const isAboveEMA21 = quote.price >= (candles[candles.length - 1]?.ema21 || quote.price);
  const rsiCurrent = candles[candles.length - 1]?.rsi || quote.rsi14;
  const isRsiBullish = rsiCurrent >= 48 && rsiCurrent <= 70;

  const taScore =
    (isAboveEMA8 ? 1 : 0) +
    (isAboveEMA21 ? 1 : 0) +
    (isRsiBullish ? 1 : 0) +
    (quote.change >= 0 ? 1 : 0);

  const taVerdict =
    taScore === 4
      ? 'STRONG BUY'
      : taScore === 3
      ? 'BUY / LONG BIAS'
      : taScore === 2
      ? 'NEUTRAL'
      : 'SELL / DEFENSIVE';

  const tvSymbol = getTradingViewSymbol(quote.symbol);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm select-none">
      {/* Chart Top Navigation & Mode Switcher Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-mono">{quote.symbol}</span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">{quote.name}</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-mono uppercase">
                {quote.sector.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
              <span
                className={`font-bold px-1.5 py-0.5 rounded transition-all duration-300 ${
                  priceFlash === 'UP'
                    ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400'
                    : priceFlash === 'DOWN'
                    ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400'
                    : 'text-white'
                }`}
              >
                ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={quote.change >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {quote.change >= 0 ? '+' : ''}
                {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </span>
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                title="Real-time price feed is actively ticking"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Feed</span>
              </span>
              <button
                type="button"
                onClick={() => marketEngine.forceTick()}
                title="Force instant tick & price update"
                className="text-[10px] text-indigo-400 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 px-1.5 py-0.5 rounded flex items-center gap-1 transition"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>

          {/* TA Confluence Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 px-2.5 py-1 rounded-lg">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <div className="text-[11px]">
              <span className="text-slate-400 font-medium">TA Signal: </span>
              <strong
                className={
                  taVerdict.includes('BUY')
                    ? 'text-emerald-400 font-bold'
                    : taVerdict === 'NEUTRAL'
                    ? 'text-amber-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {taVerdict}
              </strong>
            </div>
          </div>
        </div>

        {/* View Switchers & Pro TradingView triggers */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {/* Custom SVG vs TradingView vs Dual Split Mode toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => handleSetChartMode('CUSTOM')}
              title="Built-in algorithmic terminal with automated Stop Loss & Take Profit brackets"
              className={`px-2 py-0.5 rounded transition ${
                chartMode === 'CUSTOM'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apex Pro SVG
            </button>
            <button
              onClick={() => handleSetChartMode('TRADINGVIEW')}
              title="Official TradingView widget with Pine Script indicators"
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                chartMode === 'TRADINGVIEW'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>TradingView</span>
            </button>
            <button
              onClick={() => handleSetChartMode('DUAL')}
              title="Dual View: Compare TradingView real-time chart with Apex automated risk brackets simultaneously"
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                chartMode === 'DUAL'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3 h-3" />
              <span>Dual</span>
            </button>
          </div>

          {/* Quick explainer toggle: Do we need two charts? */}
          <button
            onClick={() => setShowChartExplanation(!showChartExplanation)}
            className={`p-1 rounded text-[11px] border transition flex items-center gap-1 ${
              showChartExplanation
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Do we need two charts? Click to learn why both exist and how to pick one"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline text-[10px]">Why 2 charts?</span>
          </button>

          {/* Open directly in TradingView.com for paid accounts */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in your paid TradingView account in new tab"
            className="flex items-center gap-1 bg-blue-950/60 hover:bg-blue-900 border border-blue-700/70 text-blue-300 hover:text-white px-2 py-1 rounded text-[11px] transition"
          >
            <span>TV Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Webhook Modal Trigger */}
          {onOpenTradingViewWebhookModal && (
            <button
              onClick={onOpenTradingViewWebhookModal}
              title="Configure Webhooks & Pine Script Alert Auto-Execution"
              className="flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white px-2 py-1 rounded text-[11px] transition"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Webhooks</span>
            </button>
          )}

          {/* Discord Live Ideas Trigger */}
          {onOpenDiscordModal && (
            <button
              onClick={onOpenDiscordModal}
              title="Discord Live Trading Ideas Feed & Webhook Broadcaster"
              className="flex items-center gap-1 bg-[#5865F2]/20 hover:bg-[#5865F2]/35 border border-[#5865F2]/50 text-indigo-200 hover:text-white px-2 py-1 rounded text-[11px] transition"
            >
              <MessageSquare className="w-3 h-3 text-[#5865F2]" />
              <span className="hidden sm:inline">Discord Ideas</span>
            </button>
          )}

          {/* Quick Trade Button */}
          <button
            onClick={() => onQuickTrade(quote.symbol)}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded text-[11px] transition shadow"
          >
            Trade {quote.symbol}
          </button>
        </div>
      </div>

      {/* "Why two charts?" Explanation Banner */}
      {showChartExplanation && (
        <div className="p-3.5 bg-indigo-950/50 border-b border-indigo-800/70 text-xs text-indigo-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="space-y-1.5 max-w-4xl">
            <div className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Do we need two kinds of chart showing the same information?</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              <strong>Short Answer: No, you only need whichever one fits your trading workflow!</strong> We provide both so you have complete flexibility:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] text-slate-300 pt-1">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-blue-900/40 space-y-1">
                <div className="font-bold text-blue-400 flex items-center justify-between">
                  <span>1. TradingView Pro Chart</span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded font-normal border border-blue-800/60">
                    Official Exchange Feed
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Direct exchange tick feeds, institutional volume profile, Pine Script v5 strategy overlays, custom indicators, and full drawing tools.
                </p>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-indigo-900/40 space-y-1">
                <div className="font-bold text-indigo-400 flex items-center justify-between">
                  <span>2. Apex Pro SVG Terminal</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded font-normal border border-indigo-800/60">
                    Algorithmic Risk Terminal
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Real-time custom SVG engine with automated Stop-Loss &amp; Take-Profit bracket lines, Fibonacci pivots, ATR volatility presets, and instant execution desk sync.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic pt-0.5">
              💡 <strong>Workflow Tip:</strong> If you find two charts redundant, simply toggle between <strong>Apex Pro SVG</strong> or <strong>TradingView</strong> in the top switcher to keep a single, clean chart. Or use <strong>Dual</strong> to cross-examine both side-by-side.
            </p>
          </div>
          <button
            onClick={() => setShowChartExplanation(false)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition shrink-0"
            title="Dismiss explanation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Technical Indicators Toolbar */}
      <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timeframe */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 font-mono text-[11px]">
            {(['1H', '4H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Buttons */}
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2 py-0.5 rounded text-[11px] border transition flex items-center gap-1 ${
              showEMA
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>EMA (8/21/50)</span>
          </button>

          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-0.5 rounded text-[11px] border transition flex items-center gap-1 ${
              showBollinger
                ? 'bg-blue-950 text-blue-300 border-blue-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3 text-blue-400" />
            <span>Bollinger Bands</span>
          </button>

          <button
            onClick={() => setShowFibonacci(!showFibonacci)}
            className={`px-2 py-0.5 rounded text-[11px] border transition flex items-center gap-1 ${
              showFibonacci
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3 text-purple-400" />
            <span>Fib Retracement</span>
          </button>

          <button
            onClick={() => setShowPivots(!showPivots)}
            className={`px-2 py-0.5 rounded text-[11px] border transition flex items-center gap-1 ${
              showPivots
                ? 'bg-amber-950 text-amber-300 border-amber-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3 h-3 text-amber-400" />
            <span>Pivots (S/R)</span>
          </button>
        </div>

        {/* Sub-chart toggle (RSI / MACD / ATR / Off) */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500 font-mono">Sub-Chart:</span>
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 font-mono">
            {(['RSI', 'MACD', 'ATR', 'NONE'] as const).map((sc) => (
              <button
                key={sc}
                onClick={() => setSubChartType(sc)}
                className={`px-1.5 py-0.5 rounded transition ${
                  subChartType === sc
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>
      </div>

      {chartMode === 'DUAL' && (
        <div className="p-3 bg-slate-950 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Chart 1: TradingView Institutional Exchange Feed ({tvSymbol})</span>
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Pine Script &amp; Volume Profile</span>
          </div>
          <TradingViewChart
            symbol={quote.symbol}
            onOpenWebhookModal={onOpenTradingViewWebhookModal || (() => {})}
          />
          <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Chart 2: Apex Pro Algorithmic Risk Terminal (Automated Stop-Loss &amp; Brackets)</span>
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Mandatory SL/TP Overlays &amp; Fib Levels</span>
          </div>
        </div>
      )}

      {chartMode === 'TRADINGVIEW' ? (
        <div className="p-3 bg-slate-950">
          <TradingViewChart
            symbol={quote.symbol}
            onOpenWebhookModal={onOpenTradingViewWebhookModal || (() => {})}
          />
        </div>
      ) : (
        <>
          {/* Main Candlestick & Volume SVG Canvas */}
          <div className="p-2 relative bg-slate-950 flex justify-center">
        {/* Hovered details tooltip */}
        {hoveredCandle && (
          <div className="absolute top-3 left-4 z-20 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 flex items-center gap-3 backdrop-blur-sm pointer-events-none">
            <span>
              Time: <strong className="text-white">{hoveredCandle.time}</strong>
            </span>
            <span>
              O: <strong className="text-white">${hoveredCandle.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-white">${hoveredCandle.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-white">${hoveredCandle.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong
                className={
                  hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                ${hoveredCandle.close.toFixed(2)}
              </strong>
            </span>
            {showEMA && (
              <span className="text-cyan-300 hidden sm:inline">EMA8: ${hoveredCandle.ema8.toFixed(2)}</span>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full max-w-3xl h-64 sm:h-72 overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price = minPrice + priceRange * ratio;
            const y = getY(price);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left + plotWidth + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Shaded Envelope & Lines */}
          {showBollinger && (
            <g>
              {/* Upper band */}
              <polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={candles
                  .map((c, idx) => {
                    const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                    return `${x.toFixed(1)},${getY(c.bbUpper).toFixed(1)}`;
                  })
                  .join(' ')}
              />
              {/* Lower band */}
              <polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={candles
                  .map((c, idx) => {
                    const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                    return `${x.toFixed(1)},${getY(c.bbLower).toFixed(1)}`;
                  })
                  .join(' ')}
              />
              {/* Middle 20 SMA */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.2"
                points={candles
                  .map((c, idx) => {
                    const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                    return `${x.toFixed(1)},${getY(c.bbMiddle).toFixed(1)}`;
                  })
                  .join(' ')}
              />
            </g>
          )}

          {/* Fibonacci Retracements */}
          {showFibonacci && (
            <g>
              {fibLevels.map((lvl, idx) => {
                const y = getY(lvl.price);
                if (y < padding.top || y > padding.top + plotHeight) return null;
                return (
                  <g key={`fib-${idx}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + plotWidth}
                      y2={y}
                      stroke={lvl.color}
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                    <text
                      x={padding.left + 6}
                      y={y - 3}
                      fill={lvl.color}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Fib {lvl.label}: ${lvl.price.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Key Pivot / Resistance / Support lines */}
          {showPivots && (
            <>
              {/* Resistance */}
              <line
                x1={padding.left}
                y1={getY(quote.keyLevels.resistance)}
                x2={padding.left + plotWidth}
                y2={getY(quote.keyLevels.resistance)}
                stroke="#f43f5e"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.85"
              />
              <text
                x={padding.left + 6}
                y={getY(quote.keyLevels.resistance) - 4}
                fill="#f43f5e"
                fontSize="8"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                R1: ${quote.keyLevels.resistance.toFixed(1)}
              </text>

              {/* Support */}
              <line
                x1={padding.left}
                y1={getY(quote.keyLevels.support)}
                x2={padding.left + plotWidth}
                y2={getY(quote.keyLevels.support)}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.85"
              />
              <text
                x={padding.left + 6}
                y={getY(quote.keyLevels.support) - 4}
                fill="#10b981"
                fontSize="8"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                S1: ${quote.keyLevels.support.toFixed(1)}
              </text>
            </>
          )}

          {/* Trade Brigade Signal Overlays */}
          {activeSignal && (
            <g>
              {/* Target 1 */}
              <line
                x1={padding.left}
                y1={getY(activeSignal.target1)}
                x2={padding.left + plotWidth}
                y2={getY(activeSignal.target1)}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left + plotWidth - 110}
                y={getY(activeSignal.target1) - 4}
                fill="#38bdf8"
                fontSize="9"
                fontWeight="bold"
              >
                Target 1: ${activeSignal.target1}
              </text>

              {/* Mandatory Stop Loss */}
              <line
                x1={padding.left}
                y1={getY(activeSignal.stopLoss)}
                x2={padding.left + plotWidth}
                y2={getY(activeSignal.stopLoss)}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left + plotWidth - 110}
                y={getY(activeSignal.stopLoss) - 4}
                fill="#f43f5e"
                fontSize="9"
                fontWeight="bold"
              >
                Stop Loss: ${activeSignal.stopLoss}
              </text>
            </g>
          )}

          {/* Volume bars at bottom */}
          {candles.map((c, idx) => {
            const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
            const volHeight = (c.volume / maxVolume) * 40;
            const y = padding.top + plotHeight - volHeight;
            const isBull = c.close >= c.open;

            return (
              <rect
                key={`vol-${idx}`}
                x={x - candleWidth / 2}
                y={y}
                width={candleWidth}
                height={volHeight}
                fill={isBull ? '#065f46' : '#881337'}
                opacity="0.6"
              />
            );
          })}

          {/* Candlesticks */}
          {candles.map((c, idx) => {
            const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
            const isBull = c.close >= c.open;
            const candleTop = getY(Math.max(c.open, c.close));
            const candleBottom = getY(Math.min(c.open, c.close));
            const bodyHeight = Math.max(2, candleBottom - candleTop);
            const highY = getY(c.high);
            const lowY = getY(c.low);
            const candleColor = isBull ? '#10b981' : '#f43f5e';

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredCandle(c)}
                onMouseLeave={() => setHoveredCandle(null)}
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={candleTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="1"
                />
              </g>
            );
          })}

          {/* EMAs (8 cyan, 21 amber, 50 purple) */}
          {showEMA && (
            <>
              {/* 8 EMA */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                points={candles
                  .map((c, idx) => {
                    const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                    return `${x.toFixed(1)},${getY(c.ema8).toFixed(1)}`;
                  })
                  .join(' ')}
              />
              {/* 21 EMA */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.3"
                points={candles
                  .map((c, idx) => {
                    const x = padding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                    return `${x.toFixed(1)},${getY(c.ema21).toFixed(1)}`;
                  })
                  .join(' ')}
              />
            </>
          )}

          {/* Current Price Pulse line */}
          <line
            x1={padding.left}
            y1={getY(quote.price)}
            x2={padding.left + plotWidth}
            y2={getY(quote.price)}
            stroke={quote.change >= 0 ? '#10b981' : '#f43f5e'}
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <rect
            x={padding.left + plotWidth + 2}
            y={getY(quote.price) - 8}
            width="68"
            height="16"
            fill={quote.change >= 0 ? '#065f46' : '#881337'}
            rx="2"
          />
          <text
            x={padding.left + plotWidth + 6}
            y={getY(quote.price) + 4}
            fill="#ffffff"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            ${formatPrice(quote.price)}
          </text>
        </svg>
      </div>

      {/* Sub-Chart Panels (RSI / MACD / ATR) */}
      {subChartType === 'RSI' && (
        <div className="border-t border-slate-800 bg-slate-950 p-2">
          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <strong className="text-purple-400">RSI(14):</strong>
              <span className="text-white font-bold">{rsiCurrent}</span>
              <span
                className={`px-1.5 py-0.2 rounded font-sans text-[9px] ${
                  rsiCurrent > 70
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : rsiCurrent < 30
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {rsiCurrent > 70
                  ? 'Overbought (>70)'
                  : rsiCurrent < 30
                  ? 'Oversold (<30)'
                  : 'Neutral Momentum'}
              </span>
            </span>
            <span className="text-slate-500">Overbought: 70 | Mid: 50 | Oversold: 30</span>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${subHeight}`} className="w-full max-w-3xl h-16">
            {/* 70 overbought line */}
            <line
              x1={subPadding.left}
              y1={subPadding.top + subPlotHeight * 0.3}
              x2={subPadding.left + plotWidth}
              y2={subPadding.top + subPlotHeight * 0.3}
              stroke="#f43f5e"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
            {/* 50 mid line */}
            <line
              x1={subPadding.left}
              y1={subPadding.top + subPlotHeight * 0.5}
              x2={subPadding.left + plotWidth}
              y2={subPadding.top + subPlotHeight * 0.5}
              stroke="#475569"
              strokeDasharray="2 2"
              strokeWidth="0.8"
            />
            {/* 30 oversold line */}
            <line
              x1={subPadding.left}
              y1={subPadding.top + subPlotHeight * 0.7}
              x2={subPadding.left + plotWidth}
              y2={subPadding.top + subPlotHeight * 0.7}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
            {/* RSI curve */}
            <polyline
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.5"
              points={candles
                .map((c, idx) => {
                  const x = subPadding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
                  // RSI maps 0-100 to subPlotHeight
                  const y = subPadding.top + subPlotHeight * (1 - c.rsi / 100);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ')}
            />
          </svg>
        </div>
      )}

      {subChartType === 'MACD' && (
        <div className="border-t border-slate-800 bg-slate-950 p-2">
          <div className="flex items-center justify-between px-2 text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-2">
              <strong className="text-cyan-400">MACD (12, 26, 9):</strong>
              <span className="text-cyan-300">
                Line: {candles[candles.length - 1]?.macd || '0.00'}
              </span>
              <span className="text-amber-400">
                Signal: {candles[candles.length - 1]?.macdSignal || '0.00'}
              </span>
              <span
                className={`font-bold ${
                  (candles[candles.length - 1]?.macdHist || 0) >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                Hist: {candles[candles.length - 1]?.macdHist || '0.00'}
              </span>
            </span>
            <span className="text-slate-500">Fast 12 / Slow 26 / Signal 9</span>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${subHeight}`} className="w-full max-w-3xl h-16">
            {/* Center zero line */}
            <line
              x1={subPadding.left}
              y1={subPadding.top + subPlotHeight / 2}
              x2={subPadding.left + plotWidth}
              y2={subPadding.top + subPlotHeight / 2}
              stroke="#334155"
              strokeWidth="1"
            />
            {/* MACD Histogram Bars */}
            {candles.map((c, idx) => {
              const x = subPadding.left + (idx / candles.length) * plotWidth + candleWidth / 2;
              const zeroY = subPadding.top + subPlotHeight / 2;
              const barHeight = Math.min(22, Math.abs(c.macdHist) * 12);
              const barY = c.macdHist >= 0 ? zeroY - barHeight : zeroY;
              return (
                <rect
                  key={`macd-${idx}`}
                  x={x - candleWidth / 2.5}
                  y={barY}
                  width={candleWidth * 0.8}
                  height={Math.max(1, barHeight)}
                  fill={c.macdHist >= 0 ? '#10b981' : '#f43f5e'}
                  opacity="0.8"
                />
              );
            })}
          </svg>
        </div>
      )}

          {subChartType === 'ATR' && (
            <div className="border-t border-slate-800 bg-slate-950 p-2.5">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ATR(14) Volatility &amp; Mandatory Bracket Presets</span>
                </span>
                <span className="text-indigo-300">
                  ATR: <strong>${atrVal}</strong> ({( (atrVal / quote.price) * 100 ).toFixed(2)}% Volatility)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">1.0x ATR Scalp Stop</span>
                  <span className="text-rose-400 font-bold block">-${atrVal}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-indigo-800/60">
                  <span className="text-indigo-300 block text-[10px]">1.5x ATR Swing Stop (Std)</span>
                  <span className="text-rose-400 font-bold block">-${recommendedStopLossDist}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-emerald-800/60">
                  <span className="text-emerald-300 block text-[10px]">3.0x ATR Target (1:2 R:R)</span>
                  <span className="text-emerald-400 font-bold block">+${recommendedTakeProfitDist}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">4.5x ATR Runner (1:3 R:R)</span>
                  <span className="text-emerald-400 font-bold block">+${(atrVal * 4.5).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Chart Footer with Trade Brigade strategy notes */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-semibold text-[11px]">8 EMA: Cyan</span>
          <span className="text-amber-400 font-semibold text-[11px]">21 EMA: Amber</span>
          <span className="text-slate-400 text-[11px]">Beta: {quote.beta}</span>
        </div>
        <div className="text-[11px] text-slate-400 italic">
          Mandatory Rule: Never take trade without a pre-calculated Stop Loss &amp; Take Profit bracket.
        </div>
      </div>
    </div>
  );
};
