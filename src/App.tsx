import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { TargetModelTab } from './components/TargetModelTab';
import { IntelligenceTab } from './components/IntelligenceTab';
import { PortfolioTab } from './components/PortfolioTab';
import { DividendsTab } from './components/DividendsTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SnapshotExportModal } from './components/SnapshotExportModal';
import { 
  INITIAL_HOLDINGS, 
  INITIAL_DIVIDENDS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SNAPSHOTS, 
  INITIAL_ARCH_NOTE 
} from './data/initialData';
import { fetchSignalsFeed } from './services/signalsFeedService';
import { fetchPortfolioFeed } from './services/portfolioFeedService';
import { Holding, DividendRecord, Transaction, PortfolioSnapshot, IntelligenceSignal } from './types/portfolio';
import { calculateGoalStats } from './utils/calculations';
import { EyeOff } from 'lucide-react';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Holdings state
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    const saved = localStorage.getItem('inv_holdings');
    return saved ? JSON.parse(saved) : INITIAL_HOLDINGS;
  });

  // Dividends state
  const [dividends, setDividends] = useState<DividendRecord[]>(() => {
    const saved = localStorage.getItem('inv_dividends');
    return saved ? JSON.parse(saved) : INITIAL_DIVIDENDS;
  });

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('inv_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Snapshots state
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>(() => {
    const saved = localStorage.getItem('inv_snapshots');
    return saved ? JSON.parse(saved) : INITIAL_SNAPSHOTS;
  });

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

  // 持股與交易明細以 Drive 的「持股資料庫」「交易明細資料庫」為準（排程依 Core 唯讀重建，免登入讀取）。
  // 現價與更新日沿用本機即時報價；讀取失敗時維持本機資料。
  const [portfolioFeedError, setPortfolioFeedError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const prices: Record<string, number> = {};
    holdings.forEach((h) => {
      prices[h.ticker] = h.currentPrice;
    });
    fetchPortfolioFeed(prices)
      .then((feed) => {
        if (cancelled) return;
        setPortfolioFeedError(null);
        if (feed.holdings.length > 0) {
          setHoldings((prev) =>
            feed.holdings.map((h) => {
              const old = prev.find((p) => p.ticker === h.ticker);
              return old ? { ...h, currentPrice: old.currentPrice } : h;
            })
          );
        }
        if (feed.transactions.length > 0) setTransactions(feed.transactions);
      })
      .catch((err) => {
        if (!cancelled) setPortfolioFeedError(err?.message || '讀取持股資料庫失敗');
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
  const [isSnapshotExportOpen, setIsSnapshotExportOpen] = useState(false);

  // Privacy Mask from Context
  const { isPrivacyMaskActive, togglePrivacyMask } = usePrivacy();

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('inv_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('inv_dividends', JSON.stringify(dividends));
  }, [dividends]);

  useEffect(() => {
    localStorage.setItem('inv_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('inv_snapshots', JSON.stringify(snapshots));
  }, [snapshots]);

  useEffect(() => {
    localStorage.setItem('inv_intelligence_signals', JSON.stringify(signals));
  }, [signals]);

  const mainHolding = holdings[0] || INITIAL_HOLDINGS[0];
  const goalStats = calculateGoalStats(holdings);

  // Handlers
  const handleUpdateHolding = (updated: Holding) => {
    setHoldings(holdings.map((h) => (h.id === updated.id ? updated : h)));
  };

  const handleAddDividend = (record: DividendRecord) => {
    setDividends([record, ...dividends]);
    if (record.reinvestedShares > 0) {
      setHoldings(
        holdings.map((h) => {
          if (h.ticker === record.ticker) {
            return {
              ...h,
              shares: h.shares + record.reinvestedShares,
              reinvestShares: h.reinvestShares + record.reinvestedShares,
            };
          }
          return h;
        })
      );
      const newTx: Transaction = {
        id: `tx-reinvest-${Date.now()}`,
        ticker: record.ticker,
        date: record.paymentDate,
        type: 'Reinvest',
        shares: record.reinvestedShares,
        price: mainHolding.currentPrice,
        fees: 0,
        notes: `股利入帳後再投入 ${(record.reinvestedShares / 1000).toFixed(0)} 張（零成本）`,
      };
      setTransactions([newTx, ...transactions]);
    }
  };

  const handleAddTransaction = (tx: Transaction) => {
    setTransactions([tx, ...transactions]);
    setHoldings(
      holdings.map((h) => {
        if (h.ticker === tx.ticker) {
          if (tx.type === 'Buy') {
            const cost = tx.shares * tx.price;
            return {
              ...h,
              shares: h.shares + tx.shares,
              buyShares: h.buyShares + tx.shares,
              buyTotalCost: h.buyTotalCost + cost,
              totalFees: h.totalFees + tx.fees,
            };
          } else if (tx.type === 'Reinvest') {
            return {
              ...h,
              shares: h.shares + tx.shares,
              reinvestShares: h.reinvestShares + tx.shares,
              totalFees: h.totalFees + tx.fees,
            };
          } else if (tx.type === 'Sell') {
            return {
              ...h,
              shares: Math.max(0, h.shares - tx.shares),
              totalFees: h.totalFees + tx.fees,
            };
          }
        }
        return h;
      })
    );
  };

  const handleApplyScenarioToModel = (dividendPerShare: number, label: string) => {
    setExternalScenario({ dividendPerShare, label });
    setActiveTab('target-model');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetProgressPct={goalStats.progressPct}
        projectedAnnualDividend={goalStats.projectedAnnualDividend}
        signalsCount={signals.length}
        isPrivacyMaskActive={isPrivacyMaskActive}
        onTogglePrivacyMask={togglePrivacyMask}
      />

      {/* Global Privacy Mask Active Reminder Banner */}
      {isPrivacyMaskActive && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 shadow-sm animate-fade-in sticky top-16 z-30 backdrop-blur-md">
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
        {activeTab === 'overview' && (
          <OverviewTab
            holdings={holdings}
            dividends={dividends}
            latestSnapshot={snapshots[0]}
            onNavigateTab={setActiveTab}
            onOpenNewSnapshot={() => setIsSnapshotExportOpen(true)}
            onUpdateHolding={handleUpdateHolding}
          />
        )}

        {activeTab === 'target-model' && (
          <TargetModelTab
            holdings={holdings}
            archNote={INITIAL_ARCH_NOTE}
            externalScenario={externalScenario}
            onClearExternalScenario={() => setExternalScenario(null)}
          />
        )}

        {portfolioFeedError && ['overview', 'portfolio', 'transactions'].includes(activeTab) && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {portfolioFeedError}。目前顯示的是本機資料；請確認「持股快照與交易紀錄」資料夾為公開連結後重新整理。
          </div>
        )}

        {activeTab === 'intelligence' && signalsFeedError && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {signalsFeedError}。目前顯示的是本機快取；請確認「情報與趨勢」資料夾為公開連結後重新整理。
          </div>
        )}

        {activeTab === 'intelligence' && (
          <IntelligenceTab
            signals={signals}
            baseDividendPerShare={mainHolding.annualDividendPerShare}
            onApplyScenarioToModel={handleApplyScenarioToModel}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioTab
            holdings={holdings}
            snapshots={snapshots}
            onUpdateHolding={handleUpdateHolding}
            onOpenNewSnapshot={() => setIsSnapshotExportOpen(true)}
          />
        )}

        {activeTab === 'dividends' && (
          <DividendsTab
            dividends={dividends}
            onAddDividend={handleAddDividend}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            holding={mainHolding}
            onAddTransaction={handleAddTransaction}
          />
        )}
      </main>

      {/* Snapshot Export Modal */}
      <SnapshotExportModal
        isOpen={isSnapshotExportOpen}
        onClose={() => setIsSnapshotExportOpen(false)}
        holdings={holdings}
        snapshot={snapshots[0]}
      />
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
