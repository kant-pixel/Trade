import React from 'react';
import { ShieldAlert, AlertTriangle, Lock, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { RiskManagementConfig } from '../types/trading';

interface DrawdownCircuitBreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  drawdownPercent: number;
  riskConfig: RiskManagementConfig;
  onReset: () => void;
  onPanicLiquidate: () => void;
}

export const DrawdownCircuitBreakerModal: React.FC<DrawdownCircuitBreakerModalProps> = ({
  isOpen,
  onClose,
  reason,
  drawdownPercent,
  riskConfig,
  onReset,
  onPanicLiquidate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-rose-600/90 rounded-xl shadow-2xl max-w-lg w-full p-6 text-slate-100 overflow-hidden relative">
        {/* Glow effect */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-600/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-lg text-rose-400 shrink-0">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
                Automatic Risk Mitigation
              </span>
              <span className="text-xs font-mono text-slate-400">Protocol §4.2</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1">
              Drawdown Circuit Breaker Engaged
            </h2>
          </div>
        </div>

        <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-sm text-rose-200 leading-relaxed font-sans">
          <p className="font-semibold text-rose-100 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Emotional Tilt Mitigation Triggered:</span>
          </p>
          <p className="text-xs text-rose-300/90 mt-1">
            {reason || `Current drawdown reached ${drawdownPercent}%, breaching your risk rule of ${riskConfig.maxDailyDrawdownThreshold}%.`}
          </p>
        </div>

        <div className="mt-4 space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Order Entry Locked:</strong> No new swing or day orders can be submitted during the cooldown period.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Active Stops Remain Live:</strong> All existing stop-loss and trailing stops are actively managed by the high-speed feed.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">5-Year Discipline Reflection:</strong> Step away from the screen for at least 30 minutes to eliminate revenge trading impulses.
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            id="btn-modal-panic"
            onClick={onPanicLiquidate}
            className="w-full sm:w-auto bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            Emergency Liquidate All Swings
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-modal-close"
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Acknowledge & Monitor
            </button>
            <button
              id="btn-modal-reset"
              onClick={() => {
                onReset();
                onClose();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Override & Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
