import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  XCircle,
  Edit2,
  Edit3,
  Trash2,
  Plus,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  X,
  Check,
  DollarSign,
  Layers
} from 'lucide-react';
import { Position, ClosedTrade, AssetQuote, SectorCategory } from '../types/trading';

interface PositionsAndJournalProps {
  positions: Position[];
  closedTrades: ClosedTrade[];
  quotes?: AssetQuote[];
  onClosePosition: (id: string, reason: any) => void;
  onUpdateStop: (id: string, newStop: number, newTakeProfit?: number) => void;
  onAddExistingPosition?: (positionData: any) => void;
  onUpdatePosition?: (id: string, updates: Partial<Position>) => void;
  onRemovePosition?: (id: string) => void;
  onOpenTradingViewModal?: () => void;
}

export const PositionsAndJournal: React.FC<PositionsAndJournalProps> = ({
  positions,
  closedTrades,
  quotes = [],
  onClosePosition,
  onUpdateStop,
  onAddExistingPosition,
  onUpdatePosition,
  onRemovePosition,
  onOpenTradingViewModal
}) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'JOURNAL'>('POSITIONS');

  // Quick inline edit of stop/target
  const [editingStopPosId, setEditingStopPosId] = useState<string | null>(null);
  const [tempStop, setTempStop] = useState<number>(0);
  const [tempTarget, setTempTarget] = useState<number>(0);

  // Add Existing Position Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formSymbol, setFormSymbol] = useState('');
  const [formName, setFormName] = useState('');
  const [formSector, setFormSector] = useState<SectorCategory>('SOX_TECH');
  const [formSide, setFormSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [formShares, setFormShares] = useState('50');
  const [formEntryPrice, setFormEntryPrice] = useState('140.00');
  const [formCurrentPrice, setFormCurrentPrice] = useState('145.00');
  const [formStopLoss, setFormStopLoss] = useState('133.00');
  const [formTakeProfit, setFormTakeProfit] = useState('154.00');
  const [formTrailingStop, setFormTrailingStop] = useState('2.5');
  const [formNotes, setFormNotes] = useState('Existing stock holding in portfolio');
  const [formAddToRadar, setFormAddToRadar] = useState(true);

  // Edit Position Modal state
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editShares, setEditShares] = useState('');
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  const [editTakeProfit, setEditTakeProfit] = useState('');
  const [editTrailingStop, setEditTrailingStop] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenAddModal = (prefillSymbol?: string) => {
    const sym = (prefillSymbol || 'NVDA').toUpperCase();
    const matchedQuote = quotes.find((q) => q.symbol.toUpperCase() === sym);
    const curPrice = matchedQuote ? matchedQuote.price : 140.00;
    const entry = Number((curPrice * 0.96).toFixed(2));

    setFormSymbol(sym);
    setFormName(matchedQuote?.name || `${sym} Inc`);
    setFormSector(matchedQuote?.sector || 'SOX_TECH');
    setFormSide('LONG');
    setFormShares('50');
    setFormEntryPrice(entry.toString());
    setFormCurrentPrice(curPrice.toString());
    setFormStopLoss((entry * 0.95).toFixed(2));
    setFormTakeProfit((entry * 1.10).toFixed(2));
    setFormTrailingStop('2.5');
    setFormNotes(`Existing ${sym} holding imported into portfolio`);
    setFormAddToRadar(true);
    setIsAddModalOpen(true);
  };

  const handleSymbolChange = (sym: string) => {
    const upper = sym.toUpperCase();
    setFormSymbol(upper);
    const matchedQuote = quotes.find((q) => q.symbol.toUpperCase() === upper);
    if (matchedQuote) {
      setFormName(matchedQuote.name);
      setFormSector(matchedQuote.sector);
      setFormCurrentPrice(matchedQuote.price.toString());
      const ep = parseFloat(formEntryPrice) || matchedQuote.price;
      setFormStopLoss((ep * 0.95).toFixed(2));
      setFormTakeProfit((ep * 1.10).toFixed(2));
    }
  };

  const handleEntryPriceChange = (val: string) => {
    setFormEntryPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (formSide === 'LONG') {
        setFormStopLoss((num * 0.95).toFixed(2));
        setFormTakeProfit((num * 1.10).toFixed(2));
      } else {
        setFormStopLoss((num * 1.05).toFixed(2));
        setFormTakeProfit((num * 0.90).toFixed(2));
      }
    }
  };

  const handleApplyRiskPreset = (stopPercent: number, targetPercent: number) => {
    const entry = parseFloat(formEntryPrice) || parseFloat(formCurrentPrice) || 100;
    if (formSide === 'LONG') {
      setFormStopLoss((entry * (1 - stopPercent / 100)).toFixed(2));
      setFormTakeProfit((entry * (1 + targetPercent / 100)).toFixed(2));
    } else {
      setFormStopLoss((entry * (1 + stopPercent / 100)).toFixed(2));
      setFormTakeProfit((entry * (1 - targetPercent / 100)).toFixed(2));
    }
  };

  const handleSaveAddPosition = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = formSymbol.trim().toUpperCase();
    const sharesNum = parseFloat(formShares);
    const entryNum = parseFloat(formEntryPrice);
    const curPriceNum = parseFloat(formCurrentPrice) || entryNum;
    const slNum = parseFloat(formStopLoss);
    const tpNum = parseFloat(formTakeProfit);
    const trailNum = parseFloat(formTrailingStop) || 2.5;

    if (!sym || isNaN(sharesNum) || sharesNum <= 0 || isNaN(entryNum) || entryNum <= 0) {
      return;
    }

    if (onAddExistingPosition) {
      onAddExistingPosition({
        symbol: sym,
        name: formName || `${sym} Holding`,
        sector: formSector,
        side: formSide,
        shares: sharesNum,
        entryPrice: entryNum,
        currentPrice: curPriceNum,
        stopLoss: !isNaN(slNum) && slNum > 0 ? slNum : undefined,
        takeProfit: !isNaN(tpNum) && tpNum > 0 ? tpNum : undefined,
        trailingStopPercent: trailNum,
        notes: formNotes,
        addToRadar: formAddToRadar
      });
    }

    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (pos: Position) => {
    setEditingPosition(pos);
    setEditShares(pos.shares.toString());
    setEditEntryPrice(pos.entryPrice.toString());
    setEditStopLoss(pos.stopLoss.toString());
    setEditTakeProfit(pos.takeProfit.toString());
    setEditTrailingStop(pos.trailingStopPercent ? pos.trailingStopPercent.toString() : '2.5');
    setEditNotes(pos.notes || '');
  };

  const handleSaveEditPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition) return;

    const sharesNum = parseFloat(editShares) || editingPosition.shares;
    const entryNum = parseFloat(editEntryPrice) || editingPosition.entryPrice;
    const slNum = parseFloat(editStopLoss) || editingPosition.stopLoss;
    const tpNum = parseFloat(editTakeProfit) || editingPosition.takeProfit;
    const trailNum = parseFloat(editTrailingStop) || 2.5;

    if (onUpdatePosition) {
      onUpdatePosition(editingPosition.id, {
        shares: sharesNum,
        entryPrice: entryNum,
        stopLoss: slNum,
        takeProfit: tpNum,
        trailingStopPercent: trailNum,
        notes: editNotes
      });
    }

    setEditingPosition(null);
  };

  const handleDeletePosition = (posId: string, sym: string) => {
    if (confirm(`Remove position ${sym} from portfolio?`)) {
      if (onRemovePosition) {
        onRemovePosition(posId);
      }
    }
  };

  const startEditStop = (pos: Position) => {
    setEditingStopPosId(pos.id);
    setTempStop(pos.stopLoss);
    setTempTarget(pos.takeProfit);
  };

  const saveEditStop = (posId: string) => {
    onUpdateStop(posId, tempStop, tempTarget);
    setEditingStopPosId(null);
  };

  // Metrics on discipline
  const tradesFollowedPlan = closedTrades.filter((t) => t.adheredToPlan).length;
  const adherenceRate =
    closedTrades.length > 0 ? Math.round((tradesFollowedPlan / closedTrades.length) * 100) : 100;

  const avgDisciplineRating =
    closedTrades.length > 0
      ? (
          closedTrades.reduce((acc, t) => acc + t.emotionalDisciplineRating, 0) /
          closedTrades.length
        ).toFixed(1)
      : '5.0';

  // Calculations for live preview in Add modal
  const previewShares = parseFloat(formShares) || 0;
  const previewEntry = parseFloat(formEntryPrice) || 0;
  const previewCurrent = parseFloat(formCurrentPrice) || previewEntry;
  const previewSL = parseFloat(formStopLoss) || 0;
  const previewInvested = previewShares * previewEntry;
  const previewCurVal = previewShares * previewCurrent;
  const previewPnL = (previewCurrent - previewEntry) * previewShares * (formSide === 'LONG' ? 1 : -1);
  const previewPnLPct = previewEntry > 0 ? (previewPnL / previewInvested) * 100 : 0;
  const previewRisk = previewSL > 0 ? Math.abs(previewCurrent - previewSL) * previewShares : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col select-none">
      {/* Tabs & Add Position Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'POSITIONS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Live Portfolio &amp; Positions ({positions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'JOURNAL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Discipline Journal &amp; 5-Yr Fix</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'POSITIONS' && (
            <div className="flex items-center gap-1.5">
              {onOpenTradingViewModal && (
                <button
                  type="button"
                  onClick={onOpenTradingViewModal}
                  className="bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 transition shadow-sm"
                  title="Link TradingView Portfolio, import positions or sync paper trading"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Link TradingView</span>
                </button>
              )}
              <button
                onClick={() => handleOpenAddModal()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 transition shadow-sm"
                title="Add an existing stock holding or position from another broker"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>
          )}

          {activeTab === 'JOURNAL' && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                Rule Adherence: <strong className="text-emerald-400">{adherenceRate}%</strong>
              </span>
              <span className="text-slate-400">
                Discipline:{' '}
                <strong className="text-amber-400">{avgDisciplineRating}/5.0</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-0 overflow-x-auto">
        {activeTab === 'POSITIONS' ? (
          positions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-3">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="max-w-md mx-auto">
                No active stock or swing positions currently tracked in your portfolio.
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Your First Existing Stock Position</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Position</th>
                  <th className="py-2.5 px-2 text-right">Shares</th>
                  <th className="py-2.5 px-2 text-right">Entry / Current</th>
                  <th className="py-2.5 px-2 text-right">Unrealized P&amp;L</th>
                  <th className="py-2.5 px-2 text-right">Stop Loss / Trailing</th>
                  <th className="py-2.5 px-2 text-right">Take Profit</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {positions.map((pos) => {
                  const isPos = pos.unrealizedPnL >= 0;
                  const isEditingInline = editingStopPosId === pos.id;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              pos.side === 'LONG'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {pos.side}
                          </span>
                          <span className="font-bold text-white text-xs">{pos.symbol}</span>
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            (${pos.allocatedCapital.toLocaleString()})
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right text-slate-200">
                        {pos.shares}
                      </td>

                      <td className="py-2.5 px-2 text-right">
                        <div className="text-slate-300 font-semibold">
                          ${pos.currentPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Entry: ${pos.entryPrice.toFixed(2)}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right">
                        <div className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                        </div>
                        <div className={`text-[10px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-right">
                        {isEditingInline ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={tempStop}
                              onChange={(e) => setTempStop(Number(e.target.value))}
                              className="w-16 bg-slate-950 text-rose-300 text-xs px-1 py-0.5 rounded border border-rose-600 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="text-rose-400 font-bold">${pos.stopLoss.toFixed(2)}</span>
                            {pos.trailingStopPercent && (
                              <span className="text-[10px] text-slate-400 block">
                                Trail: {pos.trailingStopPercent}%
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-2 text-right">
                        {isEditingInline ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={tempTarget}
                              onChange={(e) => setTempTarget(Number(e.target.value))}
                              className="w-16 bg-slate-950 text-emerald-300 text-xs px-1 py-0.5 rounded border border-emerald-600 focus:outline-none"
                            />
                            <button
                              onClick={() => saveEditStop(pos.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-bold">${pos.takeProfit.toFixed(2)}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => handleOpenEditModal(pos)}
                            className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit Shares, Entry or Stops"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePosition(pos.id, pos.symbol)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Remove from Portfolio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onClosePosition(pos.id, 'MANUAL')}
                            className="flex items-center gap-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 px-2 py-1 rounded text-[10px] font-semibold border border-slate-700 transition-colors"
                            title="Close & Liquidate to Discipline Journal"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          /* Discipline Journal for Trader with 5 Years of Losses */
          <div className="p-4 space-y-4">
            <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-lg p-3 text-xs text-slate-300 flex items-start gap-3">
              <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">5-Year Loss Reversal Protocol:</strong>
                <p className="mt-0.5 text-slate-400">
                  Uncontrolled drawdowns occur when traders widen stops, move stops away, or take revenge positions after a losing trade. In this dashboard, every stop loss is automated and non-negotiable. Review your discipline rating below.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {closedTrades.map((t) => {
                const isWin = t.realizedPnL >= 0;
                return (
                  <div
                    key={t.id}
                    className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{t.symbol}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            t.side === 'LONG'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {t.side}
                        </span>
                        <span className="text-[10px] text-slate-400">Held: {t.holdingPeriod}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 rounded">
                          Exit: {t.exitReason.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] italic">"{t.notes}"</div>
                    </div>

                    <div className="flex items-center gap-4 text-right font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">Realized P&amp;L</div>
                        <div className={`font-bold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.realizedPnL.toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-center">
                        <div className="text-[9px] text-slate-500">Plan Adherence</div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          {t.adheredToPlan ? (
                            <span className="text-emerald-400 flex items-center gap-0.5 font-sans text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-0.5 font-sans text-[10px]">
                              <AlertCircle className="w-3 h-3" /> No
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Existing Holding / Stock Position */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Existing Stock Holding to Portfolio</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Popular Ticker Chips */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Quick Select Popular Holdings:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['NVDA', 'AAPL', 'AMD', 'MU', 'WDC', 'MSFT', 'TSLA', 'PLTR', 'COIN', 'BTC-USD'].map(
                  (sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSymbolChange(sym)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                        formSymbol === sym
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      }`}
                    >
                      {sym}
                    </button>
                  )
                )}
              </div>
            </div>

            <form onSubmit={handleSaveAddPosition} className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Ticker Symbol</label>
                  <input
                    type="text"
                    required
                    value={formSymbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                    placeholder="e.g. AAPL"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase focus:border-indigo-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Side</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setFormSide('LONG')}
                      className={`py-1 text-center font-bold text-xs rounded transition ${
                        formSide === 'LONG'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSide('SHORT')}
                      className={`py-1 text-center font-bold text-xs rounded transition ${
                        formSide === 'SHORT'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Sector</label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value as SectorCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="MEMORY_SECTOR">Memory (MU/WDC)</option>
                    <option value="SOX_TECH">SOX Tech (NVDA/AMD)</option>
                    <option value="SP100_LEADERS">S&amp;P 100 Leaders</option>
                    <option value="CRYPTO">Crypto (BTC/ETH)</option>
                    <option value="VOLATILITY">Volatility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Shares / Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formShares}
                    onChange={(e) => setFormShares(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Buy / Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formEntryPrice}
                    onChange={(e) => handleEntryPriceChange(e.target.value)}
                    placeholder="e.g. 135.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-400 mb-1">Current Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCurrentPrice}
                    onChange={(e) => setFormCurrentPrice(e.target.value)}
                    placeholder="e.g. 145.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-emerald-400 font-mono focus:border-indigo-500 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Stop Loss & Take Profit Risk Brackets */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Risk Protection Brackets (Automated Discipline)</span>
                  </span>

                  {/* 1-Click R:R Presets */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-500">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyRiskPreset(3, 6)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                    >
                      -3%/+6%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyRiskPreset(5, 10)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                    >
                      -5%/+10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyRiskPreset(8, 16)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                    >
                      -8%/+16%
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-rose-400 mb-1">Stop Loss ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formStopLoss}
                      onChange={(e) => setFormStopLoss(e.target.value)}
                      placeholder="e.g. 130.00"
                      className="w-full bg-slate-900 border border-rose-900/60 rounded p-1.5 text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-emerald-400 mb-1">Take Profit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTakeProfit}
                      onChange={(e) => setFormTakeProfit(e.target.value)}
                      placeholder="e.g. 155.00"
                      className="w-full bg-slate-900 border border-emerald-900/60 rounded p-1.5 text-emerald-300 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Trailing Stop (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formTrailingStop}
                      onChange={(e) => setFormTrailingStop(e.target.value)}
                      placeholder="2.5"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Position Metric Preview */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">Cost Basis</div>
                  <div className="text-xs font-bold text-slate-200">
                    ${previewInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Current Value</div>
                  <div className="text-xs font-bold text-white">
                    ${previewCurVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Unrealized P&amp;L</div>
                  <div
                    className={`text-xs font-bold ${
                      previewPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {previewPnL >= 0 ? '+' : ''}
                    ${previewPnL.toFixed(2)} ({previewPnL >= 0 ? '+' : ''}
                    {previewPnLPct.toFixed(1)}%)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Total Risk</div>
                  <div className="text-xs font-bold text-rose-400">
                    ${previewRisk.toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes / Origin (Optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Core position transferred from Charles Schwab / Robinhood"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="addToRadarCheck"
                  checked={formAddToRadar}
                  onChange={(e) => setFormAddToRadar(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="addToRadarCheck" className="text-xs text-slate-300 cursor-pointer">
                  Also monitor this stock on the <strong>Market Universe Radar</strong>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Add Position to Portfolio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Position */}
      {editingPosition && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Edit Holding: {editingPosition.symbol} ({editingPosition.side})</span>
              </h3>
              <button
                onClick={() => setEditingPosition(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPosition} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Shares</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editShares}
                    onChange={(e) => setEditShares(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editEntryPrice}
                    onChange={(e) => setEditEntryPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-rose-400 mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editStopLoss}
                    onChange={(e) => setEditStopLoss(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-900/60 rounded p-2 text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-400 mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTakeProfit}
                    onChange={(e) => setEditTakeProfit(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-900/60 rounded p-2 text-emerald-300 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Trailing Stop (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editTrailingStop}
                  onChange={(e) => setEditTrailingStop(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes / Plan</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleDeletePosition(editingPosition.id, editingPosition.symbol);
                    setEditingPosition(null);
                  }}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-3 py-1.5 rounded text-xs flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPosition(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center gap-1 transition shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
