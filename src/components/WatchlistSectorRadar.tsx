import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Cpu,
  HardDrive,
  Bitcoin,
  Flame,
  ArrowRight,
  Filter,
  BarChart2,
  Activity,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Sparkles,
  Maximize2,
  Minimize2,
  GripHorizontal
} from 'lucide-react';
import { AssetQuote, SectorCategory } from '../types/trading';

const PriceCell: React.FC<{ price: number }> = ({ price }) => {
  const [flash, setFlash] = useState<'UP' | 'DOWN' | null>(null);
  const prevPriceRef = useRef<number>(price);

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      const direction = price > prevPriceRef.current ? 'UP' : 'DOWN';
      setFlash(direction);
      prevPriceRef.current = price;
      const timer = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(timer);
    }
  }, [price]);

  return (
    <td
      className={`py-2 px-2 text-right font-semibold transition-colors duration-300 ${
        flash === 'UP'
          ? 'bg-emerald-500/25 text-emerald-300'
          : flash === 'DOWN'
          ? 'bg-rose-500/25 text-rose-300'
          : 'text-slate-100'
      }`}
    >
      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </td>
  );
};

interface WatchlistSectorRadarProps {
  quotes: AssetQuote[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onLoadIntoOrderDesk: (symbol: string) => void;
  onAddQuote?: (quote: AssetQuote) => void;
  onEditQuote?: (symbol: string, updates: Partial<AssetQuote>) => void;
  onRemoveQuote?: (symbol: string) => void;
}

export const WatchlistSectorRadar: React.FC<WatchlistSectorRadarProps> = ({
  quotes,
  selectedSymbol,
  onSelectSymbol,
  onLoadIntoOrderDesk,
  onAddQuote,
  onEditQuote,
  onRemoveQuote
}) => {
  const [activeSectorFilter, setActiveSectorFilter] = useState<'ALL' | SectorCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Window height and adjustment states
  const [windowHeight, setWindowHeight] = useState<number>(440);
  const [heightPreset, setHeightPreset] = useState<'COMPACT' | 'STANDARD' | 'TALL' | 'FULL'>('STANDARD');
  const [isFullscreenRadar, setIsFullscreenRadar] = useState(false);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(440);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [formSymbol, setFormSymbol] = useState('');
  const [formName, setFormName] = useState('');
  const [formSector, setFormSector] = useState<SectorCategory>('SOX_TECH');
  const [formPrice, setFormPrice] = useState('');
  const [formChange, setFormChange] = useState('');
  const [formChangePercent, setFormChangePercent] = useState('');
  const [formSupport, setFormSupport] = useState('');
  const [formResistance, setFormResistance] = useState('');

  // Drag to resize window height handler
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = windowHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientY - startYRef.current;
      const newHeight = Math.max(220, Math.min(880, startHeightRef.current + delta));
      setWindowHeight(newHeight);
      setHeightPreset('STANDARD');
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSetPresetHeight = (preset: 'COMPACT' | 'STANDARD' | 'TALL' | 'FULL') => {
    setHeightPreset(preset);
    if (preset === 'COMPACT') setWindowHeight(280);
    else if (preset === 'STANDARD') setWindowHeight(440);
    else if (preset === 'TALL') setWindowHeight(620);
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSector = activeSectorFilter === 'ALL' || q.sector === activeSectorFilter;
    const matchesSearch =
      q.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSector && matchesSearch;
  });

  const openAddModal = () => {
    setEditingSymbol(null);
    setFormSymbol('');
    setFormName('');
    setFormSector('SOX_TECH');
    setFormPrice('150.00');
    setFormChange('2.50');
    setFormChangePercent('1.69');
    setFormSupport('145.00');
    setFormResistance('160.00');
    setIsModalOpen(true);
  };

  const openEditModal = (q: AssetQuote) => {
    setEditingSymbol(q.symbol);
    setFormSymbol(q.symbol);
    setFormName(q.name);
    setFormSector(q.sector);
    setFormPrice(q.price.toString());
    setFormChange(q.change !== undefined ? q.change.toString() : '0.00');
    setFormChangePercent(q.changePercent !== undefined ? q.changePercent.toString() : '0.00');
    setFormSupport(q.keyLevels?.support?.toString() || (q.price * 0.96).toFixed(2));
    setFormResistance(q.keyLevels?.resistance?.toString() || (q.price * 1.05).toFixed(2));
    setIsModalOpen(true);
  };

