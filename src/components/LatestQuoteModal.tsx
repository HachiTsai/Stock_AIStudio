import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  ArrowRight, 
  Check, 
  Calculator, 
  Coins, 
  Layers, 
  Calendar,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Holding } from '../types/portfolio';
import { 
  calculateRealCostPerShare, 
  calculateYield, 
  calculateMarketValue, 
  formatTWD, 
  formatShares 
} from '../utils/calculations';

interface LatestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: Holding[];
  onUpdateHolding: (holding: Holding) => void;
  onSuccessToast?: (msg: string) => void;
}

export const LatestQuoteModal: React.FC<LatestQuoteModalProps> = ({
  isOpen,
  onClose,
  holdings,
  onUpdateHolding,
  onSuccessToast,
}) => {
  const mainHolding = holdings[0] || null;
  const [selectedHoldingId, setSelectedHoldingId] = useState<string>(mainHolding?.id || '');
  
  const holding = holdings.find((h) => h.id === selectedHoldingId) || mainHolding;

  // Form state
  const [priceInput, setPriceInput] = useState<string>(
    holding ? holding.currentPrice.toFixed(2) : '14.84'
  );
  
  // Default to today's date (2026-10-14)
  const todayStr = new Date().toISOString().split('T')[0];
  const [updateDate, setUpdateDate] = useState<string>(todayStr);

  if (!isOpen || !holding) return null;

  const currentPrice = holding.currentPrice;
  const newPrice = parseFloat(priceInput) || currentPrice;
  
  // Real Cost (constant, based on buy principal)
  const realCostPerShare = calculateRealCostPerShare(holding);

  // Old Calculations
  const oldMarketValue = calculateMarketValue(holding);
  const oldPnL = oldMarketValue - holding.buyTotalCost;
  const oldPnLPct = holding.buyTotalCost > 0 ? (oldPnL / holding.buyTotalCost) * 100 : 0;
  const oldYield = calculateYield(holding);
  const gap = Math.max(0, 500000 - holding.shares * holding.annualDividendPerShare);
  const oldReqCapital = oldYield > 0 ? gap / (oldYield / 100) : 0;
  const oldLotsNeeded = currentPrice > 0 ? Math.round(oldReqCapital / (currentPrice * 1000)) : 0;

  // New Calculations with New Price
  const newMarketValue = holding.shares * newPrice;
  const newPnL = newMarketValue - holding.buyTotalCost;
  const newPnLPct = holding.buyTotalCost > 0 ? (newPnL / holding.buyTotalCost) * 100 : 0;
  const newYield = newPrice > 0 ? (holding.annualDividendPerShare / newPrice) * 100 : 0;
  const newReqCapital = newYield > 0 ? gap / (newYield / 100) : 0;
  const newLotsNeeded = newPrice > 0 ? Math.round(newReqCapital / (newPrice * 1000)) : 0;

  // Diffs
  const marketValueDiff = newMarketValue - oldMarketValue;
  const pnlDiff = newPnL - oldPnL;
  const yieldDiff = newYield - oldYield;
  const reqCapitalDiff = newReqCapital - oldReqCapital;

  const handleStepPrice = (delta: number) => {
    const val = Math.max(0.01, (parseFloat(priceInput) || currentPrice) + delta);
    setPriceInput(val.toFixed(2));
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPrice <= 0) return;

    onUpdateHolding({
      ...holding,
      currentPrice: Number(newPrice.toFixed(2)),
      lastUpdated: updateDate,
    });

    if (onSuccessToast) {
      onSuccessToast(`已更新 ${holding.ticker} ${holding.name} 最新報價至 ${newPrice.toFixed(2)} TWD，所有關聯指標已即時重算！`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>更新最新報價</span>
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  即時聯動重新計算
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                輸入標的收盤或即時股價，系統將自動同步並重新推算所有市值、損益、殖利率與目標模型
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

        {/* Form Body (Scrollable if needed) */}
        <form onSubmit={handleConfirm} className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {/* Target Selector & Current Status */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold text-sm border border-emerald-500/30">
                {holding.ticker}
              </span>
              <div>
                <div className="font-bold text-slate-100 text-sm">{holding.name}</div>
                <div className="text-xs text-slate-400">
                  持股數：{formatShares(holding.shares)} ｜ 現有紀錄：{holding.lastUpdated}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">目前記錄股價</span>
              <span className="font-mono text-base font-bold text-slate-300">
                {currentPrice.toFixed(2)} <span className="text-xs text-slate-500 font-normal">TWD</span>
              </span>
            </div>
          </div>

          {/* New Price & Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price Input */}
            <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>最新股價 (TWD)</span>
                <span className="text-[11px] text-slate-500">可精確至小數兩位</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-emerald-500/50 rounded-xl text-lg font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-400 shadow-inner"
                  placeholder="例如: 15.10"
                />
              </div>

              {/* Quick Step Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                {[
                  { label: '-0.5', val: -0.5 },
                  { label: '-0.1', val: -0.1 },
                  { label: '+0.1', val: 0.1 },
                  { label: '+0.5', val: 0.5 },
                ].map((step) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => handleStepPrice(step.val)}
                    className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-medium transition cursor-pointer"
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>報價更新日期</span>
              </label>
              <input
                type="date"
                required
                value={updateDate}
                onChange={(e) => setUpdateDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 pt-1">
                預設為今日日期（{todayStr}），用於行情時間戳記
              </p>
            </div>
          </div>

          {/* Real-time Calculation Impact Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-teal-400" />
                <span>帶入計算欄位即時預覽（更新前後對比）</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                {priceInput !== currentPrice.toFixed(2) ? '已計算最新數值' : '目前與原數值相符'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Total Market Value */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">持股市值 (股數 × 股價)</span>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-slate-500 line-through text-[11px]">
                    {formatTWD(oldMarketValue)} TWD
                  </span>
                  <span className="text-base font-bold text-slate-100">
                    {formatTWD(newMarketValue)} TWD
                  </span>
                </div>
                <div className="text-[11px] font-mono flex justify-between">
                  <span className="text-slate-500">市值變動：</span>
                  <span className={marketValueDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {marketValueDiff >= 0 ? `+${formatTWD(marketValueDiff)}` : formatTWD(marketValueDiff)} TWD
                  </span>
                </div>
              </div>

              {/* Unrealized Gain */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">未實現資本損益 (市值 − 純買進本金)</span>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-slate-500 line-through text-[11px]">
                    +{formatTWD(oldPnL)} ({oldPnLPct.toFixed(2)}%)
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    +{formatTWD(newPnL)} TWD
                  </span>
                </div>
                <div className="text-[11px] font-mono flex justify-between">
                  <span className="text-slate-500">報酬率：</span>
                  <span className="text-emerald-400 font-semibold">
                    +{newPnLPct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Market Yield */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">市場殖利率 (年配息 1.00 ÷ 股價)</span>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-slate-500 line-through text-[11px]">
                    {oldYield.toFixed(2)}%
                  </span>
                  <span className="text-base font-bold text-teal-300">
                    {newYield.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11px] font-mono flex justify-between">
                  <span className="text-slate-500">殖利率變動：</span>
                  <span className={yieldDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {yieldDiff >= 0 ? `+${yieldDiff.toFixed(2)}%` : `${yieldDiff.toFixed(2)}%`}
                  </span>
                </div>
              </div>

              {/* Required Capital to Goal */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">50 萬目標需追加本金 (缺口 20 萬 ÷ 殖利率)</span>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-slate-500 line-through text-[11px]">
                    ≈ {formatTWD(oldReqCapital)} TWD
                  </span>
                  <span className="text-base font-bold text-amber-300">
                    ≈ {formatTWD(newReqCapital)} TWD
                  </span>
                </div>
                <div className="text-[11px] font-mono flex justify-between">
                  <span className="text-slate-500">需加碼張數：</span>
                  <span className="text-slate-200 font-bold">
                    約 {newLotsNeeded} 張 00882
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real cost reassurance */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>計算口徑提示：</strong> 真實每股成本維持 <strong>{realCostPerShare.toFixed(2)} TWD</strong>（純現金買進本金 ÷ 總持股數，不隨市價浮動）。更新報價將自動刷新總覽、股利模型與 3D 曲線。
            </span>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>確認更新並帶入所有計算</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
