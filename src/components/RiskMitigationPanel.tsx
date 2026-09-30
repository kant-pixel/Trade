import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sliders,
  CheckSquare,
  Activity,
  Zap,
  Flame
} from 'lucide-react';
import { RiskManagementConfig, Position } from '../types/trading';

interface RiskMitigationPanelProps {
  riskConfig: RiskManagementConfig;
  positions: Position[];
  portfolioValue: number;
  drawdownPercent: number;
  onUpdateRiskConfig: (newConfig: RiskManagementConfig) => void;
  onTriggerCircuitBreakerTest: () => void;
  onResetCircuitBreaker: () => void;
}

export const RiskMitigationPanel: React.FC<RiskMitigationPanelProps> = ({
  riskConfig,
  positions,
  portfolioValue,
  drawdownPercent,
  onUpdateRiskConfig,
  onTriggerCircuitBreakerTest,
  onResetCircuitBreaker
}) => {
  const [configDraft, setConfigDraft] = useState<RiskManagementConfig>({ ...riskConfig });
  const [isSaved, setIsSaved] = useState(false);

  // Tilt Prevention Checklist state
  const [checklist, setChecklist] = useState({
    noRevenge: true,
    stopCalculated: true,
    riskUnder1Pct: true,
    setupValidated: true
  });

  const handleSave = () => {
    onUpdateRiskConfig(configDraft);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Calculate stress test scenario
  // If market gaps down 5%, how much capital is lost assuming all stop losses trigger?
  const maxStopLossRisk = positions.reduce((acc, p) => acc + p.riskAmount, 0);
  const maxStopLossRiskPercent = Number(((maxStopLossRisk / portfolioValue) * 100).toFixed(2));

  return (
    <div className="space-y-6 select-none">
      {/* Risk Header & Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-950/80 border border-rose-600/80 rounded-lg text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Automated Risk Defense & Tilt Mitigation Hub
              </h2>
              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-700 px-2 py-0.5 rounded font-mono font-bold">
                Level 1 Capital Shield
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hard stop enforcement • Daily loss circuit breakers • Anti-revenge trading protocols
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {riskConfig.isCircuitBreakerActive ? (
            <button
              onClick={onResetCircuitBreaker}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Reset Circuit Breaker</span>
            </button>
          ) : (
            <button
              onClick={onTriggerCircuitBreakerTest}
              className="bg-slate-800 hover:bg-rose-950 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Drawdown Breaker</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Rules Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Firm Risk Boundaries & Rules
              </h3>
            </div>
            {isSaved && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Parameters Enforced
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Rule 1: Max Risk Per Trade */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-200">Max Risk Per Trade</span>
                <span className="font-mono text-indigo-400 font-bold text-sm">
                  {configDraft.maxRiskPerTradePercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Limits the dollar loss of any single swing to exactly {configDraft.maxRiskPerTradePercent}% ($
                {((portfolioValue * configDraft.maxRiskPerTradePercent) / 100).toFixed(0)}) of equity.
              </p>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.25"
                value={configDraft.maxRiskPerTradePercent}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, maxRiskPerTradePercent: Number(e.target.value) })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Rule 2: Daily Drawdown Limit */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-200">Daily Drawdown Circuit Breaker</span>
                <span className="font-mono text-rose-400 font-bold text-sm">
                  {configDraft.maxDailyDrawdownThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                If daily loss exceeds {configDraft.maxDailyDrawdownThreshold}%, new order entries are automatically locked to stop emotional revenge trading.
              </p>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={configDraft.maxDailyDrawdownThreshold}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, maxDailyDrawdownThreshold: Number(e.target.value) })
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Rule 3: Automated Trailing Stop Default */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-200">Default Trailing Stop Ratchet</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {configDraft.trailingStopDefaultPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Automatically adjusts the stop loss higher as price surges, locking in swing gains.
              </p>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={configDraft.trailingStopDefaultPercent}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, trailingStopDefaultPercent: Number(e.target.value) })
                }
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Rule 4: Total Portfolio Drawdown Limit */}
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-200">Max Peak-to-Trough Drawdown</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {configDraft.maxPortfolioDrawdownThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Permanent emergency brake if cumulative drawdown from high-water mark ever hits {configDraft.maxPortfolioDrawdownThreshold}%.
              </p>
              <input
                type="range"
                min="3.0"
                max="10.0"
                step="0.5"
                value={configDraft.maxPortfolioDrawdownThreshold}
                onChange={(e) =>
                  setConfigDraft({ ...configDraft, maxPortfolioDrawdownThreshold: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
            >
              Apply Firm Risk Limits
            </button>
          </div>
        </div>

        {/* Anti-Tilt Checklist & Stress Test */}
        <div className="space-y-4">
          {/* Pre-Trade Anti-Tilt Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <Flame className="w-4 h-4" />
                <span>Anti-Emotional Tilt Checklist</span>
              </div>
              <span className="text-[10px] text-slate-400">Pre-Flight</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.noRevenge}
                  onChange={(e) => setChecklist({ ...checklist, noRevenge: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                />
                <span>I am completely calm and not trying to make back a recent loss.</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.stopCalculated}
                  onChange={(e) => setChecklist({ ...checklist, stopCalculated: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                />
                <span>My automated stop loss is programmed before pressing submit.</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.riskUnder1Pct}
                  onChange={(e) => setChecklist({ ...checklist, riskUnder1Pct: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                />
                <span>Position size does not exceed 1.0% risk of total account equity.</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.setupValidated}
                  onChange={(e) => setChecklist({ ...checklist, setupValidated: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                />
                <span>Setup satisfies Trade Brigade 8-EMA pullback or SOX breakout rules.</span>
              </label>
            </div>
          </div>

          {/* Real-Time Stress Test Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-300 border-b border-slate-800 pb-1.5 font-sans font-bold">
              <span>Worst-Case Market Gap Stress Test</span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>

            <div className="text-[11px] text-slate-400 font-sans">
              If all open swing positions hit their automated stop-loss simultaneously:
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Total Loss Capped at:</span>
                <span className="text-rose-400 font-bold">-${maxStopLossRisk.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Percent of Equity Lost:</span>
                <span className="text-emerald-400 font-bold">-{maxStopLossRiskPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Remaining Capital:</span>
                <span className="text-white font-bold">${(portfolioValue - maxStopLossRisk).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-sans pt-1">
              With disciplined automated stops, your account will survive any flash crash.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
