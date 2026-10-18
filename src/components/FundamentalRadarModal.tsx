import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Radar,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Layers,
  ChevronDown,
  TrendingUp,
  Percent,
  Coins,
  Compass,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  EtfSummaryRow,
  EtfConstituentRow,
  fetchAllMarketSummary,
  fetchAllMarketConstituents,
  ALL_MARKET_ETF_SHEET_ID,
} from '../services/constituentsFeedService';

interface FundamentalRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEtfId?: string;
}

export const FundamentalRadarModal: React.FC<FundamentalRadarModalProps> = ({
  isOpen,
  onClose,
  initialEtfId = '00882',
}) => {
  const [summaries, setSummaries] = useState<EtfSummaryRow[]>([]);
  const [constituents, setConstituents] = useState<EtfConstituentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>(initialEtfId);

  useEffect(() => {
    if (initialEtfId) {
      setSelectedTicker(initialEtfId);
    }
  }, [initialEtfId]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const currentEtf = useMemo(() => {
    return summaries.find((s) => s.etfId === selectedTicker) || summaries[0] || null;
  }, [summaries, selectedTicker]);

  const currentConstituents = useMemo(() => {
    if (!currentEtf) return [];
    return constituents
      .filter((c) => c.etfId === currentEtf.etfId)
      .sort((a, b) => b.weightPct - a.weightPct)
      .slice(0, 10);
  }, [constituents, currentEtf]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Radar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  四象限基本面與風險雷達圖
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                  Look-through Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                穿透各 ETF 底層成分股財務指標，量化四大維度綜合健康度
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticker Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>選擇穿透檢視標的：</span>
          </div>
          <div className="relative inline-block w-full sm:w-80">
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 pr-10 cursor-pointer"
            >
              {summaries.map((s) => (
                <option key={s.etfId} value={s.etfId}>
                  {s.etfId} ｜ {s.etfName} ({s.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p>正在載入全市場 ETF 穿透基本面與評分資料庫…</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            {error}
          </div>
        ) : currentEtf ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: 4-Quadrant Radar Chart */}
            <div className="lg:col-span-6 flex flex-col items-center p-4 rounded-2xl bg-gradient-to-b from-slate-950/60 to-slate-900/60 border border-slate-800">
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

              {/* Radar Area Health Metric */}
              <div className="mt-3 flex items-center justify-between w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-800/80 text-xs">
                <span className="text-slate-400">四維健康覆蓋率：</span>
                <span className="font-mono font-bold text-cyan-400">{areaPct}%</span>
              </div>
            </div>

            {/* Right Column: Metrics, Posture, and Top Holdings */}
            <div className="lg:col-span-6 space-y-4">
              {/* ETF Profile Banner */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black text-slate-100 font-mono tracking-tight">
                      {currentEtf.etfId}
                    </span>
                    <span className="text-sm font-semibold text-slate-300">
                      {currentEtf.etfName}
                    </span>
                  </div>
                  {isYieldTrapRisk ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>高息陷阱警戒</span>
                    </span>
                  ) : isRobustPrime ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>體質穩健優質</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>基準正常運作</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">穿透加權 ROE</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      {currentEtf.weightedRoe}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">底層持股總檔數</div>
                    <div className="text-base font-bold text-cyan-400 font-mono">
                      {currentEtf.constituentCount} 檔
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400">追蹤指數基準</div>
                    <div className="text-xs font-semibold text-slate-300 truncate" title={currentEtf.benchmark}>
                      {currentEtf.benchmark || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Holdings Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>穿透前十大重倉成分股</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    更新日期：{currentEtf.lastModelUpdate}
                  </span>
                </div>

                {currentConstituents.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    此標的無細部成分股權重（或為主動式/國債型配置）。
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto pr-1">
                    {currentConstituents.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-4 text-[10px] text-slate-500 font-mono">{idx + 1}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{c.constituentTicker}</span>
                          <span className="text-slate-200 font-medium">{c.constituentName}</span>
                        </div>
                        <span className="font-mono font-bold text-cyan-400">
                          {c.weightPct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer info & Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          <div>
            數據同步來源：Google Drive 雲端資料庫（免登入唯讀匯流排）
          </div>
          <a
            href={`https://docs.google.com/spreadsheets/d/${ALL_MARKET_ETF_SHEET_ID}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <span>開啟「全市場_ETF成分股資料庫」Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
