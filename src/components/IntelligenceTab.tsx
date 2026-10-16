import React, { useState } from 'react';
import {
  Scale,
  ArrowRight,
  Sliders,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from 'lucide-react';
import {
  IntelligenceSignal,
  SignalDimension,
  SignalDirection,
} from '../types/portfolio';
import { synthesizeObjectiveTrends } from '../utils/intelligenceEngine';

interface IntelligenceTabProps {
  signals: IntelligenceSignal[];
  baseDividendPerShare: number;
  onApplyScenarioToModel: (dividendPerShare: number, label: string) => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
  signals,
  baseDividendPerShare,
  onApplyScenarioToModel,
}) => {
  // Filter state for signal list
  const [filterDimension, setFilterDimension] = useState<SignalDimension | 'all'>('all');
  const [filterDirection, setFilterDirection] = useState<SignalDirection | 'all'>('all');
  const [selected, setSelected] = useState<IntelligenceSignal | null>(null);

  // Compute live objective trend synthesis
  const synthesis = synthesizeObjectiveTrends(signals, baseDividendPerShare);

  const filteredSignals = signals.filter((s) => {
    if (filterDimension !== 'all' && s.dimension !== filterDimension) return false;
    if (filterDirection !== 'all' && s.direction !== filterDirection) return false;
    return true;
  });

  const getDimensionBadge = (dim: SignalDimension) => {
    if (dim === 'dividend_sustainability') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          ① 配息續航力
        </span>
      );
    }
    if (dim === 'valuation_margin') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30">
          ② 估值與安全邊際
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
        ③ 稅費與匯率摩擦
      </span>
    );
  };

  const getDirectionBadge = (sig: IntelligenceSignal) => {
    if (sig.direction === 'bullish') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
          <TrendingUp className="w-3 h-3" />
          <span>正向 {sig.weight}/5</span>
        </span>
      );
    }
    if (sig.direction === 'bearish') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
          <TrendingDown className="w-3 h-3" />
          <span>風險 {sig.weight}/5</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 shrink-0">
        <Minus className="w-3 h-3" />
        <span>中性 {sig.weight}/5</span>
      </span>
    );
  };

  const shiftColor = (v: number) =>
    v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-slate-300';
  const formatShift = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)} TWD`;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Section 1: Objective Trend Radar & 3D Model Bridge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span>雙模混合量化情報引擎（純規則統計 ＋ AI 輔助萃取 ⇄ Google Drive）</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">客觀趨勢歸納與正反證據天平</h1>
            <p className="text-sm text-slate-400 mt-1">
              自動剝離主觀市場情緒，從累積的 {synthesis.totalSignals} 筆硬數據中歸納配息動能，並連動 3D 股利模型。
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-right">
            <span className="text-[11px] text-slate-400 block">當前數據歸納客觀共識</span>
            <span className="text-sm font-bold text-emerald-400">{synthesis.consensusVerdict}</span>
          </div>
        </div>

        {/* Bull vs Bear Tug-of-War Balance */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-emerald-400">
                正向支撐證據（{synthesis.bullCount} 筆 / 權重 {synthesis.bullWeight}）
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              正反證據權重比 {synthesis.bullRatioPct.toFixed(0)}% : {synthesis.bearRatioPct.toFixed(0)}%
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-400">
                潛在壓抑風險（{synthesis.bearCount} 筆 / 權重 {synthesis.bearWeight}）
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            </div>
          </div>

          <div className="w-full h-3.5 bg-rose-500/30 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-l-full transition-all duration-500"
              style={{ width: `${synthesis.bullRatioPct}%` }}
            />
          </div>

          {/* 3 Core Dimension Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">① 配息續航力維度</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.dividend_sustainability.count} 筆成分股分紅與財報數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-emerald-400">
                  {synthesis.dimStats.dividend_sustainability.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">② 估值與安全邊際</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.valuation_margin.count} 筆殖利率與淨值位階數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-teal-300">
                  {synthesis.dimStats.valuation_margin.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">③ 稅費與匯率摩擦</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.friction_fx.count} 筆二代健保與匯率折算數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-amber-300">
                  {synthesis.dimStats.friction_fx.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Scenario Bridge to 3D Dividend Target Model */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 border border-emerald-500/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>客觀數據推導之 00882 年配息壓力測試區間（一鍵套入 3D 股利模型）</span>
            </div>
            <p className="text-xs text-slate-400">
              根據上方正反硬數據之邊際影響權重自動計算，點擊任一情境即可直接跳轉至【股利目標模型】檢視 3D 曲面與達標年數：
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.conservative,
                  `保守壓力情境 (${synthesis.scenarios.conservative.toFixed(2)} TWD)`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔴 保守壓力：{synthesis.scenarios.conservative.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.consensus,
                  `客觀共識基準 (${synthesis.scenarios.consensus.toFixed(2)} TWD)`
                )
              }
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🟢 客觀共識：{synthesis.scenarios.consensus.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.optimistic,
                  `樂觀支撐情境 (${synthesis.scenarios.optimistic.toFixed(2)} TWD)`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-teal-950/40 text-teal-300 border border-teal-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔵 樂觀支撐：{synthesis.scenarios.optimistic.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Side-by-Side Bull vs Bear Evidence Ledger & Signal Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>結構化情報與硬數據資料庫（共 {filteredSignals.length} 筆）</span>
          </h2>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterDimension}
              onChange={(e) => setFilterDimension(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
            >
              <option value="all">所有維度</option>
              <option value="dividend_sustainability">① 配息續航力</option>
              <option value="valuation_margin">② 估值與安全邊際</option>
              <option value="friction_fx">③ 稅費與匯率摩擦</option>
            </select>

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
            >
              <option value="all">所有方向</option>
              <option value="bullish">🟢 正向支撐</option>
              <option value="bearish">🔴 潛在風險</option>
              <option value="neutral">⚪ 中性事實</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {filteredSignals.map((sig) => (
            <button
              key={sig.id}
              type="button"
              onClick={() => setSelected(sig)}
              className={`w-full text-left bg-slate-900 border rounded-xl px-4 py-3 space-y-2 transition cursor-pointer ${
                sig.direction === 'bullish'
                  ? 'border-emerald-500/25 hover:border-emerald-500/50'
                  : sig.direction === 'bearish'
                  ? 'border-rose-500/25 hover:border-rose-500/50'
                  : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {getDirectionBadge(sig)}
                <h3 className="text-sm font-bold text-slate-100 flex-1 min-w-0 truncate">
                  {sig.title}
                </h3>
                <span className="font-mono text-[11px] text-slate-500 shrink-0">{sig.date}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {sig.extractedMetrics.map((m, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px]"
                  >
                    <span className="text-slate-400">{m.label} </span>
                    <span className="font-mono font-bold text-teal-300">{m.value}</span>
                  </span>
                ))}
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px]">
                  <span className="text-slate-400">配息影響 </span>
                  <span className={`font-mono font-bold ${shiftColor(sig.impliedDividendShift)}`}>
                    {formatShift(sig.impliedDividendShift)}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {getDirectionBadge(selected)}
                  {getDimensionBadge(selected.dimension)}
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {selected.ticker}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{selected.date}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{selected.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="關閉"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.extractedMetrics.map((m, i) => (
                <div key={i} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] block">{m.label}</span>
                  <span className="font-mono font-bold text-teal-300">{m.value}</span>
                </div>
              ))}
              <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px] block">配息邊際影響</span>
                <span className={`font-mono font-bold ${shiftColor(selected.impliedDividendShift)}`}>
                  {formatShift(selected.impliedDividendShift)}
                </span>
              </div>
            </div>

            {selected.hardFacts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  客觀事實與硬數據
                </div>
                <ul className="space-y-1 text-xs text-slate-200">
                  {selected.hardFacts.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-mono">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.objectiveReasoning && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  客觀推論
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selected.objectiveReasoning}</p>
              </div>
            )}

            {selected.rawContent && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  原文摘要
                </div>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {selected.rawContent}
                </p>
              </div>
            )}

            {(selected.sourceUrl || selected.tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800 text-[11px]">
                {selected.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {t}
                  </span>
                ))}
                {selected.sourceUrl && (
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-400 hover:underline ml-auto"
                  >
                    來源連結
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