  const handleQuickAddPreset = (preset: {
    symbol: string;
    name: string;
    sector: SectorCategory;
    price: number;
  }) => {
    const p = preset.price;
    const newQuote: AssetQuote = {
      symbol: preset.symbol,
      name: preset.name,
      sector: preset.sector,
      price: p,
      change: Number((p * 0.015).toFixed(2)),
      changePercent: 1.5,
      high24h: Number((p * 1.025).toFixed(2)),
      low24h: Number((p * 0.98).toFixed(2)),
      volume: '15.4M',
      volatilityRank: 75,
      beta: 1.45,
      rsi14: 62.0,
      trend: 'BULLISH',
      timeframeSignals: { '1H': 'BUY', '4H': 'BUY', '1D': 'BUY' },
      keyLevels: {
        support: Number((p * 0.96).toFixed(2)),
        resistance: Number((p * 1.05).toFixed(2)),
        pivot: Number((p * 1.0).toFixed(2))
      },
      priceHistory: [
        Number((p * 0.97).toFixed(2)),
        Number((p * 0.98).toFixed(2)),
        Number((p * 0.99).toFixed(2)),
        p
      ]
    };

    if (onAddQuote) {
      onAddQuote(newQuote);
    }
    setIsModalOpen(false);
  };

  const handleSaveListing = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = formSymbol.trim().toUpperCase();
    const priceNum = parseFloat(formPrice) || 100;
    const chgNum = parseFloat(formChange) || 0;
    const chgPctNum = parseFloat(formChangePercent) || (priceNum > 0 ? Number(((chgNum / priceNum) * 100).toFixed(2)) : 0);
    const supNum = parseFloat(formSupport) || priceNum * 0.96;
    const resNum = parseFloat(formResistance) || priceNum * 1.05;

    if (!sym) return;

