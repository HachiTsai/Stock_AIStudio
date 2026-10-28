import React, { useEffect, useState, useMemo } from 'react';
import {
  Radar,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ChevronDown,
  TrendingUp,
  Percent,
  Coins,
  Compass,
  CheckCircle2,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import {
  EtfSummaryRow,
  EtfConstituentRow,
  fetchAllMarketSummary,
  fetchLiveEtfQuotes,
  type LiveEtfQuote,
  fetchAllMarketConstituents,
  ALL_MARKET_ETF_SHEET_ID,
  normalizeEtfId,
  classifyEtfMarket,
  type MarketCategory,
} from '../services/constituentsFeedService';
import { BondCard } from './BondCard';
import { computeTechnicalMetrics } from '../services/technicalService';

interface RadarTabProps {
  initialTicker?: string;
}

export const RadarTab: React.FC<RadarTabProps> = ({ initialTicker = '00882' }) => {
  const [summaries, setSummaries] = useState<EtfSummaryRow[]>([]);
  const [constituents, setConstituents] = useState<EtfConstituentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker);
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveEtfQuote>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchAllMarketSummary(), fetchAllMarketConstituents()])
      .then(([sums, consts]) => {
        if (cancelled) return;
        setSummaries(sums);
        setConstituents(consts);
        setLoading(false);
        fetchLiveEtfQuotes(sums.map((x) => x.etfId)).then((q) => {
          if (!cancelled) setLiveQuotes(q);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || '讀取全市場 ETF 基本面資料失敗');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSummaries = useMemo(() => {
    if (marketFilter === 'all') return summaries;
    return summaries.filter((s) => classifyEtfMarket(s) === marketFilter);
  }, [summaries, marketFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: summaries.length, tw: 0, us: 0, jp: 0, cn: 0, bond: 0 };
    summaries.forEach((s) => {
      const cat = classifyEtfMarket(s);
      if (cat in counts) counts[cat]++;
    });
    return counts;
  }, [summaries]);

  // 當市場分類切換時，若原先選取的標的不在當前過濾清單中，自動平滑切換至第一檔標的
  useEffect(() => {
    if (filteredSummaries.length > 0) {
      const isSelectedInList = filteredSummaries.some(
        (s) => normalizeEtfId(s.etfId) === normalizeEtfId(selectedTicker)
      );
      if (!isSelectedInList) {
        setSelectedTicker(filteredSummaries[0].etfId);
      }
    }
  }, [filteredSummaries, selectedTicker]);

  const currentEtf = useMemo(() => {
    const target = normalizeEtfId(selectedTicker);
    const base =
      filteredSummaries.find((s) => normalizeEtfId(s.etfId) === target) ||
      summaries.find((s) => normalizeEtfId(s.etfId) === target) ||
      filteredSummaries[0] ||
      summaries[0] ||
      null;
    if (!base) return null;
    const live = liveQuotes[base.etfId];
    if (!live) return { ...base, priceSource: 'snapshot' as const };
    return {
      ...base,
      currentPrice: live.price,
      priceSource: 'live' as const,
      priceTime: live.time,
      priceChangePct: live.changePct,
    };
  }, [filteredSummaries, summaries, selectedTicker, liveQuotes]);

  const currentConstituents = useMemo(() => {
    if (!currentEtf) return [];
    const target = normalizeEtfId(currentEtf.etfId);
    return constituents
      .filter((c) => normalizeEtfId(c.etfId) === target)
      .sort((a, b) => b.weightPct - a.weightPct)
      .slice(0, 10);
  }, [constituents, currentEtf]);

  // Radar chart constants
  const cx = 160;
  const cy = 160;
  const R = 105;

  const tech = useMemo(() => (currentEtf ? computeTechnicalMetrics(currentEtf.etfId) : null), [currentEtf?.etfId]);

  // 四軸：上=趨勢、右=MACD 動能、下=均量比、左=近 1 年含息總報酬（實質賺錢戰績）
  const netScore = tech ? tech.trendScore : 50;
  const divScore = tech ? tech.macdScore : 50;
  const valScore = tech ? tech.volScore : 50;
  const returnScore = tech ? tech.returnScore : 50;

  // Vertex points
  const pNet = { x: cx, y: cy - (R * netScore) / 100 };
  const pDiv = { x: cx + (R * divScore) / 100, y: cy };
  const pVal = { x: cx, y: cy + (R * valScore) / 100 };
  const pRet = { x: cx - (R * returnScore) / 100, y: cy };

  const polygonPath = `${pNet.x},${pNet.y} ${pDiv.x},${pDiv.y} ${pVal.x},${pVal.y} ${pRet.x},${pRet.y}`;

  // Area ratio calculation
  const area = 0.5 * ((netScore * divScore) / 10000 + (divScore * valScore) / 10000 + (valScore * returnScore) / 10000 + (returnScore * netScore) / 10000);
  const areaPct = Math.round(area * 100);

  // Status badge
  const isYieldTrapRisk = !!tech && tech.histogram < 0 && tech.dif < 0;
  const isRobustPrime = !!tech && tech.histogram > 0 && tech.dif > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
              <Radar className="w-3.5 h-3.5" />
              <span>動能技術面與成本雷達</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              全市場 ETF 穿透體檢與量化評分矩陣
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              以還原收盤價計算，依據趨勢（相對 60 日均線）、MACD 動能、均量比（量能）與近 1 年含息總報酬（實質賺錢戰績）繪製四軸動態評分矩陣。
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `全部標的 (${filterCounts.all || summaries.length})` },
              { id: 'tw', label: `台股市場 (${filterCounts.tw || 0})` },
              { id: 'us', label: `美股市場 (${filterCounts.us || 0})` },
              { id: 'jp', label: `日股市場 (${filterCounts.jp || 0})` },
              { id: 'cn', label: `中港市場 (${filterCounts.cn || 0})` },
              { id: 'bond', label: `公債/債券 (${filterCounts.bond || 0})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setMarketFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  marketFilter === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Selector Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>切換觀察標的：</span>
        </div>
        <div className="relative inline-block w-full sm:w-96">
          <select
            value={currentEtf ? currentEtf.etfId : selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 pr-10 cursor-pointer"
          >
            {filteredSummaries.length === 0 ? (
              <option value="">無符合標的</option>
            ) : (
              filteredSummaries.map((s) => (
                <option key={s.etfId} value={s.etfId}>
                  {s.etfId} ｜ {s.etfName} ({s.category})
                </option>
              ))
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p>正在載入全市場 ETF 穿透基本面與評分資料庫…</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          {error}
        </div>
      ) : currentEtf ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {currentEtf.etfId.toUpperCase().endsWith('B') ? (
            <BondCard etfId={currentEtf.etfId} price={currentEtf.currentPrice} />
          ) : (
            <>
          {/* Left Column: 4-Quadrant Radar Chart */}
          <div className="lg:col-span-5 flex flex-col items-center p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300">
                【{currentEtf.etfId}】量化動態評分矩陣
              </span>
              <div className="flex items-center space-x-2">
                {currentEtf.currentPrice ? (
                  <span
                    className="text-xs font-mono font-bold text-slate-200 bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-700"
                    title={currentEtf.priceSource === 'live' && currentEtf.priceTime ? `報價時間 ${new Date(currentEtf.priceTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}（Yahoo Finance，可能延遲）` : '快照價格，非即時'}
                  >
                    {currentEtf.priceSource === 'live' ? '🟢 即時' : '⚪ 快照'} ${currentEtf.currentPrice.toFixed(2)}
                    {currentEtf.priceSource === 'live' && typeof currentEtf.priceChangePct === 'number' ? (
                      <span className={currentEtf.priceChangePct >= 0 ? 'text-rose-400 ml-1' : 'text-emerald-400 ml-1'}>
                        {currentEtf.priceChangePct >= 0 ? '+' : ''}{currentEtf.priceChangePct.toFixed(2)}%
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                  覆蓋率 {areaPct}%
                </span>
              </div>
            </div>

            <div className="relative w-[320px] h-[320px]">
              <svg viewBox="0 0 320 320" className="w-full h-full overflow-visible">
                {/* Concentric diamond grids */}
                {[0.25, 0.5, 0.75, 1.0].map((step) => {
                  const r = R * step;
                  const path = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
                  return (
                    <g key={step}>
                      <polygon
                        points={path}
                        fill="none"
                        stroke="currentColor"
                        className="text-slate-800/80"
                        strokeWidth="1"
                        strokeDasharray={step === 1 ? 'none' : '2 2'}
                      />
                      <text
                        x={cx + 4}
                        y={cy - r - 2}
                        className="text-[9px] fill-slate-600 font-mono"
                      >
                        {Math.round(step * 100)}
                      </text>
                    </g>
                  );
                })}

                {/* Crosshair Axes */}
                <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="currentColor" className="text-slate-800" strokeWidth="1.2" />
                <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="currentColor" className="text-slate-800" strokeWidth="1.2" />

                {/* Dynamic Radar Polygon */}
                <polygon
                  points={polygonPath}
                  fill={isYieldTrapRisk ? 'rgba(244, 63, 94, 0.25)' : 'rgba(6, 182, 212, 0.25)'}
                  stroke={isYieldTrapRisk ? '#f43f5e' : isRobustPrime ? '#10b981' : '#06b6d4'}
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out"
                />

                {/* 4 Score Points */}
                <circle cx={pNet.x} cy={pNet.y} r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={pDiv.x} cy={pDiv.y} r="4.5" fill="#34d399" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={pVal.x} cy={pVal.y} r="4.5" fill="#c084fc" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={pRet.x} cy={pRet.y} r="4.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />

                {/* Axis Label Text with Scores */}
                <text x={cx} y={cy - R - 12} textAnchor="middle" className="text-[11px] font-bold fill-sky-300">
                  📈 趨勢 {netScore.toFixed(1)}
                </text>
                <text x={cx + R + 10} y={cy + 4} textAnchor="start" className="text-[11px] font-bold fill-emerald-300">
                  📊 MACD {divScore.toFixed(1)}
                </text>
                <text x={cx} y={cy + R + 18} textAnchor="middle" className="text-[11px] font-bold fill-purple-300">
                  🔊 均量比 {valScore.toFixed(1)}
                </text>
                <text x={cx - R - 10} y={cy + 4} textAnchor="end" className="text-[11px] font-bold fill-amber-300">
                  💰 總回報 {returnScore.toFixed(1)}
                </text>
              </svg>
            </div>

            <p className="w-full text-[10px] text-slate-500 leading-relaxed">
              價格與量能指標以還原收盤價計算（資料至 {tech?.asOf ?? '無資料'}）。MACD 為 12/26/9，柱狀體與乖離率皆除以該標的日報酬標準差後換算 0–100 分（50 為持平，不設固定門檻，避免高波動標的被壓成 0 分）；均量比為 5 日均量對 60 日均量；總回報為近 1 年含息累積報酬（0% 為 40 分，60%+ 為極佳）。皆為客觀量化指標，不代表買賣建議。
            </p>

            {/* Score Legend Grid */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-sky-400 font-semibold">📈 趨勢（相對 60 日均線）</div>
                <div className="text-lg font-bold font-mono text-slate-100">{netScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">乖離 {tech ? `${tech.trendDeviationPct >= 0 ? '+' : ''}${tech.trendDeviationPct.toFixed(2)}%` : '-'}（已依該標的波動標準化）</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-emerald-400 font-semibold">📊 MACD 動能（柱狀體）</div>
                <div className="text-lg font-bold font-mono text-slate-100">{tech ? `${tech.histogramPct >= 0 ? '+' : ''}${tech.histogramPct.toFixed(2)}%` : '-'}</div>
                <div className="text-[10px] text-slate-500">DIF {tech ? tech.dif.toFixed(3) : '-'}／訊號 {tech ? tech.signal.toFixed(3) : '-'}（雷達 {divScore.toFixed(0)} 分）</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-purple-400 font-semibold">🔊 均量比（量能）</div>
                <div className="text-lg font-bold font-mono text-slate-100">{tech ? `${tech.volRatio.toFixed(2)}x` : '-'}</div>
                <div className="text-[10px] text-slate-500">5 日均量 ÷ 60 日均量，1.0 = 50 分、2.0 滿格（雷達 {valScore.toFixed(0)} 分）</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-amber-400 font-semibold">💰 1 年含息總報酬</div>
                  <div className="text-[10px] font-mono font-bold text-amber-300">{returnScore.toFixed(1)} 分</div>
                </div>
                <div className={`text-base font-bold font-mono mt-0.5 ${tech && tech.totalReturn1Y >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tech ? `${tech.totalReturn1Y >= 0 ? '+' : ''}${tech.totalReturn1Y.toFixed(2)}%` : '-'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  含除息再投入之實質總收益
                </div>
              </div>
            </div>
          </div>

            </>
          )}

          {/* Right Column: Profile & Constituents */}
          <div className="lg:col-span-7 space-y-4">
            {/* ETF Profile Banner */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                      {currentEtf.etfId}
                    </span>
                    <span className="text-lg font-bold text-slate-200">
                      {currentEtf.etfName}
                    </span>
                    {currentEtf.currentPrice ? (
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-sm">
                        <span className="text-[11px] text-slate-400 font-medium">當前股價</span>
                        <span className="text-lg font-extrabold font-mono text-cyan-300">
                          ${currentEtf.currentPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-cyan-500 font-mono">TWD</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    追蹤指數：<span className="text-slate-300 font-medium">{currentEtf.benchmark || '-'}</span> ｜ 交易所：{currentEtf.exchange}
                  </p>
                </div>

                {isYieldTrapRisk ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>動能轉弱（MACD 柱與 DIF 皆為負）</span>
                  </span>
                ) : isRobustPrime ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>動能偏多（MACD 柱與 DIF 皆為正）</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>動能中性</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">穿透加權 ROE</div>
                  <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
                    {currentEtf.weightedRoe}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">底層持股總檔數</div>
                  <div className="text-lg font-extrabold text-cyan-400 font-mono mt-0.5">
                    {currentEtf.constituentCount} 檔
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">資產類別</div>
                  <div className="text-sm font-bold text-slate-200 mt-1">
                    {currentEtf.category}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] text-slate-400">數據更新日期</div>
                  <div className="text-xs font-mono font-semibold text-slate-400 mt-1.5">
                    {currentEtf.lastModelUpdate}
                  </div>
                </div>
              </div>
            </div>

            {/* All-in Tax & Fee Breakdown Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/20 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-amber-300">⚖️ 全市場實質所有稅金費用總計（公開資訊觀測）</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-semibold">
                    實質年損耗 {currentEtf.totalFrictionPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-300">
                  每百萬投資年耗損約 <strong className="text-amber-400 font-bold">${currentEtf.costPerMillion.toLocaleString()}</strong> 元
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">① 內扣總費用率 (TER)</div>
                  <div className="text-base font-extrabold font-mono text-slate-100 mt-0.5">
                    {currentEtf.terPct.toFixed(2)}%
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">投信投顧公會實質總費用</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">② 二代健保實質負擔</div>
                  <div className="text-base font-extrabold font-mono text-slate-100 mt-0.5">
                    {currentEtf.nhiPct === null ? '未估算' : `${currentEtf.nhiPct.toFixed(3)}%`}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {currentEtf.etfId === '00882'
                      ? '大陸營利所得部分課 2.11%，各期比例不同'
                      : currentEtf.etfId.endsWith('B') || ['00646','00662','00757','00830','00712','00645','00657','00661','00949','00951','00954','00956'].includes(currentEtf.etfId)
                      ? '海外所得免健保 (0%)'
                      : '54C 境內所得課 2.11%'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">③ 證券交易稅</div>
                  <div className="text-base font-extrabold font-mono text-slate-100 mt-0.5">
                    {currentEtf.stampTaxPct.toFixed(2)}%
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {currentEtf.stampTaxPct === 0 ? '債券 ETF 依法停徵' : '股票 ETF 法定稅率'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-400">④ 摩擦友善度評級</div>
                  <div className="text-base font-extrabold font-mono text-amber-400 mt-0.5">
                    {currentEtf.fricScore.toFixed(1)} 分
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">總摩擦越低評分越高</div>
                </div>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20 leading-relaxed">
                {currentEtf.taxNote}
              </div>
            </div>

            {/* Top 10 Holdings Table */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-100">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>穿透前十大成分股權重透視</span>
                </div>
                <div className="flex items-center space-x-3">
                  {currentEtf.currentPrice ? (
                    <span className="hidden sm:inline-flex items-center text-slate-400 font-mono text-xs">
                      標的市價：<strong className="text-cyan-300 ml-1 font-bold">${currentEtf.currentPrice.toFixed(2)}</strong>
                    </span>
                  ) : null}
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${ALL_MARKET_ETF_SHEET_ID}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <span>開啟雲端 Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {currentConstituents.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  此標的無細部成分股清單（國債型或期貨型標的）。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">代號</th>
                        <th className="p-2.5">成分股名稱</th>
                        <th className="p-2.5 text-right">持股權重</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {currentConstituents.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono text-cyan-300 font-semibold">{c.constituentTicker}</td>
                          <td className="p-2.5 text-slate-200 font-medium">{c.constituentName}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                            {c.weightPct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
