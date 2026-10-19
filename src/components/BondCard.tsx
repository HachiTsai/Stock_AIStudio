import React, { useMemo } from 'react';
import { computeBondMetrics, dividendYieldPct } from '../services/bondService';

interface BondCardProps {
  etfId: string;
  /** 即時或快照價格；沒有時使用歷史最後收盤價 */
  price?: number;
}

const fmtDate = (d: string) => `${d.slice(0, 4)}/${d.slice(5, 7)}/${d.slice(8, 10)}`;

export const BondCard: React.FC<BondCardProps> = ({ etfId, price }) => {
  const m = useMemo(() => computeBondMetrics(etfId), [etfId]);
  if (!m) {
    return (
      <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
        {etfId} 尚無價格與配息快照，請執行 <code>npm run fetch:etf</code>。
      </div>
    );
  }
  const px = price && price > 0 ? price : m.lastClose;
  const yld = dividendYieldPct(m, px);

  // 走勢圖（近 120 個交易日收盤價）
  const W = 300;
  const H = 90;
  const lo = Math.min(...m.closes);
  const hi = Math.max(...m.closes);
  const span = hi - lo || 1;
  const pts = m.closes
    .map((c, i) => `${(i / Math.max(1, m.closes.length - 1)) * W},${H - ((c - lo) / span) * (H - 8) - 4}`)
    .join(' ');

  return (
    <div className="lg:col-span-5 flex flex-col p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="text-xs font-bold text-slate-300">【{etfId}】債券 ETF 看板</span>
        <span className="text-[10px] text-slate-500">資料至 {fmtDate(m.asOf)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-sky-400 font-semibold">💰 價格</div>
          <div className="text-xl font-bold font-mono text-slate-100">${px.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500">
            52 週 {m.low52w.toFixed(2)} ~ {m.high52w.toFixed(2)}（位於 {m.rangePosPct.toFixed(0)}%）
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] text-emerald-400 font-semibold">📈 配息殖利率</div>
          <div className="text-xl font-bold font-mono text-slate-100">{yld.toFixed(2)}%</div>
          <div className="text-[10px] text-slate-500">
            近 12 個月配息 {m.dividendTtm.toFixed(2)} 元／{m.dividendCount} 次
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2">
          <div className="text-[10px] text-purple-400 font-semibold">👥 受益人數</div>
          {m.holders ? (
            <>
              <div className="text-xl font-bold font-mono text-slate-100">{m.holders.count.toLocaleString()} 人</div>
              <div className="text-[10px] text-slate-500">
                集保 {fmtDate(m.holders.date)}
                {m.holdersChange
                  ? `　較 ${fmtDate(m.holdersChange.prevDate)} ${m.holdersChange.delta >= 0 ? '+' : ''}${m.holdersChange.delta.toLocaleString()} 人（${m.holdersChange.pct >= 0 ? '+' : ''}${m.holdersChange.pct.toFixed(2)}%）`
                  : '　（尚無前一週資料，每週更新快照後才會顯示增減）'}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">尚無資料</div>
          )}
        </div>
      </div>

      <div>
        <div className="text-[10px] text-slate-400 mb-1">近 120 個交易日收盤價</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
          <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="1.8" />
        </svg>
      </div>

      <div>
        <div className="text-[10px] text-slate-400 mb-1">近期配息（元／單位）</div>
        <div className="flex flex-wrap gap-1.5">
          {m.recentDividends.length ? (
            m.recentDividends.map((d) => (
              <span key={d.date} className="px-2 py-0.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] font-mono text-slate-300">
                {d.date.slice(5)} {d.amount.toFixed(3)}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-500">近 12 個月無配息紀錄</span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        配息殖利率 = 近 365 天配息合計 ÷ 現價，不等於債券到期殖利率（YTM）；配息可能含本金，請搭配價格走勢判讀。價格與配息來自 Yahoo Finance，受益人數來自集保每週資料。
      </p>
    </div>
  );
};
