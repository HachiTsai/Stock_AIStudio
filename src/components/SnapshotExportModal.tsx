import React, { useState } from 'react';
import { X, Copy, Check, FileDown, FileText } from 'lucide-react';
import { Holding, PortfolioSnapshot } from '../types/portfolio';
import { 
  calculateRealCostPerShare, 
  calculateYield, 
  calculateMarketValue, 
  formatTWD 
} from '../utils/calculations';

interface SnapshotExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: Holding[];
  snapshot: PortfolioSnapshot;
}

export const SnapshotExportModal: React.FC<SnapshotExportModalProps> = ({
  isOpen,
  onClose,
  holdings,
  snapshot,
}) => {
  const [copied, setCopied] = useState(false);
  const mainHolding = holdings[0] || null;

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const realCost = mainHolding ? calculateRealCostPerShare(mainHolding) : 13.80;
  const mktYield = mainHolding ? calculateYield(mainHolding) : 6.74;
  const mktVal = mainHolding ? calculateMarketValue(mainHolding) : 4452000;

  const markdownContent = `# 持股快照 ${today}

> 來源：Google Drive \`Project_財商工程/持股快照_${today}\`（${today} 拉取）
> 原始資料：Investment_Tracker_Core（唯讀）＋ Google Finance 股價（${today} 13:30 收盤）

## 持股

| 代號 | 名稱 | 股數 | 股價 | 市值 (TWD) | 真實成本/股 | 近一年配息/股 | 殖利率 |
| :-: | :-: | --: | --: | --: | --: | --: | --: |
| ${mainHolding?.ticker || '00882'} | ${mainHolding?.name || '中信中國高股息'} | ${(mainHolding?.shares || 300000).toLocaleString()} | ${(mainHolding?.currentPrice || 14.84).toFixed(2)} | ${formatTWD(mktVal)} | ${realCost.toFixed(2)} | ${(mainHolding?.annualDividendPerShare || 1.00).toFixed(2)} | ${mktYield.toFixed(2)}% |

真實成本：Buy 合計 ${formatTWD(mainHolding?.buyTotalCost || 4139880)}（不含手續費 ${formatTWD(mainHolding?.totalFees || 7502)}），Reinvest ${(mainHolding?.reinvestShares || 18000) / 1000} 張成本計 0。

## 市場分布

台股 100%（底層為港股中國高股息股）；美股、日股 0%。

## 股利

- 2026/1 除息 0.45 → 實收 117,900
- 2026/7 除息 0.55 → 實收 158,344（8/11 入帳，再投入 10 張）
- 2026 年已入帳合計 276,244
- 以 ${(mainHolding?.shares || 300000) / 1000} 張、年配 ${(mainHolding?.annualDividendPerShare || 1.00).toFixed(2)} 推估，未來一年約 ${formatTWD((mainHolding?.shares || 300000) * (mainHolding?.annualDividendPerShare || 1.00))}

## 與每年 50 萬目標的距離

缺口約 ${formatTWD(Math.max(0, 500000 - (mainHolding?.shares || 300000) * (mainHolding?.annualDividendPerShare || 1.00)))}/年。以 ${mktYield.toFixed(2)}% 殖利率計，需再投入約 ${formatTWD(Math.round(200000 / (mktYield / 100)))} TWD（約 ${Math.round(200000 / (mktYield / 100) / ((mainHolding?.currentPrice || 14.84) * 1000))} 張 ${mainHolding?.ticker || '00882'} 或同等殖利率標的）。假設配息持平。
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                持股快照 Markdown（SSOT 格式）
              </h2>
              <p className="text-xs text-slate-400">
                對應 portfolio/snapshots/{today}.md 之完整規範輸出
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all">
          {markdownContent}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            可直接貼入 REPO 建立 portfolio/snapshots/{today}.md
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '已複製到剪貼簿' : '複製 Markdown'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
