import React from 'react';
import { ExternalLink, Zap, Shield, Sparkles, BookOpen } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  onOpenWebhookModal: () => void;
}

// Convert internal symbols to TradingView ticker formats
export function getTradingViewSymbol(symbol: string): string {
  const map: Record<string, string> = {
    'NVDA': 'NASDAQ:NVDA',
    'AMD': 'NASDAQ:AMD',
    'MU': 'NASDAQ:MU',
    'WDC': 'NASDAQ:WDC',
    'STX': 'NASDAQ:STX',
    'TSM': 'NYSE:TSM',
    'ASML': 'NASDAQ:ASML',
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'META': 'NASDAQ:META',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'BTC-USD': 'BINANCE:BTCUSDT',
    'ETH-USD': 'BINANCE:ETHUSDT',
    'VIX': 'CBOE:VIX',
    'VXN': 'CBOE:VXN'
  };
  return map[symbol] || `NASDAQ:${symbol}`;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  onOpenWebhookModal
}) => {
  const tvSymbol = getTradingViewSymbol(symbol);
  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
  
  // Construct secure iframe embed for TradingView Advanced Real-Time Chart
  const embedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0f172a&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=1&popupwidth=1000&popupheight=650&locale=en`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
      {/* Top TradingView Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/20 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold px-2 py-0.5 rounded">
              TradingView Pro
            </span>
            <span className="text-white font-mono font-bold text-sm">{tvSymbol}</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Direct real-time feed with Pine Script &amp; indicator overlays
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Webhook & Pine Script alerts integration */}
          <button
            onClick={onOpenWebhookModal}
            className="flex items-center gap-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-300 hover:text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>TV Webhook &amp; Alerts Setup</span>
          </button>

          {/* Direct link to external TradingView in new tab for paid users */}
          <a
            href={tradingViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1 rounded text-xs transition-colors shadow-sm"
          >
            <span>Open in TradingView</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Chart Container */}
      <div className="w-full h-[460px] bg-slate-950 relative">
        <iframe
          title={`TradingView Advanced Chart - ${tvSymbol}`}
          src={embedUrl}
          className="w-full h-full border-0 overflow-hidden"
          allow="fullscreen"
        />
      </div>

      {/* Pro features notification strip */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Paid Subscription Features: Saved Chart Layouts, Custom Indicators, Volume Profile &amp; Multi-Chart Synced</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> Webhook Auto-Execution Ready
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-indigo-400" /> Pine Script v5 Compatible
          </span>
        </div>
      </div>
    </div>
  );
};
