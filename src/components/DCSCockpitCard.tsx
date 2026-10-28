import React from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  Compass,
  ArrowRight,
  TrendingUp,
  Sliders,
  Cpu,
  Radar,
} from 'lucide-react';
import { Holding } from '../types/portfolio';
import { ScorePoint } from '../services/signalsFeedService';
import { evaluateDCSControl } from '../utils/dcsControlEngine';
import { usePrivacy } from '../context/PrivacyContext';
import { SHOW_INTELLIGENCE_TAB } from '../config/features';

interface DCSCockpitCardProps {
  holding: Holding;
  latestScore: ScorePoint | null;
  onNavigateTab: (tab: string) => void;
  onOpenRadar?: (ticker: string) => void;
}

export const DCSCockpitCard: React.FC<DCSCockpitCardProps> = ({
  holding,
  latestScore,
  onNavigateTab,
  onOpenRadar,
}) => {
  const { isPrivacyMaskActive, maskTWD, maskShares } = usePrivacy();

  const dcs = evaluateDCSControl(
    holding.shares,
    holding.currentPrice,
    holding.annualDividendPerShare,
    latestScore
  );

  // Dynamic visual style based on tactical posture
  const postureStyles = {
    green: {
      badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
      glow: 'shadow-emerald-500/10 border-emerald-500/30',
      icon: Flame,
      indicator: 'bg-emerald-400',
      titleColor: 'text-emerald-400',
    },
    blue: {
      badgeBg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400',
      glow: 'shadow-cyan-500/10 border-cyan-500/30',
      icon: ShieldCheck,
      indicator: 'bg-cyan-400',
      titleColor: 'text-cyan-400',
    },
    orange: {
      badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
      glow: 'shadow-amber-500/10 border-amber-500/30',
      icon: Compass,
      indicator: 'bg-amber-400',
      titleColor: 'text-amber-400',
    },
    yellow: {
      badgeBg: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
      glow: 'shadow-yellow-500/10 border-yellow-500/30',
      icon: ShieldAlert,
      indicator: 'bg-yellow-400',
      titleColor: 'text-yellow-300',
    },
    red: {
      badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
      glow: 'shadow-rose-500/10 border-rose-500/30',
      icon: ShieldAlert,
      indicator: 'bg-rose-400',
      titleColor: 'text-rose-400',
    },
  }[dcs.color] || {
    badgeBg: 'bg-slate-500/15 border-slate-500/40 text-slate-400',
    glow: 'border-slate-800',
    icon: Activity,
    indicator: 'bg-slate-400',
    titleColor: 'text-slate-400',
  };

  const PostureIcon = postureStyles.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border ${postureStyles.glow} p-6 sm:p-7 shadow-xl`}>
      {/* Background soft ambient glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                核心投資決策儀表 ｜ {dcs.ticker}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${postureStyles.indicator}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${postureStyles.indicator}`} />
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              年度股利目標追蹤 & 即時配置建議
            </h2>
          </div>
        </div>

        {/* Strategy Status Pill */}
        <div className={`inline-flex items-center space-x-2.5 px-4 py-2 rounded-xl border text-sm font-bold ${postureStyles.badgeBg} shadow-sm self-start sm:self-auto`}>
          <PostureIcon className="w-4 h-4 shrink-0" />
          <span>{dcs.postureLabel}</span>
        </div>
      </div>

      {/* Action Guide Callout */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-400 shrink-0">
            操作指引
          </span>
          <span className="font-medium text-slate-200">{dcs.actionGuide}</span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            {dcs.scores.status}
          </div>
          {onOpenRadar && (
            <button
              onClick={() => onOpenRadar(dcs.ticker)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-[11px] font-semibold transition cursor-pointer"
              title="檢視量化動態評分矩陣（基本面與穿透風險）"
            >
              <Radar className="w-3.5 h-3.5 text-cyan-400" />
              <span>量化動態評分矩陣</span>
            </button>
          )}
        </div>
      </div>



      {/* Main Grid: Target Progress (SP/PV/Gap) + Snowball Reinvestment */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SP & PV */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>目標年股利 (SP)</span>
            <span className="font-mono text-emerald-400">500,000 TWD/年</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">目前推估年股利 (PV，未扣稅費)</span>
            <span className="text-xl font-bold font-mono text-slate-100">
              {maskTWD(dcs.processValuePV)}
              <span className="text-xs text-slate-500 ml-1">TWD</span>
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
              style={{ width: `${Math.min(dcs.achievementPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>達成率 {dcs.achievementPct}%</span>
            <span>庫存 {maskShares(dcs.currentShares)}</span>
          </div>
        </div>

        {/* Capital Gap */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>目標達成缺口 (Gap)</span>
            <span className="font-mono text-amber-400">
              -{maskTWD(dcs.systemError)} TWD
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">補足缺口所需本金</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              ≈ {maskTWD(dcs.capitalNeededTwd)}
              <span className="text-xs text-slate-500 ml-1">TWD</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60 font-mono">
            <span>需追加張數</span>
            <span className="text-slate-200">約 {isPrivacyMaskActive ? '•••' : dcs.sharesNeededBoards} 張</span>
          </div>
        </div>

        {/* Snowball Reinvestment Timeline */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>股息複利再投入試算 (純股利無額外本金)</span>
            </span>
            <span className="text-[10px] text-slate-500">零額外本金</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">預估達標時間</span>
            <span className="text-2xl font-black font-mono text-cyan-400">
              {dcs.yearsToGoal}{' '}
              <span className="text-sm font-normal text-slate-400">年</span>
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 leading-relaxed">
            半年配息 100% 自動再投入，啟動資產自我繁衍飛輪。
          </div>
        </div>
      </div>

      {/* Sensor telemetry & Interlock thresholds bar */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            現價：<span className="text-slate-200 font-bold">{dcs.currentPrice.toFixed(2)} TWD</span>
          </div>
          <div>
            即時模型殖利率：<span className="text-cyan-400 font-bold">{dcs.modelYieldPct}%</span>
            <span className="text-[10px] text-slate-500 ml-1">
              (便宜 &gt;{dcs.cheapThreshold}% ｜ 偏貴 &lt;{dcs.expensiveThreshold}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>情報庫評分：</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">綜合 {dcs.scores.netScore}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">股利 {dcs.scores.divScore}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-400">估值 {dcs.scores.valScore}</span>
          </div>
        </div>

        {SHOW_INTELLIGENCE_TAB && (
        <button
          onClick={() => onNavigateTab('intelligence')}
          className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-sans text-xs transition cursor-pointer"
        >
          <span>查看情報與評分趨勢</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        )}
      </div>
    </div>
  );
};
