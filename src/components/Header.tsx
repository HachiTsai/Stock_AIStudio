import React from 'react';
import { Target, TrendingUp, BookOpen, Layers, History, Sparkles, Scale } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  targetProgressPct: number;
  projectedAnnualDividend: number;
  signalsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetProgressPct,
  projectedAnnualDividend,
  signalsCount = 5,
}) => {
  const tabs = [
    { id: 'overview', label: '總覽概況', icon: TrendingUp },
    { id: 'target-model', label: '股利目標模型', icon: Target, badge: `${targetProgressPct.toFixed(0)}%` },
    { id: 'intelligence', label: '客觀趨勢情報中心', icon: Scale, badge: `${signalsCount}` },
    { id: 'portfolio', label: '持股與快照', icon: Layers },
    { id: 'dividends', label: '股利入帳與二代健保', icon: Sparkles },
    { id: 'transactions', label: '交易與再投入明細', icon: History },
    { id: 'notes', label: '財商架構筆記庫', icon: BookOpen },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl">
              ¥
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">Investment Tracker</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  財商工程大本營
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                目標：每年被動股利 50 萬 TWD ｜ 高股息複利再投入
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex items-center space-x-3">
            <div className="flex flex-col text-right">
              <span className="text-xs text-slate-400">目前年股利推估</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {projectedAnnualDividend.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ 500,000 TWD</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[11px] font-mono ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
