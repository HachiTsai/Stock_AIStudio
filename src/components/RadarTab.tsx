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
  fetchAllMarketConstituents,
  ALL_MARKET_ETF_SHEET_ID,
  normalizeEtfId,
} from '../services/constituentsFeedService';

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
      return summaries.filter((s) => ['0050', '0056', '00878', '00713', '00919', '00929'].includes(s.etfId));
    }
    if (marketFilter === 'us') {
      return summaries.filter((s) => ['00646', '00662', '00757', '00830', '00712'].includes(s.etfId));
    }
    if (marketFilter === 'jp') {
      return summaries.filter((s) => ['00645', '00657', '00949', '00951', '00954', '00956'].includes(s.etfId));
    }
    if (marketFilter === 'bond') {
      return summaries.filter((s) => s.etfId.endsWith('B'));
    }
    return summaries;
  }, [summaries, marketFilter]);

  const currentEtf = useMemo(() => {
    const target = normalizeEtfId(selectedTicker);
    return summaries.find((s) => normalizeEtfId(s.etfId) === target) || summaries[0] || null;
  }, [summaries, selectedTicker]);

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
              { id: 'all', label: '全部標的 (27)' },
              { id: 'tw', label: '台股高息/大盤' },
              { id: 'us', label: '美股科技' },
              { id: 'jp', label: '日股市場' },
              { id: 'bond', label: '公債/投等債' },
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
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 pr-10 cursor-pointer"
          >
            {filteredSummaries.map((s) => (
              <option key={s.etfId} value={s.etfId}>
                {s.etfId} ｜ {s.etfName} ({s.category})
              </option>
            ))}
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
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-amber-400 font-semibold">⚖️ 摩擦阻力 fricScore</div>
                <div className="text-lg font-bold font-mono text-slate-100">{fricScore.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500">稅費與海外預扣折損評級</div>
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
