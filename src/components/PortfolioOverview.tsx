import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertOctagon,
  Percent,
  Layers,
  Activity,
  Award
} from 'lucide-react';
import { Position, RiskManagementConfig } from '../types/trading';

interface PortfolioOverviewProps {
  portfolioValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  drawdownPercent: number;
  positions: Position[];
  riskConfig: RiskManagementConfig;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({
  portfolioValue,
  dailyPnL,
  dailyPnLPercent,
  drawdownPercent,
  positions,
  riskConfig
}) => {
  const peakEquity = 104500;
  const isDailyPnLPositive = dailyPnL >= 0;

  // Calculate total capital at risk from open positions
  const totalOpenRisk = positions.reduce((sum, p) => sum + p.riskAmount, 0);
  const totalOpenRiskPercent = Number(((totalOpenRisk / portfolioValue) * 100).toFixed(2));

  // Memory sector exposure calculation (specifically highlighted per user request)
  const memoryExposure = positions
    .filter((p) => ['MU', 'WDC', 'STX'].includes(p.symbol))
    .reduce((sum, p) => sum + p.allocatedCapital, 0);
  const memoryExposurePercent = Number(((memoryExposure / portfolioValue) * 100).toFixed(1));

  // SOX tech exposure
  const soxExposure = positions
    .filter((p) => ['NVDA', 'AMD', 'TSM', 'ASML', 'MU', 'WDC', 'STX'].includes(p.symbol))
    .reduce((sum, p) => sum + p.allocatedCapital, 0);
  const soxExposurePercent = Number(((soxExposure / portfolioValue) * 100).toFixed(1));

  // Risk gauge color
  const isNearDrawdownLimit = drawdownPercent >= riskConfig.maxDailyDrawdownThreshold * 0.75;
  const isBreached = drawdownPercent >= riskConfig.maxDailyDrawdownThreshold;

  return (
    <section className="bg-slate-900 border-b border-slate-800 px-4 py-3.5 select-none">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Net Liquidating Value */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Net Liquidation</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-white">
            ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Peak: ${peakEquity.toLocaleString()}</span>
            <span className="text-slate-500 font-mono">1.0x</span>
          </div>
        </div>

        {/* Metric 2: Today's P&L */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Today's P&L</span>
            {isDailyPnLPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono tracking-tight ${
              isDailyPnLPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isDailyPnLPositive ? '+' : ''}
            ${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono mt-1 flex items-center justify-between">
            <span className={isDailyPnLPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isDailyPnLPositive ? '+' : ''}
              {dailyPnLPercent.toFixed(2)}%
            </span>
            <span className="text-slate-500 text-[10px]">vs Prev Close</span>
          </div>
        </div>

        {/* Metric 3: Real-Time Drawdown vs Risk Limit */}
        <div
          className={`p-3 rounded-lg border transition-colors ${
            isBreached
              ? 'bg-rose-950/40 border-rose-600/80'
              : isNearDrawdownLimit
              ? 'bg-amber-950/30 border-amber-600/60'
              : 'bg-slate-950/70 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Drawdown from Peak</span>
            {isBreached ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <Percent className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono tracking-tight ${
              isBreached ? 'text-rose-400' : isNearDrawdownLimit ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            -{drawdownPercent.toFixed(2)}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isBreached ? 'bg-rose-500' : isNearDrawdownLimit ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, (drawdownPercent / riskConfig.maxDailyDrawdownThreshold) * 100)}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
            <span>Threshold: {riskConfig.maxDailyDrawdownThreshold}%</span>
            <span className={isBreached ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              {isBreached ? 'BREACHED' : 'SAFE'}
            </span>
          </div>
        </div>

        {/* Metric 4: Total Open Capital At Risk */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Open Stop Risk</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-200">
            ${totalOpenRisk.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-emerald-400 font-mono font-medium">{totalOpenRiskPercent}% Equity</span>
            <span className="text-slate-500 text-[10px]">Rule: Max 2.5%</span>
          </div>
        </div>

        {/* Metric 5: Semiconductor & Memory Sector Focus */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">SOX & Memory Weight</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-cyan-300">
            {soxExposurePercent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-cyan-400/90 font-mono">Memory: {memoryExposurePercent}%</span>
            <span className="text-slate-500 text-[10px]">MU/WDC</span>
          </div>
        </div>

        {/* Metric 6: Strategy Discipline Rating */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Discipline Score</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-amber-300 flex items-center gap-1">
            <span>4.8</span>
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-emerald-400 font-medium">96% Stops Followed</span>
            <span className="text-slate-500 text-[10px]">5-Yr Fix</span>
          </div>
        </div>
      </div>
    </section>
  );
};