    if (editingSymbol) {
      // Edit existing
      if (onEditQuote) {
        onEditQuote(editingSymbol, {
          symbol: sym,
          name: formName || sym,
          sector: formSector,
          price: priceNum,
          change: chgNum,
          changePercent: chgPctNum,
          keyLevels: {
            support: supNum,
            resistance: resNum,
            pivot: priceNum
          }
        });
      }
    } else {
      // Add new
      const newQuote: AssetQuote = {
        symbol: sym,
        name: formName || `${sym} Asset`,
        sector: formSector,
        price: priceNum,
        change: chgNum,
        changePercent: chgPctNum,
        high24h: Number((priceNum * 1.02).toFixed(2)),
        low24h: Number((priceNum * 0.98).toFixed(2)),
        volume: '12.0M',
        volatilityRank: 70,
        beta: 1.35,
        rsi14: 58.0,
        trend: chgNum >= 0 ? 'BULLISH' : 'BEARISH',
        timeframeSignals: { '1H': 'BUY', '4H': 'BUY', '1D': 'BUY' },
        keyLevels: {
          support: supNum,
          resistance: resNum,
          pivot: priceNum
        },
        priceHistory: [
          Number((priceNum * 0.98).toFixed(2)),
          Number((priceNum * 0.99).toFixed(2)),
          priceNum
        ]
      };
      if (onAddQuote) {
        onAddQuote(newQuote);
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteListing = (symbol: string) => {
    if (confirm(`Remove ${symbol} from the Market Universe Radar?`)) {
      if (onRemoveQuote) {
        onRemoveQuote(symbol);
      }
      setIsModalOpen(false);
    }
  };

  const renderSparkline = (history: number[], isPositive: boolean) => {
    if (!history || history.length < 2) return null;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;
    const width = 64;
    const height = 22;

    const points = history
      .map((val, idx) => {
        const x = (idx / (history.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible inline-block">
        <polyline
          fill="none"
          stroke={isPositive ? '#10b981' : '#f43f5e'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm select-none transition-all ${
        isFullscreenRadar
          ? 'fixed inset-3 z-50 bg-slate-900/98 backdrop-blur-md border-indigo-500 shadow-2xl overflow-y-auto'
          : 'h-full'
      }`}
    >
      {/* Sector Filter Tabs & Window Controls Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Market Universe Radar</h3>
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Ticks
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Window Height Controller */}
            <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px] font-mono">
              <span className="text-slate-500 px-1 text-[9px] uppercase tracking-wider">Height:</span>
              <button
                type="button"
                onClick={() => handleSetPresetHeight('COMPACT')}
                className={`px-1.5 py-0.5 rounded transition ${
                  heightPreset === 'COMPACT'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Compact Window (280px)"
              >
                280
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetHeight('STANDARD')}
                className={`px-1.5 py-0.5 rounded transition ${
                  heightPreset === 'STANDARD'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Standard Window (440px)"
              >
                440
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetHeight('TALL')}
                className={`px-1.5 py-0.5 rounded transition ${
                  heightPreset === 'TALL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tall Window (620px)"
              >
                620
              </button>
              <button
                type="button"
                onClick={() => handleSetPresetHeight('FULL')}
                className={`px-1.5 py-0.5 rounded transition ${
                  heightPreset === 'FULL'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Auto / Full Height"
              >
                Auto
              </button>
            </div>

            {/* Fullscreen Expand Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenRadar(!isFullscreenRadar)}
              className="p-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition"
              title={isFullscreenRadar ? 'Exit Fullscreen' : 'Expand Radar Fullscreen'}
            >
              {isFullscreenRadar ? <Minimize2 className="w-3.5 h-3.5 text-indigo-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <input
              type="text"
              placeholder="Filter symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700/80 focus:outline-none focus:border-indigo-500 w-28 sm:w-36 font-mono"
            />

            <button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 transition shadow-sm"
              title="Add a new stock, crypto or ETF to radar"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ticker</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-medium">
          <button
            onClick={() => setActiveSectorFilter('ALL')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
              activeSectorFilter === 'ALL'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Universe ({quotes.length})
          </button>
          <button
            onClick={() => setActiveSectorFilter('MEMORY_SECTOR')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSectorFilter === 'MEMORY_SECTOR'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'bg-slate-900 text-cyan-400 hover:text-cyan-300 border border-cyan-900/60'
            }`}
          >
            <HardDrive className="w-3 h-3 text-cyan-400" />
            <span>Memory (MU, WDC)</span>
          </button>
          <button
            onClick={() => setActiveSectorFilter('SOX_TECH')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSectorFilter === 'SOX_TECH'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-slate-900 text-blue-400 hover:text-blue-300 border border-blue-900/60'
            }`}
          >
            <Cpu className="w-3 h-3 text-blue-400" />
            <span>SOX Tech</span>
          </button>
          <button
            onClick={() => setActiveSectorFilter('SP100_LEADERS')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSectorFilter === 'SP100_LEADERS'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Layers className="w-3 h-3 text-indigo-400" />
            <span>S&P 100</span>
          </button>
          <button
            onClick={() => setActiveSectorFilter('CRYPTO')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSectorFilter === 'CRYPTO'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-slate-900 text-amber-400 hover:text-amber-300 border border-amber-900/60'
            }`}
          >
            <Bitcoin className="w-3 h-3 text-amber-400" />
            <span>Crypto (BTC/ETH)</span>
          </button>
          <button
            onClick={() => setActiveSectorFilter('VOLATILITY')}
            className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSectorFilter === 'VOLATILITY'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-slate-900 text-rose-400 hover:text-rose-300 border border-rose-900/60'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            <span>VIX Indices</span>
          </button>
        </div>
      </div>

      {/* Asset Table with real-time ticks & adjustable height */}
      <div
        style={{
          height: isFullscreenRadar || heightPreset === 'FULL' ? 'auto' : `${windowHeight}px`,
          maxHeight: isFullscreenRadar || heightPreset === 'FULL' ? 'none' : `${windowHeight}px`
        }}
        className="overflow-x-auto flex-1 transition-[height] duration-75"
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0 z-10">
            <tr>
              <th className="py-2.5 px-3">Asset</th>
              <th className="py-2.5 px-2 text-right">Price</th>
              <th className="py-2.5 px-2 text-right">24h Chg</th>
              <th className="py-2.5 px-2 text-center">Trend (1H / 4H / 1D)</th>
              <th className="py-2.5 px-2 text-center hidden md:table-cell">Sparkline</th>
              <th className="py-2.5 px-2 text-right hidden lg:table-cell">Key Pivot</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredQuotes.map((q) => {
              const isSelected = selectedSymbol === q.symbol;
              const isPositive = q.change >= 0;
              const isMemory = q.sector === 'MEMORY_SECTOR';

              return (
                <tr
                  key={q.symbol}
                  onClick={() => onSelectSymbol(q.symbol)}
                  className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 text-xs">{q.symbol}</span>
                          {isMemory && (
                            <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1 rounded font-sans uppercase">
                              MEM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[110px] font-sans">
                          {q.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  <PriceCell price={q?.price ?? 0} />

                  <td className="py-2 px-2 text-right">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {q.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* Multi-timeframe trend signals (1H, 4H, 1D) */}
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-sans font-bold">
                      <span
                        className={`px-1 py-0.5 rounded ${
                          q.timeframeSignals?.['1H'] === 'BUY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : q.timeframeSignals?.['1H'] === 'SELL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title="1-Hour Trend"
                      >
                        1H
                      </span>
                      <span
                        className={`px-1 py-0.5 rounded ${
                          q.timeframeSignals?.['4H'] === 'BUY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : q.timeframeSignals?.['4H'] === 'SELL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title="4-Hour Trend"
                      >
                        4H
                      </span>
                      <span
                        className={`px-1 py-0.5 rounded ${
                          q.timeframeSignals?.['1D'] === 'BUY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : q.timeframeSignals?.['1D'] === 'SELL'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title="Daily Swing Trend"
                      >
                        1D
                      </span>
                    </div>
                  </td>

                  <td className="py-2 px-2 text-center hidden md:table-cell">
                    {renderSparkline(q.priceHistory, isPositive)}
                  </td>

                  <td className="py-2 px-2 text-right hidden lg:table-cell text-slate-400 text-[11px]">
                    ${q.keyLevels?.pivot ? q.keyLevels.pivot.toFixed(1) : q.price.toFixed(1)}
                  </td>

                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                        title="Edit Listing or Adjust Price"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteListing(q.symbol)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Remove from Radar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectSymbol(q.symbol)}
                        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
                        title="View Candlestick Chart"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onLoadIntoOrderDesk(q.symbol)}
                        className="flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white px-2 py-0.5 rounded text-[10px] font-sans font-semibold transition-colors"
                        title="Load into Swing Order Desk"
                      >
                        <span>Trade</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Interactive Bottom Resize Handle Bar */}
      {!isFullscreenRadar && heightPreset !== 'FULL' && (
        <div
          onMouseDown={handleStartResize}
          className="h-5 bg-slate-950 hover:bg-indigo-950/40 border-t border-slate-800/80 cursor-row-resize flex items-center justify-center text-slate-500 hover:text-indigo-300 group transition-colors select-none"
          title="Click and drag up or down to adjust radar window height"
        >
          <GripHorizontal className="w-5 h-3 text-slate-600 group-hover:text-indigo-400" />
          <span className="text-[10px] text-slate-500 group-hover:text-indigo-300 ml-1.5 font-mono">
            Drag to adjust window height ({windowHeight}px)
          </span>
        </div>
      )}

      {/* Add / Edit Listing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>{editingSymbol ? `Edit Listing: ${editingSymbol}` : 'Add Ticker to Radar Universe'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets if adding new */}
            {!editingSymbol && (
              <div className="p-3 bg-slate-950/40 border-b border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold block mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>1-Click Popular Add Presets:</span>
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'PLTR',
                        name: 'Palantir Technologies',
                        sector: 'SOX_TECH',
                        price: 134.50
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ PLTR</strong> ($134.50)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'SMCI',
                        name: 'Super Micro Computer',
                        sector: 'SOX_TECH',
                        price: 480.00
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ SMCI</strong> ($480.00)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'AVGO',
                        name: 'Broadcom Inc',
                        sector: 'SOX_TECH',
                        price: 1850.00
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ AVGO</strong> ($1,850)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'QQQ',
                        name: 'Invesco QQQ Trust',
                        sector: 'SP100_LEADERS',
                        price: 512.40
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ QQQ</strong> ($512.40)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'SPY',
                        name: 'SPDR S&P 500 ETF',
                        sector: 'SP100_LEADERS',
                        price: 590.20
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ SPY</strong> ($590.20)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddPreset({
                        symbol: 'COIN',
                        name: 'Coinbase Global Inc',
                        sector: 'CRYPTO',
                        price: 310.00
                      })
                    }
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[11px] font-mono border border-slate-700 text-left"
                  >
                    <strong>+ COIN</strong> ($310.00)
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveListing} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    required
                    value={formSymbol}
                    disabled={!!editingSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. PLTR"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase focus:border-indigo-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 150.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-emerald-400 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Company / Asset Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Palantir Technologies"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">24h Change ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formChange}
                    onChange={(e) => setFormChange(e.target.value)}
                    placeholder="e.g. 2.50"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">24h Change (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formChangePercent}
                    onChange={(e) => setFormChangePercent(e.target.value)}
                    placeholder="e.g. 1.80"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sector Category</label>
                <select
                  value={formSector}
                  onChange={(e) => setFormSector(e.target.value as SectorCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="MEMORY_SECTOR">Memory Sector (MU, WDC, STX)</option>
                  <option value="SOX_TECH">SOX Tech &amp; Semis (NVDA, AMD, TSM, ASML)</option>
                  <option value="SP100_LEADERS">S&amp;P 100 Leaders (AAPL, MSFT, META, AMZN, TSLA)</option>
                  <option value="CRYPTO">Crypto (BTC, ETH, COIN)</option>
                  <option value="VOLATILITY">Volatility (VIX, VXN)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-rose-400 mb-1">Support Level ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSupport}
                    onChange={(e) => setFormSupport(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-900/60 rounded p-2 text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-400 mb-1">Resistance Level ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formResistance}
                    onChange={(e) => setFormResistance(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-900/60 rounded p-2 text-emerald-300 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingSymbol ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteListing(editingSymbol)}
                    className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/80 px-3 py-1.5 rounded text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center gap-1 transition shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingSymbol ? 'Update Listing' : 'Add to Universe'}</span>
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
