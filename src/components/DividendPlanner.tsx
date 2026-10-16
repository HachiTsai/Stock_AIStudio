import React, { useEffect, useMemo, useState } from 'react';
import { Target, RotateCcw, RefreshCw } from 'lucide-react';
import { Holding } from '../types/portfolio';
import { TARGET_ANNUAL_DIVIDEND } from '../utils/calculations';
import { usePrivacy } from '../context/PrivacyContext';
import { Dynamic3DChart } from './Dynamic3DChart';
import {
  MODEL_DIV_PER_SHARE,
  MAX_YEARS,
  PlanParams,
  simulatePlan,
  priceSteps,
  divSteps,
  round2,
} from '../utils/dividendPlan';

interface DividendPlannerProps {
  holding: Holding | null;
  externalScenario?: { dividendPerShare: number; label: string } | null;
  onClearExternalScenario?: () => void;
}

/** 股利達標試算：四個參數 → 3D 曲面與情境矩陣，兩邊共用 simulatePlan 並雙向同步 */
export const DividendPlanner: React.FC<DividendPlannerProps> = ({
  holding,
  externalScenario,
  onClearExternalScenario,
}) => {
  const { isPrivacyMaskActive, maskTWD } = usePrivacy();
  const shares = holding?.shares ?? 300000;
  const basePrice = round2(holding?.currentPrice || 14.84);
  const baseDiv = MODEL_DIV_PER_SHARE;

  const [price, setPrice] = useState(basePrice);
  const [divPerShare, setDivPerShare] = useState(baseDiv);
  const [reinvestPct, setReinvestPct] = useState(100);
  const [lumpSumTwd, setLumpSumTwd] = useState(0);
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [centerPrice, setCenterPrice] = useState(basePrice);
  const [quoteInfo, setQuoteInfo] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);

  // 免費公開報價（後端 /api/market-quote，Yahoo Finance），帶入股價並以新價重設 3D 曲面中心
  const fetchLatestQuote = async () => {
    setIsFetchingQuote(true);
    setQuoteError(null);
    try {
      const res = await fetch(`/api/market-quote?ticker=${encodeURIComponent(holding?.ticker || '00882')}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '抓取報價失敗');
      const p = round2(data.price);
      setPrice(p);
      setCenterPrice(p);
      setQuoteInfo(`最新報價 ${p.toFixed(2)}（${data.change >= 0 ? '+' : ''}${data.change}／${data.changePct}%），${data.date} ${data.time}，來源 ${data.source}`);
    } catch (err: any) {
      setQuoteError(err?.message || '抓取報價失敗');
    } finally {
      setIsFetchingQuote(false);
    }
  };

  useEffect(() => {
    if (externalScenario) setDivPerShare(round2(externalScenario.dividendPerShare));
  }, [externalScenario]);

  const params: PlanParams = useMemo(
    () => ({ shares, price, divPerShare, reinvestPct, lumpSumTwd, target: TARGET_ANNUAL_DIVIDEND }),
    [shares, price, divPerShare, reinvestPct, lumpSumTwd],
  );
  const result = simulatePlan(params);

  const pick = (p: number, d: number) => {
    setPrice(round2(p));
    setDivPerShare(round2(d));
  };
  const reset = () => {
    setPrice(basePrice);
    setCenterPrice(basePrice);
    setDivPerShare(baseDiv);
    setQuoteInfo(null);
    setReinvestPct(100);
    setLumpSumTwd(0);
    onClearExternalScenario?.();
  };

  const prices = priceSteps(price);
  const divs = divSteps(divPerShare);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>股利達標試算</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            預設配息 {baseDiv.toFixed(2)} 為股利目標模型 v6 推估。假設股價與配息持平、半年配、二代健保約 0.72%；結果為推估，不是保證。
          </p>
          {externalScenario && (
            <p className="text-xs text-amber-300 mt-1">已套用情報中心情境：{externalScenario.label}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
        <button
          onClick={fetchLatestQuote}
          disabled={isFetchingQuote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-xs text-white font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuote ? 'animate-spin' : ''}`} />
          <span>{isFetchingQuote ? '抓取中…' : '最新報價'}</span>
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>回到預設</span>
        </button>
        </div>
      </div>
      {quoteInfo && <p className="text-xs text-teal-300 -mt-3">{quoteInfo}</p>}
      {quoteError && <p className="text-xs text-rose-400 -mt-3">{quoteError}。可直接在股價欄手動輸入。</p>}

      {/* 四個參數 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <label className="space-y-1">
          <span className="text-slate-400">股價（TWD）</span>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400">每股年配息（TWD）</span>
          <input
            type="number"
            step="0.01"
            value={divPerShare}
            onChange={(e) => setDivPerShare(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400">股息再投入比例：{reinvestPct}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={reinvestPct}
            onChange={(e) => setReinvestPct(Number(e.target.value))}
            className="w-full accent-emerald-500 mt-2"
          />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400">現在一次加碼（TWD）</span>
          <input
            type="number"
            step="100000"
            value={lumpSumTwd}
            onChange={(e) => setLumpSumTwd(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
          />
        </label>
      </div>

      {/* 結果摘要 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {[
          ['殖利率', `${result.yieldPct.toFixed(2)}%`],
          ['現在年實收', `${maskTWD(result.annualNetNow)}`],
          ['距目標缺口', result.gapNow === 0 ? '已達標' : `${maskTWD(result.gapNow)}（${isPrivacyMaskActive ? '•••' : result.lotsNeededNow} 張）`],
          ['達標所需時間', result.yearsToTarget === null ? `> ${MAX_YEARS} 年` : `約 ${result.yearsToTarget} 年`],
        ].map(([k, v]) => (
          <div key={k} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">{k}</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <Dynamic3DChart params={params} centerPrice={centerPrice} centerDiv={baseDiv} onPick={pick} />

      {/* 情境矩陣：以目前設定為中心，點格子套用，3D 黃點同步移動 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-100">情境矩陣（股價 × 配息）</h3>
          <span className="text-[11px] text-slate-500">每格：殖利率／達標年數／現在缺幾張。點格子套用，3D 黃點跟著移動。</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-center text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-left">股價＼配息</th>
                {divs.map((d) => (
                  <th key={d} className={`py-2.5 px-3 ${d === divPerShare ? 'text-amber-400' : ''}`}>
                    {d.toFixed(2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {prices.map((p) => (
                <tr key={p} className="font-mono">
                  <td className={`py-2.5 px-3 text-left font-bold ${p === price ? 'text-amber-400' : 'text-teal-300'}`}>
                    {p.toFixed(2)}
                  </td>
                  {divs.map((d) => {
                    const r = simulatePlan({ ...params, price: p, divPerShare: d });
                    const key = `${p}-${d}`;
                    const isCurrent = p === price && d === divPerShare;
                    return (
                      <td
                        key={key}
                        onClick={() => pick(p, d)}
                        onMouseEnter={() => setHoverCell(key)}
                        onMouseLeave={() => setHoverCell(null)}
                        className={`py-2 px-2 cursor-pointer transition ${
                          isCurrent
                            ? 'bg-amber-500/15 outline outline-2 outline-amber-400 font-bold'
                            : hoverCell === key
                            ? 'bg-slate-800/70'
                            : ''
                        }`}
                      >
                        <div className="text-slate-100">{r.yieldPct.toFixed(2)}%</div>
                        <div className={r.yearsToTarget === null ? 'text-rose-400' : 'text-emerald-400'}>
                          {r.yearsToTarget === null ? `>${MAX_YEARS}年` : `${r.yearsToTarget}年`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {r.gapNow === 0 ? '達標' : isPrivacyMaskActive ? '缺 ••• 張' : `缺 ${r.lotsNeededNow} 張`}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
