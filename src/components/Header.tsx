import React from 'react';
import { Target, TrendingUp, Layers, History, Sparkles, Scale, Eye, EyeOff, Radar, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  targetProgressPct: number;
  projectedAnnualDividend: number;
  signalsCount?: number;
  isPrivacyMaskActive?: boolean;
  onTogglePrivacyMask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetProgressPct,
  projectedAnnualDividend,
  signalsCount = 5,
  isPrivacyMaskActive = false,
  onTogglePrivacyMask = () => {},
}) => {
  const tabs = [
    { id: 'overview', label: '總覽概況', icon: TrendingUp },
    { id: 'intelligence', label: '客觀趨勢情報中心', icon: Scale, badge: `${signalsCount}` },
    { id: 'radar', label: '四象限基本面雷達', icon: Radar },
    { id: 'swing', label: '波段觀察', icon: Activity },
    { id: 'dividends', label: '股利入帳與達標試算', icon: Sparkles },
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
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                目標：每年被動股利 50 萬 TWD ｜ 高股息複利再投入
              </p>
            </div>
          </div>

          {/* Quick Info & Privacy Mask Toggle */}
          <div className="flex items-center space-x-4">
            {/* Privacy Mask Toggle Button */}
            <button
              onClick={onTogglePrivacyMask}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isPrivacyMaskActive
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isPrivacyMaskActive ? '點擊解除隱私遮罩（顯示真實財務數字）' : '點擊開啟隱私遮罩（適合展示或公開時隱藏真實個人資產）'}
            >
              {isPrivacyMaskActive ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>隱私遮罩：開啟中</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">開啟隱私保護</span>
                </>
              )}
            </button>

            <div className="flex flex-col text-right">
              <span className="text-xs text-slate-400">目前年股利推估</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {isPrivacyMaskActive ? '••••••' : projectedAnnualDividend.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">/ 500,000 TWD</span>
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
