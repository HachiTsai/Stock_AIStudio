import React, { useEffect, useMemo, useState } from 'react';
import { Target, RotateCcw, RefreshCw } from 'lucide-react';
import { Holding } from '../types/portfolio';
import { TARGET_ANNUAL_DIVIDEND } from '../utils/calculations';
import { usePrivacy } from '../context/PrivacyContext';
import { Dynamic3DChart } from './Dynamic3DChart';
import {
  MAX_YEARS,
  PlanParams,
  simulatePlan,
  currentMonth,
  round2,
} from '../utils/dividendPlan';

interface DividendPlannerProps {
  holding: Holding | null;
  externalScenario?: { dividendPerShare: number; label: string } | null;
  onClearExternalScenario?: () => void;
}

/** 股利達標試算：參數 → 摘要與 3D 曲面，共用 simulatePlan；點 3D 曲面可套用股價與配息 */
export const DividendPlanner: React.FC<DividendPlannerProps> = ({
  holding,
  externalScenario,
  onClearExternalScenario,
}) => {
  const { isPrivacyMaskActive, maskTWD } = usePrivacy();
  const shares = holding?.shares ?? 300000;
  const basePrice = round2(holding?.currentPrice || 14.84);
  const baseDiv = round2(holding?.annualDividendPerShare || 1.0);

  const [price, setPrice] = useState(basePrice);
  const [divPerShare, setDivPerShare] = useState(baseDiv);
  const [reinvestPct, setReinvestPct] = useState(100);
  const [lumpSumTwd, setLumpSumTwd] = useState(0);
  const [lumpSumMonth, setLumpSumMonth] = useState(currentMonth());
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
    () => ({ shares, price, divPerShare, reinvestPct, lumpSumTwd, lumpSumMonth, target: TARGET_ANNUAL_DIVIDEND }),
    [shares, price, divPerShare, reinvestPct, lumpSumTwd, lumpSumMonth],
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
    setLumpSumMonth(currentMonth());
    onClearExternalScenario?.();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>股利達標試算</span>
          </h2>
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
          <NumInput value={price} onChange={setPrice} step="0.01" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono" />
        </label>
        <label className="space-y-1">
          <span className="text-slate-400">每股年配息（TWD）</span>
          <NumInput value={divPerShare} onChange={setDivPerShare} step="0.01" className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono" />
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
        <div className="space-y-1">
          <span className="text-slate-400">一次加碼（TWD）與買進年月</span>
          <div className="flex gap-2">
            <NumInput
              value={lumpSumTwd}
              onChange={(v) => setLumpSumTwd(Math.max(0, v))}
              step="100000"
              className="w-full min-w-0 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
            />
            <input
              type="month"
              value={lumpSumMonth}
              min={currentMonth()}
              onChange={(e) => setLumpSumMonth(e.target.value)}
              className="px-2 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono [color-scheme:dark]"
            />
          </div>
          {lumpSumTwd > 0 && price > 0 && (
            <span className="block text-[11px] text-slate-500">
              約可買 {isPrivacyMaskActive ? '•••' : Math.floor(lumpSumTwd / price / 1000)} 張（以上方股價計），{lumpSumMonth} 買進
            </span>
          )}
        </div>
      </div>

      {/* 結果摘要 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {[
          ['殖利率', `${result.yieldPct.toFixed(2)}%`],
          ['現在年實收', `${maskTWD(result.annualNetNow)}`],
          ['距目標缺口', result.gapNow === 0 ? '已達標' : `${maskTWD(result.gapNow)}（${isPrivacyMaskActive ? '•••' : result.lotsNeededNow} 張）`],
          ['達標所需時間', result.yearsToTarget === null ? `> ${MAX_YEARS} 年` : `約 ${result.yearsToTarget} 年（${result.reachMonth}）`],
        ].map(([k, v]) => (
          <div key={k} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-slate-400">{k}</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <Dynamic3DChart params={params} centerPrice={centerPrice} centerDiv={baseDiv} onPick={pick} />

    </div>
  );
};

/** 數字輸入框：用字串保存輸入中的內容，避免開頭的 0 卡住或清空後跳回 0 */
const NumInput: React.FC<{ value: number; onChange: (v: number) => void; step?: string; className?: string }> = ({
  value,
  onChange,
  step,
  className,
}) => {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    // 外部改值（最新報價、回到預設、點 3D）時同步；輸入中數值相同則不覆蓋
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      step={step}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
        setText(t);
        onChange(Number(t) || 0);
      }}
      className={className}
    />
  );
};
