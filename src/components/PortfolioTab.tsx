import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  FileText, 
  Download, 
  Edit3, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Holding, PortfolioSnapshot } from '../types/portfolio';
import { 
  calculateRealCostPerShare, 
  calculateYield, 
  calculateMarketValue, 
  calculateUnrealizedPnL, 
  formatTWD, 
  formatShares 
} from '../utils/calculations';

interface PortfolioTabProps {
  holdings: Holding[];
  snapshots: PortfolioSnapshot[];
  onUpdateHolding: (holding: Holding) => void;
  onOpenNewSnapshot: () => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  holdings,
  snapshots,
  onUpdateHolding,
  onOpenNewSnapshot,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editDividend, setEditDividend] = useState<string>('');

  const startEdit = (h: Holding) => {
    setEditingId(h.id);
    setEditPrice(h.currentPrice.toString());
    setEditDividend(h.annualDividendPerShare.toString());
  };

  const saveEdit = (h: Holding) => {
    const p = parseFloat(editPrice);
    const d = parseFloat(editDividend);
    if (!isNaN(p) && p > 0 && !isNaN(d) && d >= 0) {
      onUpdateHolding({
        ...h,
        currentPrice: p,
        annualDividendPerShare: d,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Holdings Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>當前持股名冊</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">核心標的與持股真實成本</h1>
            <p className="text-sm text-slate-400 mt-1">
              遵循「真實成本只計純買進，股息再投入計為零成本」準則
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewSnapshot}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>記錄新快照</span>
            </button>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">代號 / 名稱</th>
                <th className="py-3.5 px-4">總股數 (張數)</th>
                <th className="py-3.5 px-4">現價 (TWD)</th>
                <th className="py-3.5 px-4">真實每股成本</th>
                <th className="py-3.5 px-4">總市值</th>
                <th className="py-3.5 px-4">未實現損益</th>
                <th className="py-3.5 px-4">年配息 / 殖利率</th>
                <th className="py-3.5 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {holdings.map((h) => {
                const realCost = calculateRealCostPerShare(h);
                const mktVal = calculateMarketValue(h);
                const pnl = calculateUnrealizedPnL(h);
                const mktYield = calculateYield(h);
                const isEditing = editingId === h.id;

                return (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {h.ticker}
                        </span>
                        <div>
                          <div className="font-bold text-slate-100">{h.name}</div>
                          <div className="text-[11px] text-slate-400">{h.underlyingDesc}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-slate-100">{formatShares(h.shares)}</div>
                      <div className="text-[11px] text-slate-400">
                        買進 {h.buyShares.toLocaleString()} ｜ 再投入 {h.reinvestShares.toLocaleString()} (零成本)
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-950 border border-emerald-500 rounded text-slate-100"
                        />
                      ) : (
                        <div>
                          <span className="font-bold text-slate-100 text-sm">{h.currentPrice.toFixed(2)}</span>
                          <span className="text-[11px] text-slate-500 block">{h.lastUpdated}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-emerald-400 text-sm">{realCost.toFixed(2)}</div>
                      <div className="text-[11px] text-slate-400">
                        本金 {formatTWD(h.buyTotalCost)}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-slate-100 text-sm">{formatTWD(mktVal)}</div>
                      <div className="text-[11px] text-slate-500">TWD</div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <div className="font-bold text-emerald-400">+{formatTWD(pnl.amount)}</div>
                      <div className="text-[11px] text-emerald-500">+{pnl.pct.toFixed(2)}%</div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editDividend}
                          onChange={(e) => setEditDividend(e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-950 border border-emerald-500 rounded text-slate-100"
                        />
                      ) : (
                        <div>
                          <span className="font-bold text-teal-400">{mktYield.toFixed(2)}%</span>
                          <span className="text-[11px] text-slate-400 block">
                            年配 {h.annualDividendPerShare.toFixed(2)} / 股
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right">
                      {isEditing ? (
                        <button
                          onClick={() => saveEdit(h)}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                          title="儲存行情變動"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(h)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="修改行情股價或配息"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot History Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-teal-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">歷史持股快照 (Snapshots Archive)</h2>
              <p className="text-xs text-slate-400">儲存於 portfolio/snapshots/YYYY-MM-DD.md 之時間序列備忘</p>
            </div>
          </div>

          <button
            onClick={onOpenNewSnapshot}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>匯出 / 預覽 Markdown 快照</span>
          </button>
        </div>

        <div className="space-y-4">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-teal-300 border border-slate-700">
                    {snap.date}
                  </span>
                  <h3 className="font-bold text-slate-100 text-sm">{snap.title}</h3>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-400">市值：</span>
                  <span className="font-bold text-slate-200">{formatTWD(snap.totalMarketValue)} TWD</span>
                  <span className="text-slate-500">｜</span>
                  <span className="text-slate-400">推估年股利：</span>
                  <span className="font-bold text-emerald-400">{formatTWD(snap.projectedAnnualDividend)} TWD</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {snap.notes}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
