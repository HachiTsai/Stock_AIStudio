import React, { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  Coins, 
  PieChart, 
  ArrowUpRight, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Radar,
} from 'lucide-react';
import { Holding, DividendRecord } from '../types/portfolio';
import { 
  calculateGoalStats, 
  calculateMarketValue, 
  calculateRealCostPerShare, 
  calculateYield, 
  calculateUnrealizedPnL, 
  formatTWD, 
  formatShares 
} from '../utils/calculations';
import { LatestQuoteModal } from './LatestQuoteModal';
import { usePrivacy } from '../context/PrivacyContext';
import { DCSCockpitCard } from './DCSCockpitCard';
import { ScorePoint } from '../services/signalsFeedService';
import { FundamentalRadarModal } from './FundamentalRadarModal';

interface OverviewTabProps {
  holdings: Holding[];
  dividends: DividendRecord[];
  onNavigateTab: (tab: string) => void;
  onUpdateHolding: (holding: Holding) => void;
  latestScore?: ScorePoint | null;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  holdings,
  dividends,
  onNavigateTab,
  onUpdateHolding,
  latestScore = null,
}) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);
  const [radarInitialTicker, setRadarInitialTicker] = useState('00882');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { isPrivacyMaskActive, maskTWD, maskShares, maskRawShares, maskCost, maskPct } = usePrivacy();

  const goalStats = calculateGoalStats(holdings);
  const mainHolding = holdings[0] || null;

  const totalMarketValue = holdings.reduce((sum, h) => sum + calculateMarketValue(h), 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.buyTotalCost, 0);
  const totalPnL = totalMarketValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  // Actual dividends received in 2026
  const ytdDividendsNet = dividends.reduce((sum, d) => sum + d.netAmount, 0);
  const ytdDividendsGross = dividends.reduce((sum, d) => sum + d.grossAmount, 0);
  const ytdNhiTax = dividends.reduce((sum, d) => sum + d.nhiTaxAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400/70 hover:text-emerald-300 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Goal Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <Target className="w-3.5 h-3.5" />
              <span>核心財務里程碑</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              每年被動股利實收 <span className="text-emerald-400 font-mono">500,000</span> TWD
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              以高股息 ETF 為主軸，股息 100% 再投入（Reinvest）啟動複利飛輪。當前推估年股利已達{' '}
              <strong className="text-slate-200">{maskTWD(goalStats.projectedAnnualDividend)} TWD</strong>
              ，進度 <strong className="text-emerald-400">{maskPct(goalStats.progressPct, false)}</strong>。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('radar')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-lg shadow-cyan-600/25 transition cursor-pointer"
              title="查看 27 檔跨市場標的四象限基本面與風險雷達圖"
            >
              <Radar className="w-4 h-4 text-cyan-200" />
              <span>四象限基本面雷達</span>
            </button>
            <button
              onClick={() => setIsQuoteModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/25 transition cursor-pointer"
              title="更新最新標的股價並重新計算所有欄位"
            >
              <RefreshCw className="w-4 h-4 text-emerald-200" />
              <span>最新報價</span>
            </button>
            <button
              onClick={() => onNavigateTab('dividends')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <span>股利模型與複利試算</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Progress Bar & Milestone markers */}
        <div className="mt-8 space-y-3">
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-slate-400">目前達成率</span>
            <span className="font-mono font-bold text-emerald-400 text-base">
              {maskPct(goalStats.progressPct, false)}
              <span className="text-xs text-slate-400 font-normal ml-2">
                (已推估 {maskTWD(goalStats.projectedAnnualDividend)} / 目標 {formatTWD(goalStats.target)} TWD)
              </span>
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-inner"
              style={{ width: `${Math.min(goalStats.progressPct, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
            <span>0% (0)</span>
            <span>25% (12.5萬)</span>
            <span className="text-emerald-400 font-semibold">
              ▲ {isPrivacyMaskActive ? '••%' : `${goalStats.progressPct.toFixed(0)}%`} 目前 ({isPrivacyMaskActive ? '••萬' : `${(goalStats.projectedAnnualDividend / 10000).toFixed(0)}萬`})
            </span>
            <span>75% (37.5萬)</span>
            <span>100% 目標 (50萬)</span>
          </div>
        </div>

        {/* Gap & Required Capital Callout */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-800/80">
          <div className="flex items-center space-x-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">每年股利目標缺口</div>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {maskTWD(goalStats.gap)} <span className="text-xs text-slate-400 font-normal">TWD / 年</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">
                以現行殖利率 {goalStats.weightedYieldPct.toFixed(2)}% 計需追加本金
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                ≈ {maskTWD(goalStats.requiredCapital)}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  TWD (約 {isPrivacyMaskActive ? '•••' : Math.round(goalStats.requiredCapital / ((mainHolding?.currentPrice || 14.84) * 1000))} 張)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心投資決策儀表：年度目標追蹤與配置建議 */}
      {mainHolding && (
        <DCSCockpitCard
          holding={mainHolding}
          latestScore={latestScore}
          onNavigateTab={onNavigateTab}
          onOpenRadar={(ticker) => {
            setRadarInitialTicker(ticker);
            setIsRadarModalOpen(true);
          }}
        />
      )}


      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Market Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1.5 hover:border-slate-700 transition">
          <span className="text-xs text-slate-400">總持股市值</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {maskTWD(totalMarketValue)}
            <span className="text-xs text-slate-500 ml-1">TWD</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>持有總股數：</span>
            <span className="font-mono text-slate-300">
              {maskRawShares(holdings.reduce((sum, h) => sum + h.shares, 0))}
            </span>
          </div>
        </div>

        {/* Real Invested Capital */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1.5 hover:border-slate-700 transition">
          <span className="text-xs text-slate-400">真實買進本金 (不含手續費)</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {maskTWD(totalCost)}
            <span className="text-xs text-slate-500 ml-1">TWD</span>
          </div>
          <div className="text-xs text-slate-400">
            再投入 {isPrivacyMaskActive ? '••' : '18'} 張計為零成本稀釋
          </div>
        </div>

        {/* Unrealized Gain */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1.5 hover:border-slate-700 transition">
          <span className="text-xs text-slate-400">未實現資本損益</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
            +{maskTWD(totalPnL)}
            <span className="text-xs font-semibold text-emerald-500">
              ({maskPct(totalPnLPct)})
            </span>
          </div>
          <div className="text-xs text-slate-400">
            交易手續費已另列 {maskTWD(mainHolding?.totalFees || 7502)}
          </div>
        </div>

        {/* 2026 YTD Dividends */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1.5 hover:border-slate-700 transition">
          <span className="text-xs text-slate-400">2026 年已入帳實收股利</span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-teal-300">
            {maskTWD(ytdDividendsNet)}
            <span className="text-xs text-slate-500 ml-1">TWD</span>
          </div>
          <div className="text-xs text-slate-400">
            扣除二代健保補充保費 {maskTWD(ytdNhiTax)}
          </div>
        </div>
      </div>


      {/* Main Holdings Breakdown & Market Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Holdings Details */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">核心持股部位明細</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsQuoteModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer"
                title="更新標的最新市價並自動連動計算"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>最新報價</span>
              </button>
            </div>
          </div>

          {holdings.map((h) => {
            const realCostPerShare = calculateRealCostPerShare(h);
            const mktYield = calculateYield(h);
            const mktVal = calculateMarketValue(h);
            const pnl = calculateUnrealizedPnL(h);

            return (
              <div
                key={h.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold text-sm border border-emerald-500/20">
                      {h.ticker}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{h.name}</h3>
                      <p className="text-xs text-slate-400">{h.underlyingDesc} ｜ {h.market}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                      殖利率 {mktYield.toFixed(2)}%
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                      年配息 {h.annualDividendPerShare.toFixed(2)} / 股
                    </span>
                  </div>
                </div>

                {/* Sub grid specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">持股股數</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {maskShares(h.shares)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      買進 {isPrivacyMaskActive ? '•••' : h.buyShares.toLocaleString()} + 再投入 {isPrivacyMaskActive ? '•••' : h.reinvestShares.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">現價行情</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {h.currentPrice.toFixed(2)} TWD
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      更新：{h.lastUpdated}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">真實每股成本</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {maskCost(realCostPerShare)} TWD
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      含 {isPrivacyMaskActive ? '••' : (h.reinvestShares / 1000)} 張零成本再投入
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">持股市值</span>
                    <span className="font-mono font-bold text-slate-200 text-sm">
                      {maskTWD(mktVal)} TWD
                    </span>
                    <span className="text-[11px] text-emerald-400 block font-mono">
                      +{maskTWD(pnl.amount)} ({maskPct(pnl.pct)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Real cost methodology banner */}
          <div className="p-3.5 bg-slate-800/30 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-start space-x-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-300">財商工程計算口徑（SSOT）：</span>
              <span className="text-slate-400 ml-1">
                真實成本只計純買進金額；股息再投入（Reinvest）視為零成本稀釋持有均價。交易手續費獨立列帳，不灌入每股成本。
              </span>
            </div>
          </div>
        </div>

        {/* Market Distribution & Quick Actions */}
        <div className="space-y-6">
          {/* Allocation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <PieChart className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-slate-100">市場與標的分佈</h2>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">台股（底層港股中國高股息）</span>
                  <span className="font-mono font-bold text-emerald-400">100.0%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">美股</span>
                  <span className="font-mono text-slate-500">0.0%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-0 h-full bg-blue-500 rounded-full"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">日股</span>
                  <span className="font-mono text-slate-500">0.0%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-0 h-full bg-purple-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Annual Cashflow Schedule Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-slate-100">配息時程與被動現金流</h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">1 月除息 (上半年)</span>
                <span className="font-mono font-bold text-slate-200">0.45 TWD / 股</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">7 月除息 (下半年)</span>
                <span className="font-mono font-bold text-slate-200">0.55 TWD / 股</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-emerald-300 font-medium">合計年配息</span>
                <span className="font-mono font-bold text-emerald-400">1.00 TWD / 股</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('dividends')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <span>檢視完整除息與實收紀錄</span>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Latest Quote Modal */}
      <LatestQuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        holdings={holdings}
        onUpdateHolding={onUpdateHolding}
        onSuccessToast={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 4500);
        }}
      />

      {/* Fundamental & Risk Radar Modal */}
      <FundamentalRadarModal
        isOpen={isRadarModalOpen}
        onClose={() => setIsRadarModalOpen(false)}
        initialEtfId={radarInitialTicker}
      />
    </div>
  );
};


function itemRealCost(holding: Holding | null): string {
  if (!holding || holding.shares <= 0) return '0.00';
  return (holding.buyTotalCost / holding.shares).toFixed(2);
}
