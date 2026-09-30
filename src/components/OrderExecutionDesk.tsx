import React, { useState, useEffect } from 'react';
import {
  Send,
  Shield,
  Calculator,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Target,
  Sparkles,
  Zap,
  HelpCircle,
  Edit3,
  Check
} from 'lucide-react';
import { AssetQuote, TradeOrder, RiskManagementConfig, BrokerageConfig } from '../types/trading';

interface OrderExecutionDeskProps {
  quote: AssetQuote;
  allQuotes: AssetQuote[];
  portfolioValue: number;
  riskConfig: RiskManagementConfig;
  brokerageConfig: BrokerageConfig;
  onExecuteOrder: (order: Omit<TradeOrder, 'id' | 'status' | 'timestamp'>) => void;
  onSymbolChange: (symbol: string) => void;
  onUpdateAssetPrice?: (symbol: string, newPrice: number) => void;
}

export const OrderExecutionDesk: React.FC<OrderExecutionDeskProps> = ({
  quote,
  allQuotes,
  portfolioValue,
  riskConfig,
  brokerageConfig,
  onExecuteOrder,
  onSymbolChange,
  onUpdateAssetPrice
}) => {
  const activeQuote = quote || allQuotes?.[0] || {
    symbol: 'MU',
    name: 'Micron Technology',
    sector: 'MEMORY_TECH',
    price: 114.8,
    change: 3.2,
    changePercent: 2.87,
    high24h: 116.2,
    low24h: 111.5,
    volume: '28.4M',
    volatilityRank: 82,
    beta: 1.65,
    rsi14: 58.4,
    trend: 'BULLISH',
    timeframeSignals: { '1H': 'BUY', '4H': 'BUY', '1D': 'BUY' },
    keyLevels: { support: 110.0, resistance: 118.5, pivot: 113.8 },
    priceHistory: [108, 110, 109, 112, 114, 113, 114.8]
  };

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<number>(activeQuote.price);
  const [brokerageRoute, setBrokerageRoute] = useState<'ALPACA_PAPER' | 'ALPACA_LIVE' | 'INTERACTIVE_BROKERS' | 'SANDBOX_ENGINE'>('ALPACA_PAPER');

  // Risk Parameters
  const [riskPercent, setRiskPercent] = useState<number>(riskConfig.maxRiskPerTradePercent); // e.g. 1.0%
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    Number((activeQuote.price * (1 - riskConfig.autoStopLossDefaultPercent / 100)).toFixed(2))
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(
    Number((activeQuote.price * (1 + (riskConfig.autoStopLossDefaultPercent * 2.5) / 100)).toFixed(2))
  );
  const [manualShares, setManualShares] = useState<number>(100);
  const [useStrictRiskSizer, setUseStrictRiskSizer] = useState<boolean>(true);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Custom Price Calibration Override
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');

  const handleSaveCustomPrice = (overridePrice?: number) => {
    const val = overridePrice !== undefined ? overridePrice : parseFloat(customPriceInput);
    if (!isNaN(val) && val > 0 && onUpdateAssetPrice) {
      onUpdateAssetPrice(activeQuote.symbol, Number(val.toFixed(2)));
      setIsEditingPrice(false);
      setCustomPriceInput('');
    }
  };

  // Sync default stops when quote changes
  useEffect(() => {
    if (!activeQuote) return;
    setLimitPrice(activeQuote.price);
    const defaultStop = side === 'BUY'
      ? activeQuote.price * (1 - riskConfig.autoStopLossDefaultPercent / 100)
      : activeQuote.price * (1 + riskConfig.autoStopLossDefaultPercent / 100);
    const defaultTarget = side === 'BUY'
      ? activeQuote.price * (1 + (riskConfig.autoStopLossDefaultPercent * 2.5) / 100)
      : activeQuote.price * (1 - (riskConfig.autoStopLossDefaultPercent * 2.5) / 100);

    setStopLossPrice(Number(defaultStop.toFixed(2)));
    setTakeProfitPrice(Number(defaultTarget.toFixed(2)));
  }, [activeQuote.symbol, activeQuote.price, side, riskConfig.autoStopLossDefaultPercent]);

  // Pricing & Execution Math
  const effectiveEntryPrice = orderType === 'LIMIT' ? limitPrice : activeQuote.price;

  // STRICT MANDATORY BRACKET VALIDATION
  // Every trade MUST have both a Stop Loss and a Take Profit with proper directional logic
  const isStopLossEntered = typeof stopLossPrice === 'number' && !isNaN(stopLossPrice) && stopLossPrice > 0;
  const isTakeProfitEntered = typeof takeProfitPrice === 'number' && !isNaN(takeProfitPrice) && takeProfitPrice > 0;

  let bracketValidationError: string | null = null;
  if (!isStopLossEntered) {
    bracketValidationError = 'Mandatory Stop Loss is missing. Every trade must have a defined protective stop.';
  } else if (!isTakeProfitEntered) {
    bracketValidationError = 'Mandatory Take Profit is missing. Every trade must have a defined profit target.';
  } else if (side === 'BUY') {
    if (stopLossPrice >= effectiveEntryPrice) {
      bracketValidationError = `Invalid Stop Loss: For LONG (BUY) orders, Stop Loss ($${stopLossPrice}) must be BELOW entry ($${effectiveEntryPrice}).`;
    } else if (takeProfitPrice <= effectiveEntryPrice) {
      bracketValidationError = `Invalid Take Profit: For LONG (BUY) orders, Take Profit ($${takeProfitPrice}) must be ABOVE entry ($${effectiveEntryPrice}).`;
    }
  } else if (side === 'SELL') {
    if (stopLossPrice <= effectiveEntryPrice) {
      bracketValidationError = `Invalid Stop Loss: For SHORT (SELL) orders, Stop Loss ($${stopLossPrice}) must be ABOVE entry ($${effectiveEntryPrice}).`;
    } else if (takeProfitPrice >= effectiveEntryPrice) {
      bracketValidationError = `Invalid Take Profit: For SHORT (SELL) orders, Take Profit ($${takeProfitPrice}) must be BELOW entry ($${effectiveEntryPrice}).`;
    }
  }

  const isBracketValid = !bracketValidationError && isStopLossEntered && isTakeProfitEntered;

  // Strict Risk Sizing Math
  const dollarRiskBudget = (portfolioValue * riskPercent) / 100;
  const riskPerShare = Math.max(0.05, Math.abs(effectiveEntryPrice - (stopLossPrice || effectiveEntryPrice * 0.98)));
  const calculatedShares = Math.max(1, Math.floor(dollarRiskBudget / riskPerShare));

  const finalShares = useStrictRiskSizer ? calculatedShares : manualShares;
  const totalOrderValue = Number((effectiveEntryPrice * finalShares).toFixed(2));
  const totalDollarRisk = Number((riskPerShare * finalShares).toFixed(2));

  // Risk:Reward calculation
  const potentialProfitPerShare = Math.max(0.01, Math.abs((takeProfitPrice || effectiveEntryPrice * 1.04) - effectiveEntryPrice));
  const riskRewardRatio = Number((potentialProfitPerShare / riskPerShare).toFixed(2));
  const totalPotentialGain = Number((potentialProfitPerShare * finalShares).toFixed(2));

  // One-click Automated Bracket Presets
  const applyBracketPreset = (presetName: 'SWING_1_2' | 'ATR_1_2_5' | 'RUNNER_1_3' | 'SCALP_1_1_5') => {
    let slPct = 2.0;
    let tpPct = 4.0;

    if (presetName === 'SWING_1_2') {
      slPct = 2.0;
      tpPct = 4.0;
    } else if (presetName === 'ATR_1_2_5') {
      slPct = 1.6;
      tpPct = 4.0;
    } else if (presetName === 'RUNNER_1_3') {
      slPct = 1.8;
      tpPct = 5.4;
    } else if (presetName === 'SCALP_1_1_5') {
      slPct = 1.0;
      tpPct = 1.5;
    }

    if (side === 'BUY') {
      setStopLossPrice(Number((effectiveEntryPrice * (1 - slPct / 100)).toFixed(2)));
      setTakeProfitPrice(Number((effectiveEntryPrice * (1 + tpPct / 100)).toFixed(2)));
    } else {
      setStopLossPrice(Number((effectiveEntryPrice * (1 + slPct / 100)).toFixed(2)));
      setTakeProfitPrice(Number((effectiveEntryPrice * (1 - tpPct / 100)).toFixed(2)));
    }
  };

  const handleTransmitOrder = () => {
    if (riskConfig.isCircuitBreakerActive) {
      setExecutionMessage('ORDER BLOCKED: Drawdown Circuit Breaker active. Trading paused to mitigate emotional tilt.');
      return;
    }

    if (!isBracketValid) {
      setExecutionMessage(`ORDER BLOCKED: ${bracketValidationError}`);
      return;
    }

    try {
      onExecuteOrder({
        symbol: activeQuote.symbol,
        side,
        orderType,
        limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
        shares: finalShares,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        brokerageRoute
      });

      setExecutionMessage(
        `OCO Bracket Order transmitted via ${brokerageRoute.replace('_', ' ')}! Enforced SL: $${stopLossPrice} (-$${totalDollarRisk.toFixed(0)}) | TP: $${takeProfitPrice} (+$${totalPotentialGain.toFixed(0)}) | 1:${riskRewardRatio} R:R.`
      );
      setTimeout(() => setExecutionMessage(null), 6000);
    } catch (e: any) {
      setExecutionMessage(`Execution Error: ${e.message}`);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm select-none">
      {/* Header with Mandatory Enforcement Tag */}
      <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Automated Bracket Execution Desk</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-mono uppercase">
                {brokerageRoute.replace('_', ' ')}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Mandatory Take Profit &amp; Stop Loss rules enforced on every order.
            </p>
          </div>
        </div>

        {/* Live R:R Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
            !isBracketValid
              ? 'bg-rose-950/80 border-rose-700 text-rose-300'
              : riskRewardRatio >= 1.5
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-amber-950/80 border-amber-700 text-amber-300'
          }`}
        >
          <Target className="w-3 h-3" />
          <span>{isBracketValid ? `1 : ${riskRewardRatio} R:R` : 'Invalid Bracket'}</span>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Symbol and Buy/Sell Selector */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 block mb-1 font-medium text-[11px]">Symbol Select</label>
            <select
              value={activeQuote.symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full bg-slate-950 text-white font-mono font-bold text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {(allQuotes || []).map((q) => (
                <option key={q.symbol} value={q.symbol}>
                  {q.symbol} - ${q?.price ?? 0} ({q.sector?.replace('_', ' ') || ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium text-[11px]">Side</label>
            <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  side === 'BUY'
                    ? 'bg-emerald-600 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>BUY (LONG)</span>
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                  side === 'SELL'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>SELL (SHORT)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-Time Price Calibration & Override Bar */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px]">Quote Price:</span>
              <span className="font-mono font-bold text-slate-100 text-sm">
                ${activeQuote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  activeQuote.change >= 0
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                    : 'text-rose-400 bg-rose-950/60 border border-rose-800/40'
                }`}
              >
                {activeQuote.change >= 0 ? '+' : ''}
                {activeQuote.changePercent}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsEditingPrice(!isEditingPrice);
                setCustomPriceInput(activeQuote.price.toString());
              }}
              className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-950/60 hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-800/60"
              title="Calibrate this price to match your live broker or exchange quote"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingPrice ? 'Cancel' : 'Adjust / Set Price'}</span>
            </button>
          </div>

          {isEditingPrice && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Enter exact stock price..."
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(e.target.value)}
                  className="flex-1 bg-slate-900 text-white font-mono text-xs px-2.5 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveCustomPrice()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Update</span>
                </button>
              </div>

              {/* Quick Calibration Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSaveCustomPrice(Number(activeQuote.price.toFixed(2)))}
                  className="bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-700/60 transition-colors font-bold"
                >
                  ${activeQuote.price.toFixed(2)} (Market)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomPrice(Number((activeQuote.price * 1.025).toFixed(2)))}
                  className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-2 py-0.5 rounded font-mono border border-slate-700 transition-colors"
                >
                  +2.5% (${(activeQuote.price * 1.025).toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomPrice(Number((activeQuote.price * 0.975).toFixed(2)))}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded font-mono border border-slate-700 transition-colors"
                >
                  -2.5% (${(activeQuote.price * 0.975).toFixed(2)})
                </button>
                <span className="text-slate-500 italic ml-auto text-[10px]">
                  Updates chart, calculations & brackets
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Order Type & Brokerage Route */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 block mb-1 font-medium text-[11px]">Execution Route</label>
            <select
              value={brokerageRoute}
              onChange={(e) => setBrokerageRoute(e.target.value as any)}
              className="w-full bg-slate-950 text-slate-200 font-mono px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALPACA_PAPER">Alpaca Paper (Direct API)</option>
              <option value="ALPACA_LIVE">Alpaca Live Brokerage</option>
              <option value="INTERACTIVE_BROKERS">Interactive Brokers Gateway</option>
              <option value="SANDBOX_ENGINE">Internal Sandbox Engine</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium text-[11px]">Order Type</label>
            <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-1 rounded font-mono text-xs font-semibold ${
                  orderType === 'MARKET' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                MARKET
              </button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`py-1 rounded font-mono text-xs font-semibold ${
                  orderType === 'LIMIT' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>
        </div>

        {/* Shares & Fill Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium text-[11px]">Quantity (Shares)</label>
              {!useStrictRiskSizer && (
                <span className="text-[10px] text-amber-400">Manual Override</span>
              )}
            </div>
            <input
              type="number"
              min="1"
              value={finalShares}
              disabled={useStrictRiskSizer}
              onChange={(e) => setManualShares(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-950 text-slate-100 font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-85"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium text-[11px]">
              {orderType === 'LIMIT' ? 'Limit Price ($)' : 'Est. Fill Price ($)'}
            </label>
            <input
              type="number"
              step="0.01"
              disabled={orderType === 'MARKET'}
              value={orderType === 'MARKET' ? activeQuote.price : limitPrice}
              onChange={(e) => setLimitPrice(Number(e.target.value))}
              className="w-full bg-slate-950 text-slate-100 font-mono px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-75"
            />
          </div>
        </div>

        {/* Position Sizer Calculator (solves emotional 5-year losing streak) */}
        <div className="p-3 bg-indigo-950/30 border border-indigo-800/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs">
              <Calculator className="w-3.5 h-3.5" />
              <span>Disciplined Risk Position Sizer</span>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useStrictRiskSizer}
                onChange={(e) => setUseStrictRiskSizer(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Auto-size to 1% Risk</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Risk Budget</span>
              <div className="flex items-center gap-1 mt-0.5">
                <select
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/60 font-mono text-xs"
                >
                  <option value="0.5">0.5%</option>
                  <option value="1.0">1.0% (Rule)</option>
                  <option value="1.5">1.5%</option>
                  <option value="2.0">2.0% Max</option>
                </select>
                <span className="font-mono text-slate-300">${dollarRiskBudget.toFixed(0)}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block">Risk Per Share</span>
              <span className="font-mono font-semibold text-slate-200 block mt-1">
                ${riskPerShare.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block">Calculated Shares</span>
              <span className="font-mono font-bold text-indigo-300 text-sm block mt-0.5">
                {finalShares.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Mandatory Bracket Presets Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Mandatory Bracket Presets (1-Click Auto Setup)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Enforces TP/SL before transmit</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => applyBracketPreset('SWING_1_2')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-600 px-2 py-1 rounded text-slate-300 transition text-left"
            >
              <div className="font-bold text-indigo-300">1:2 Classic</div>
              <div className="text-[10px] text-slate-400">-2% SL | +4% TP</div>
            </button>

            <button
              type="button"
              onClick={() => applyBracketPreset('ATR_1_2_5')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600 px-2 py-1 rounded text-slate-300 transition text-left"
            >
              <div className="font-bold text-emerald-300">1:2.5 ATR</div>
              <div className="text-[10px] text-slate-400">-1.6% | +4% TP</div>
            </button>

            <button
              type="button"
              onClick={() => applyBracketPreset('RUNNER_1_3')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-600 px-2 py-1 rounded text-slate-300 transition text-left"
            >
              <div className="font-bold text-purple-300">1:3 Runner</div>
              <div className="text-[10px] text-slate-400">-1.8% | +5.4% TP</div>
            </button>

            <button
              type="button"
              onClick={() => applyBracketPreset('SCALP_1_1_5')}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-600 px-2 py-1 rounded text-slate-300 transition text-left"
            >
              <div className="font-bold text-amber-300">1:1.5 Scalp</div>
              <div className="text-[10px] text-slate-400">-1% SL | +1.5% TP</div>
            </button>
          </div>
        </div>

        {/* Stop Loss & Take Profit Mandatory Inputs */}
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-500" />
                <span>Mandatory Stop Loss ($)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                ({(((Math.abs(effectiveEntryPrice - (stopLossPrice || 0))) / effectiveEntryPrice) * 100).toFixed(1)}%)
              </span>
            </div>
            <input
              type="number"
              step="0.05"
              required
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              placeholder="e.g. 112.50"
              className={`w-full bg-slate-950 text-rose-300 font-mono px-3 py-1.5 rounded-lg border font-bold focus:outline-none transition ${
                !isStopLossEntered || (side === 'BUY' && stopLossPrice >= effectiveEntryPrice) || (side === 'SELL' && stopLossPrice <= effectiveEntryPrice)
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-rose-900/80 focus:border-rose-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-500" />
                <span>Mandatory Take Profit ($)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                ({(((Math.abs((takeProfitPrice || 0) - effectiveEntryPrice)) / effectiveEntryPrice) * 100).toFixed(1)}%)
              </span>
            </div>
            <input
              type="number"
              step="0.05"
              required
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
              placeholder="e.g. 119.50"
              className={`w-full bg-slate-950 text-emerald-300 font-mono px-3 py-1.5 rounded-lg border font-bold focus:outline-none transition ${
                !isTakeProfitEntered || (side === 'BUY' && takeProfitPrice <= effectiveEntryPrice) || (side === 'SELL' && takeProfitPrice >= effectiveEntryPrice)
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-emerald-900/80 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Validation Warning Alert if Bracket is invalid */}
        {bracketValidationError && (
          <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-bold">Trade Blocked by Risk Protocol:</div>
              <div className="text-[11px] text-rose-300">{bracketValidationError}</div>
            </div>
          </div>
        )}

        {/* Order Summary & Expected Expectancy Card */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Capital Allocated:</span>
            <span className="text-slate-200 font-semibold">${totalOrderValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Max Capital at Risk (Hard Stop):</span>
            <span className="text-rose-400 font-semibold">-${totalDollarRisk.toFixed(2)} ({riskPercent}%)</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Target Profit (Take Profit):</span>
            <span className="text-emerald-400 font-semibold">+${totalPotentialGain.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800/80 pt-1 text-slate-400">
            <span>Expectancy Ratio:</span>
            <span className={riskRewardRatio >= 1.5 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              1 : {riskRewardRatio} {riskRewardRatio >= 1.5 ? '✓ Positive Expectancy' : '⚠️ Sub-optimal R:R'}
            </span>
          </div>
        </div>

        {/* Execution Message Feedback */}
        {executionMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              executionMessage.includes('BLOCKED') || executionMessage.includes('Error')
                ? 'bg-rose-950/80 border border-rose-600 text-rose-200'
                : 'bg-emerald-950/80 border border-emerald-600 text-emerald-200'
            }`}
          >
            {executionMessage.includes('BLOCKED') ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{executionMessage}</span>
          </div>
        )}

        {/* Submit Button with Strict Bracket Enforcement */}
        <button
          id="btn-transmit-order"
          disabled={riskConfig.isCircuitBreakerActive || !isBracketValid}
          onClick={handleTransmitOrder}
          className={`w-full py-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            riskConfig.isCircuitBreakerActive || !isBracketValid
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : side === 'BUY'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold cursor-pointer'
              : 'bg-rose-600 hover:bg-rose-500 text-white font-extrabold cursor-pointer'
          }`}
        >
          {riskConfig.isCircuitBreakerActive ? (
            <>
              <Lock className="w-4 h-4" />
              <span>TRADING LOCKED BY CIRCUIT BREAKER</span>
            </>
          ) : !isBracketValid ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>TRANSMIT BLOCKED: VALID TP &amp; SL MANDATORY</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                TRANSMIT {side} BRACKET • {finalShares} SHS @ ${effectiveEntryPrice} (1:{riskRewardRatio} R:R)
              </span>
            </>
          )}
        </button>

        {/* Discipline note */}
        <div className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1 font-mono">
          <Shield className="w-3 h-3 text-emerald-500/70" />
          <span>Rule: No naked trades allowed. Every order creates an OCO exit bracket.</span>
        </div>
      </div>
    </div>
  );
};
