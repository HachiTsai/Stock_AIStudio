import React, { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Holding } from '../types/portfolio';
import { DividendPlanner } from './DividendPlanner';
import { ConstituentsPanel } from './ConstituentsPanel';

interface PlannerTabProps {
  externalScenario?: { dividendPerShare: number; label: string } | null;
  onClearExternalScenario?: () => void;
}

const STORAGE_KEY = 'planner_inputs';
const DEFAULTS = { ticker: '00882', lots: 100 };

/** 年股利試算：持股張數由使用者手動輸入，只存在這台裝置的瀏覽器，不讀、不寫任何試算表 */
export const PlannerTab: React.FC<PlannerTabProps> = ({ externalScenario, onClearExternalScenario }) => {
  const [ticker, setTicker] = useState<string>(DEFAULTS.ticker);
  const [lots, setLots] = useState<number>(DEFAULTS.lots);
  const [lotsText, setLotsText] = useState<string>(String(DEFAULTS.lots));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved.ticker === 'string' && Number.isFinite(saved.lots)) {
        setTicker(saved.ticker);
        setLots(saved.lots);
        setLotsText(String(saved.lots));
      }
    } catch {
      /* 無法存取本機儲存時沿用預設 */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ticker, lots }));
    } catch {
      /* 無法存取本機儲存時忽略 */
    }
  }, [ticker, lots]);

  // 試算只需要持股數、標的與預設報價；其餘欄位是 Holding 型別要求，給中性值
  const holding: Holding = {
    id: `planner-${ticker}`,
    ticker,
    name: ticker,
    shares: Math.max(0, Math.round(lots * 1000)),
    currentPrice: 0,
    buyTotalCost: 0,
    buyShares: 0,
    reinvestShares: 0,
    totalFees: 0,
    annualDividendPerShare: 0,
    market: '台股',
    underlyingDesc: '',
    lastUpdated: '',
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <span>試算的持股（手動輸入）</span>
        </h2>
        <p className="text-xs text-slate-400">只存在這台裝置的瀏覽器，不會上傳，也不從任何試算表讀取。</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs max-w-md">
          <label className="space-y-1">
            <span className="text-slate-400">標的代號</span>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase())}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
            />
          </label>
          <label className="space-y-1">
            <span className="text-slate-400">持有張數</span>
            <input
              type="text"
              inputMode="decimal"
              value={lotsText}
              onChange={(e) => {
                const t = e.target.value.replace(/[^0-9.]/g, '');
                setLotsText(t);
                setLots(Number(t) || 0);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
            />
          </label>
        </div>
      </div>

      {/* shares 或標的變動時重新掛載，讓試算以新持股數的預設值重新起算 */}
      <DividendPlanner
        key={`${ticker}-${holding.shares}`}
        holding={holding}
        externalScenario={externalScenario}
        onClearExternalScenario={onClearExternalScenario}
      />

      <ConstituentsPanel />
    </div>
  );
};
