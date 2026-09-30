import React from 'react';
import {
  MessageSquare,
  PlayCircle,
  ExternalLink,
  Target,
  Shield,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Zap,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { TradeBrigadeSignal, PreMarketBriefing } from '../types/trading';

interface TradeBrigadeFeedProps {
  signals: TradeBrigadeSignal[];
  briefings: PreMarketBriefing[];
  onLoadSignalIntoDesk: (signal: TradeBrigadeSignal) => void;
}

export const TradeBrigadeFeed: React.FC<TradeBrigadeFeedProps> = ({
  signals,
  briefings,
  onLoadSignalIntoDesk
}) => {
  const latestBriefing = briefings[0];

  return (
    <div className="space-y-6 select-none">
      {/* Daily Pre-Market YouTube Video & Strategy Breakdown */}
      {latestBriefing && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-950/80 border border-rose-600/80 rounded-lg text-rose-400">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                    Trade Brigade Daily Premarket Analysis
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.2 rounded font-mono">
                    {latestBriefing.date} • {latestBriefing.videoDuration}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                  {latestBriefing.title}
                </h3>
              </div>
            </div>

            <a
              href={latestBriefing.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </a>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Pivot Levels & Macro Sentiment */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Key Premarket Pivots</span>
                <Target className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">S&P 500 Pivot</span>
                  <span className="text-emerald-400 font-bold text-sm">${latestBriefing.sp500Pivot}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">QQQ Pivot</span>
                  <span className="text-indigo-400 font-bold text-sm">${latestBriefing.qqqPivot}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-300">
                <strong className="text-cyan-400">SOX Semiconductor:</strong> {latestBriefing.soxKeyLevel}
              </div>
            </div>

            {/* Sector Playbook & Memory Focus */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Sector Focus & Memory Thesis</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Memory (MU / WDC):</strong> {latestBriefing.memorySectorNote}
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-amber-400">Crypto Correlation:</strong> {latestBriefing.cryptoCorrelationNote}
              </p>
            </div>

            {/* Actionable Setups Checklist */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400 font-semibold border-b border-slate-800 pb-1.5">
                <span>Morning Action Checklist</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {latestBriefing.actionableSetups.map((setup, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{setup}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Discord Live Trading Signals Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Trade Brigade Discord • #swing-alerts Feed
            </h3>
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.2 rounded-full text-[10px] font-mono font-semibold">
              Live Stream
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Automated Stop & Target Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {signals.map((sig) => {
            const isLong = sig.direction === 'LONG';
            const isMemory = ['MU', 'WDC', 'STX'].includes(sig.symbol);

            return (
              <div
                key={sig.id}
                className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-white font-mono">{sig.symbol}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          isLong
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {sig.direction} SWING
                      </span>
                      {isMemory && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
                          MEMORY LEADER
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{sig.timestamp}</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {sig.rationale}
                  </p>
                </div>

                {/* Level parameters */}
                <div className="grid grid-cols-4 gap-2 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 text-center font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Entry</span>
                    <span className="text-slate-100 font-bold">${sig.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-rose-400 text-[10px] block">Stop Loss</span>
                    <span className="text-rose-400 font-bold">${sig.stopLoss}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 text-[10px] block">Target 1</span>
                    <span className="text-emerald-400 font-bold">${sig.target1}</span>
                  </div>
                  <div>
                    <span className="text-indigo-400 text-[10px] block">R:R Ratio</span>
                    <span className="text-indigo-300 font-bold">{sig.riskRewardRatio} : 1</span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px] text-slate-400">
                    Channel: <strong className="text-slate-300">{sig.sourceChannel}</strong>
                  </div>

                  <button
                    onClick={() => onLoadSignalIntoDesk(sig)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                  >
                    <span>Execute Signal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
