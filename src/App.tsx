import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IntelligenceTab } from './components/IntelligenceTab';
import { PlannerTab } from './components/PlannerTab';
import { RadarTab } from './components/RadarTab';
import { SwingTab } from './components/SwingTab';
import { fetchSignalsFeed } from './services/signalsFeedService';
import { IntelligenceSignal } from './types/portfolio';
import { EyeOff } from 'lucide-react';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';
import { SHOW_INTELLIGENCE_TAB, SHOW_PLANNER_TAB } from './config/features';

// 情報中心情境試算的預設每股年配息（模型 v6 的假設值，非持股資料）
const DEFAULT_ANNUAL_DIVIDEND_PER_SHARE = 0.86;

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('radar');

  // Intelligence Signals state
  // 資料來源為 Drive「情報資料庫」（免登入讀取）；localStorage 只當離線快取與使用者自己新增的訊號
  const [signals, setSignals] = useState<IntelligenceSignal[]>(() => {
    try {
      const saved = localStorage.getItem('inv_intelligence_signals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [signalsFeedError, setSignalsFeedError] = useState<string | null>(null);
  // 舊版曾把刪除的訊號 id 記在本機；已移除刪除功能，清掉舊記錄讓被隱藏的訊號回來。
  useEffect(() => {
    try {
      localStorage.removeItem('inv_deleted_signal_ids');
    } catch {
      /* 無法存取本機儲存時忽略 */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSignalsFeed()
      .then((feed) => {
        if (cancelled) return;
        setSignalsFeedError(null);
        setSignals((prev) => {
          const feedIds = new Set(feed.map((f) => f.id));
          const mine = prev.filter((s) => !feedIds.has(s.id) && s.syncedToDrive !== true);
          return [...feed, ...mine];
        });
      })
      .catch((err) => {
        if (!cancelled) setSignalsFeedError(err?.message || '讀取情報資料庫失敗');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External scenario bridged from Intelligence Hub to 3D Target Model
  const [externalScenario, setExternalScenario] = useState<{
    dividendPerShare: number;
    label: string;
  } | null>(null);

  // Modals state

  // Privacy Mask from Context
  const { isPrivacyMaskActive, togglePrivacyMask } = usePrivacy();

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('inv_intelligence_signals', JSON.stringify(signals));
  }, [signals]);

  const handleApplyScenarioToModel = (dividendPerShare: number, label: string) => {
    setExternalScenario({ dividendPerShare, label });
    if (SHOW_PLANNER_TAB) setActiveTab('planner');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        signalsCount={signals.length}
        isPrivacyMaskActive={isPrivacyMaskActive}
        onTogglePrivacyMask={togglePrivacyMask}
      />

      {/* Global Privacy Mask Active Reminder Banner */}
      {isPrivacyMaskActive && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 shadow-sm animate-fade-in z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium">
                隱私遮罩保護中：個人總持股市值、張數、買進本金、未實現損益、逐期入帳金額與交易紀錄均已全面遮蔽（適合投影片展示、螢幕分享與公開操作）
              </span>
            </div>
            <button
              onClick={togglePrivacyMask}
              className="ml-4 px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold cursor-pointer shrink-0 transition"
              title="解除隱私遮罩"
            >
              解除遮罩
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {SHOW_INTELLIGENCE_TAB && activeTab === 'intelligence' && signalsFeedError && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {signalsFeedError}。目前顯示的是本機快取；請確認 Portfolio_00882 下的「情報與趨勢」資料夾為公開連結後重新整理。
          </div>
        )}

        {SHOW_INTELLIGENCE_TAB && activeTab === 'intelligence' && (
          <IntelligenceTab
            signals={signals}
            baseDividendPerShare={DEFAULT_ANNUAL_DIVIDEND_PER_SHARE}
            ticker="00882"
            onApplyScenarioToModel={handleApplyScenarioToModel}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'radar' && (
          <RadarTab initialTicker="00882" />
        )}

        {activeTab === 'swing' && <SwingTab />}

        {SHOW_PLANNER_TAB && activeTab === 'planner' && (
          <PlannerTab
            externalScenario={externalScenario}
            onClearExternalScenario={() => setExternalScenario(null)}
          />
        )}

      </main>

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PrivacyProvider>
      <AppContent />
    </PrivacyProvider>
  );
};
