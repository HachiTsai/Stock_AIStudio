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
  X,
  Info,
  Calculator,
  Sliders,
  ArrowRight,
  DollarSign,
  HelpCircle,
  Scale,
} from 'lucide-react';
import {
  EtfSummaryRow,
  EtfConstituentRow,
  fetchAllMarketSummary,
  fetchAllMarketConstituents,
  ALL_MARKET_ETF_SHEET_ID,
  normalizeEtfId,
} from '../services/constituentsFeedService';

function getConstituentFriction(ticker: string, etfId: string) {
  const sym = ticker.toUpperCase();
  const id = etfId.toUpperCase();
  if (sym.includes('TREASURY') || sym.includes('BOND') || sym.includes('NOTE') || id.endsWith('B')) {
    return { label: '免稅/免健保', score: 95, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  }
  if (sym.endsWith('.HK') || id === '00882') {
    return { label: '海外10%免健保', score: 85, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
  }
  if (sym.endsWith('.TW') || (/^\d{4,5}$/.test(sym) && id !== '00882')) {
    return { label: '境內54C留意健保', score: 80, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
  }
  if (sym.endsWith('.JP') || sym.endsWith('.T')) {
    return { label: '日股15.3%預扣', score: 75, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
  }
  if (sym.endsWith('.US') || /^[A-Z]+$/.test(sym)) {
    return { label: '美股30%重扣', score: 55, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  }
  return { label: '一般扣損', score: 75, color: 'text-slate-400 bg-slate-800 border-slate-700' };
}

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
  const [isFrictionModalOpen, setIsFrictionModalOpen] = useState<boolean>(false);
  const [simGrossDividend, setSimGrossDividend] = useState<number>(50000);

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
    if (marketFilter === 'tw') {
      return summaries.filter((s) => [
        '0050', '0056', '00878', '00713', '00919', '00929',
        '006208', '00692', '00881', '00940', '00939', '00915', '00918'
      ].includes(s.etfId));
    }
    if (marketFilter === 'us') {
      return summaries.filter((s) => ['00646', '00662', '00757', '00830', '00712'].includes(s.etfId));
    }
    if (marketFilter === 'jp') {
      return summaries.filter((s) => ['00645', '00657', '00661', '00949', '00951', '00954', '00956'].includes(s.etfId));
    }
    if (marketFilter === 'bond') {
      return summaries.filter((s) => s.etfId.toUpperCase().endsWith('B'));
    }
    return summaries;
  }, [summaries, marketFilter]);

  const filterCounts = useMemo(() => {
    const tw = summaries.filter((s) => [
      '0050', '0056', '00878', '00713', '00919', '00929',
      '006208', '00692', '00881', '00940', '00939', '00915', '00918'
    ].includes(s.etfId)).length;
    const us = summaries.filter((s) => ['00646', '00662', '00757', '00830', '00712'].includes(s.etfId)).length;
    const jp = summaries.filter((s) => ['00645', '00657', '00661', '00949', '00951', '00954', '00956'].includes(s.etfId)).length;
    const bond = summaries.filter((s) => s.etfId.toUpperCase().endsWith('B')).length;
    return { all: summaries.length, tw, us, jp, bond };
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
    return (
      filteredSummaries.find((s) => normalizeEtfId(s.etfId) === target) ||
      summaries.find((s) => normalizeEtfId(s.etfId) === target) ||
      filteredSummaries[0] ||
      summaries[0] ||
      null
    );
  }, [filteredSummaries, summaries, selectedTicker]);

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

  const netScore = currentEtf ? Math.min(100, Math.max(0, currentEtf.netScore)) : 50;
  const divScore = currentEtf ? Math.min(100, Math.max(0, currentEtf.divScore)) : 50;
  const valScore = currentEtf ? Math.min(100, Math.max(0, currentEtf.valScore)) : 50;
  const fricScore = currentEtf ? Math.min(100, Math.max(0, currentEtf.fricScore)) : 50;

  // Vertex points
  const pNet = { x: cx, y: cy - (R * netScore) / 100 };
  const pDiv = { x: cx + (R * divScore) / 100, y: cy };
  const pVal = { x: cx, y: cy + (R * valScore) / 100 };
  const pFric = { x: cx - (R * fricScore) / 100, y: cy };

  const polygonPath = `${pNet.x},${pNet.y} ${pDiv.x},${pDiv.y} ${pVal.x},${pVal.y} ${pFric.x},${pFric.y}`;

  // Area ratio calculation
  const area = 0.5 * ((netScore * divScore) / 10000 + (divScore * valScore) / 10000 + (valScore * fricScore) / 10000 + (fricScore * netScore) / 10000);
  const areaPct = Math.round(area * 100);

  // Status badge
  const isYieldTrapRisk = divScore < 40;
  const isRobustPrime = netScore >= 80 && divScore >= 70;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
              <Radar className="w-3.5 h-3.5" />
              <span>四象限基本面與風險雷達</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              全市場 ETF 穿透體檢與量化評分矩陣
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              穿透各檔 ETF 底層持股財務指標，依據綜合財務健康（`net`）、股利持續性（`div`）、估值邊際（`val`）與實質扣損摩擦（`fric`）繪製多維雷達圖，精準避開高息陷阱。
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: `全部標的 (${filterCounts.all || summaries.length || 35})` },
              { id: 'tw', label: `台股高息/大盤 (${filterCounts.tw || 13})` },
              { id: 'us', label: `美股市場 (${filterCounts.us || 5})` },
              { id: 'jp', label: `日股市場 (${filterCounts.jp || 7})` },
              { id: 'bond', label: `公債/債券 (${filterCounts.bond || 9})` },
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
          {/* Left Column: 4-Quadrant Radar Chart */}
          <div className="lg:col-span-5 flex flex-col items-center p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300">
                【{currentEtf.etfId}】四象限幾何雷達
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                覆蓋率 {areaPct}%
              </span>
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
                <circle cx={pFric.x} cy={pFric.y} r="4.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />

                {/* Axis Label Text with Scores */}
                <text x={cx} y={cy - R - 12} textAnchor="middle" className="text-[11px] font-bold fill-sky-300">
                  💎 財務健康 {netScore.toFixed(1)}
                </text>
                <text x={cx + R + 10} y={cy + 4} textAnchor="start" className="text-[11px] font-bold fill-emerald-300">
                  🛡️ 股利持續 {divScore.toFixed(1)}
                </text>
                <text x={cx} y={cy + R + 18} textAnchor="middle" className="text-[11px] font-bold fill-purple-300">
                  🎯 估值邊際 {valScore.toFixed(1)}
                </text>
                <text x={cx - R - 10} y={cy + 4} textAnchor="end" className="text-[11px] font-bold fill-amber-300">
                  ⚖️ 摩擦阻力 {fricScore.toFixed(1)}
                </text>
              </svg>
            </div>

            {/* Score Legend Grid */}
            <div className="grid grid-cols-2 gap-2 w-full pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-sky-400 font-semibold">💎 綜合財務 netScore</div>
                <div className="text-lg font-bold font-mono text-slate-100">{netScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">ROE + 負債比 + 營業利潤</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-emerald-400 font-semibold">🛡️ 股利持續 divScore</div>
                <div className="text-lg font-bold font-mono text-slate-100">{divScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">FCF 覆蓋 + 配發率健康度</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-purple-400 font-semibold">🎯 估值安全 valScore</div>
                <div className="text-lg font-bold font-mono text-slate-100">{valScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">本益比 + 股價淨值比 + 殖利率</div>
              </div>
              <div
                onClick={() => setIsFrictionModalOpen(true)}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/90 transition cursor-pointer group relative"
                title="點擊展開摩擦阻力深度解構與實質入袋試算"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-amber-400 font-semibold flex items-center space-x-1">
                    <span>⚖️ 摩擦阻力 fricScore</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500/25 transition font-medium">
                    試算 🔍
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">{fricScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 group-hover:text-amber-300 transition">點擊試算實質配息入袋淨額</div>
              </div>
            </div>
          </div>

          {/* Right Column: Profile & Constituents */}
          <div className="lg:col-span-7 space-y-4">
            {/* ETF Profile Banner */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                      {currentEtf.etfId}
                    </span>
                    <span className="text-lg font-bold text-slate-200">
                      {currentEtf.etfName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    追蹤指數：<span className="text-slate-300 font-medium">{currentEtf.benchmark || '-'}</span> ｜ 交易所：{currentEtf.exchange}
                  </p>
                </div>

                {isYieldTrapRisk ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>高息陷阱警戒</span>
                  </span>
                ) : isRobustPrime ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>體質穩健優質</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>基準正常運作</span>
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

            {/* Top 10 Holdings Table */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2 font-bold text-slate-100">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>穿透前十大成分股權重透視</span>
                </div>
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
                        <th className="p-2.5 text-center">扣損摩擦屬性</th>
                        <th className="p-2.5 text-right">持股權重</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {currentConstituents.map((c, idx) => {
                        const fricInfo = getConstituentFriction(c.constituentTicker, currentEtf.etfId);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="p-2.5 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-cyan-300 font-semibold">{c.constituentTicker}</td>
                            <td className="p-2.5 text-slate-200 font-medium">{c.constituentName}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] border font-mono font-medium ${fricInfo.color}`}>
                                {fricInfo.label}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              {c.weightPct.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive Friction Breakdown & Cashflow Simulator Modal */}
      {isFrictionModalOpen && currentEtf && (() => {
        const etfIdClean = currentEtf.etfId.toUpperCase();
        const isBond = etfIdClean.endsWith('B');
        const is00882 = etfIdClean === '00882';
        const isUS = ['00646', '00662', '00757', '00830', '00712'].includes(etfIdClean);
        const isJP = ['00645', '00657', '00661', '00949', '00951', '00954', '00956'].includes(etfIdClean);
        const isTW = !isBond && !is00882 && !isUS && !isJP;

        const whtRate = isUS ? 30.0 : isJP ? 15.315 : is00882 ? 10.0 : 0.0;
        const whtAmount = Math.round(simGrossDividend * (whtRate / 100));
        const isNhiLiable = isTW && simGrossDividend >= 20000;
        const nhiAmount = isNhiLiable ? Math.round(simGrossDividend * 0.0211) : 0;
        const netCashReceived = Math.max(0, simGrossDividend - whtAmount - nhiAmount);
        const retentionRatePct = simGrossDividend > 0 ? ((netCashReceived / simGrossDividend) * 100).toFixed(1) : '100.0';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                        摩擦阻力係數（fricScore）深度解構與實質入袋試算
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                        {currentEtf.etfId} 評分 {fricScore.toFixed(1)} 分
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      解析【{currentEtf.etfId} ｜ {currentEtf.etfName}】被境外稅負、二代健保、內扣費用與匯兌折損之實質影響
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFrictionModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Four Core Friction Components */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>摩擦阻力係數四大數據組成</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">① 股利海外預扣所得稅 (WHT)</span>
                      <span className="font-mono font-bold text-amber-400">{whtRate}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isUS
                        ? '受美國 IRS 強制預扣 30% 股息稅，對高股息投資人為極重折損摩擦。'
                        : is00882
                        ? '中港紅籌/H股僅預扣約 10% 企業所得稅，無美國 30% 重稅負擔。'
                        : isJP
                        ? '日本持股預扣 15.315% 境外所得稅。'
                        : isBond
                        ? '台灣掛牌海外公債/投資級債 ETF 屬境外利息所得，免預扣海外稅。'
                        : '台股境內標的無境外預扣稅，由發放公司直接匯入。'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">② 二代健保補充保費 (NHI)</span>
                      <span className={`font-mono font-bold ${isTW ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isTW ? '滿2萬扣 2.11%' : '0% 完全豁免'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isTW
                        ? '台股 54C 境內所得單筆達 20,000 元（含）以上需扣繳 2.11%，需留意拆單配置。'
                        : '本標的配息屬於「海外所得（76 項目）」，依健保法規完全免扣繳 2.11% 補充保費！'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">③ 內扣費用率與證券交易稅</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {isBond ? '證交稅 0% (停徵)' : '證交稅 0.1%'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      包含基金經理費（0.15%~0.4%）與保管費（0.03%~0.15%）。債券 ETF 現享政府停徵證交稅優勢。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">④ 最低稅負制與匯兌摩擦</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {isTW ? '綜所稅可扣抵 8.5%' : '免稅額 750 萬元'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isTW
                        ? '境內股息享有 8.5% 可抵減稅額（上限 8 萬元），高所得級距則可能增加綜所稅負。'
                        : '全戶境外所得未達 100 萬免申報；基本所得額未達 750 萬完全免稅，大額現金流避風港。'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Interactive Net Cashflow Simulator */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-slate-100">
                      即時配息實質入袋淨額互動計算器
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    拖拉滑桿或點擊金額即可即時模擬
                  </span>
                </div>

                {/* Amount Buttons & Slider */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">快速預設金額：</span>
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setSimGrossDividend(amt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer border ${
                          simGrossDividend === amt
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        ${amt.toLocaleString()}
                        {amt === 20000 && <span className="text-[9px] text-amber-400 ml-1">(健保起扣點)</span>}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={5000}
                      max={500000}
                      step={5000}
                      value={simGrossDividend}
                      onChange={(e) => setSimGrossDividend(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="font-mono font-black text-amber-400 text-base min-w-[100px] text-right">
                      ${simGrossDividend.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Calculation Output Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">名目預計配息</div>
                    <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                      ${simGrossDividend.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">海外預扣稅 ({whtRate}%)</div>
                    <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
                      -${whtAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] text-slate-400">二代健保 (2.11%)</div>
                    <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                      {nhiAmount > 0 ? `-$${nhiAmount.toLocaleString()}` : '$0 (免扣)'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 bg-amber-500/10">
                    <div className="text-[10px] text-amber-300 font-bold">實質到手現金 (到手率)</div>
                    <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                      ${netCashReceived.toLocaleString()}
                      <span className="text-xs text-emerald-300 font-normal ml-1">({retentionRatePct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Cross-Asset Friction Comparison Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>全市場跨資產摩擦阻力橫向對比（以領取 ${simGrossDividend.toLocaleString()} 為基準）</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">資產類型 (代表標的)</th>
                        <th className="p-2.5 text-center">摩擦評分</th>
                        <th className="p-2.5 text-center">海外預扣稅</th>
                        <th className="p-2.5 text-center">二代健保</th>
                        <th className="p-2.5 text-right">實質入袋金額</th>
                        <th className="p-2.5 text-right">實質到手率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      <tr className={isBond ? 'bg-amber-500/10 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center space-x-1.5">
                          <span>🏛️ 海外債券 (00679B, 00720B, 00751B)</span>
                          {isBond && <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-bold">當前標的</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-400">95.0</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (0%)</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (免扣)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                          ${simGrossDividend.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">100.0%</td>
                      </tr>
                      <tr className={is00882 ? 'bg-amber-500/10 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center space-x-1.5">
                          <span>🌏 中港高息 (00882 中信中國高股息)</span>
                          {is00882 && <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-bold">當前標的</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-cyan-400">85.0</td>
                        <td className="p-2.5 text-center font-mono text-rose-400">
                          -${Math.round(simGrossDividend * 0.10).toLocaleString()} (10%)
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (海外所得免扣)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-100">
                          ${Math.round(simGrossDividend * 0.90).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-cyan-400">90.0%</td>
                      </tr>
                      <tr className={isTW ? 'bg-amber-500/10 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center space-x-1.5">
                          <span>🇹🇼 台股高息 (0056, 00878, 00919)</span>
                          {isTW && <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-bold">當前標的</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-sky-400">80.0</td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (境內無預扣)</td>
                        <td className="p-2.5 text-center font-mono text-amber-400">
                          {simGrossDividend >= 20000 ? `-$${Math.round(simGrossDividend * 0.0211).toLocaleString()} (2.11%)` : '$0 (未滿2萬)'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-100">
                          ${(simGrossDividend - (simGrossDividend >= 20000 ? Math.round(simGrossDividend * 0.0211) : 0)).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-sky-400">
                          {simGrossDividend >= 20000 ? '97.9%' : '100.0%'}
                        </td>
                      </tr>
                      <tr className={isJP ? 'bg-amber-500/10 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center space-x-1.5">
                          <span>🇯🇵 日股龍頭 (00645, 00949)</span>
                          {isJP && <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-bold">當前標的</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-indigo-400">75.0</td>
                        <td className="p-2.5 text-center font-mono text-rose-400">
                          -${Math.round(simGrossDividend * 0.15315).toLocaleString()} (15.3%)
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (免扣)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-100">
                          ${Math.round(simGrossDividend * (1 - 0.15315)).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-indigo-400">84.7%</td>
                      </tr>
                      <tr className={isUS ? 'bg-amber-500/10 font-semibold' : ''}>
                        <td className="p-2.5 flex items-center space-x-1.5">
                          <span>🇺🇸 美股大盤 (00646, 00662)</span>
                          {isUS && <span className="text-[9px] px-1 bg-amber-500 text-slate-950 rounded font-bold">當前標的</span>}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-400">55.0</td>
                        <td className="p-2.5 text-center font-mono text-rose-400">
                          -${Math.round(simGrossDividend * 0.30).toLocaleString()} (30.0%)
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-400">$0 (免扣)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-100">
                          ${Math.round(simGrossDividend * 0.70).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-400">70.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsFrictionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  關閉試算視窗
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
