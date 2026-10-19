import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { IntelligenceTab } from './components/IntelligenceTab';
import { DividendsTab } from './components/DividendsTab';
import { RadarTab } from './components/RadarTab';
import { 
  INITIAL_HOLDINGS, 
  INITIAL_DIVIDENDS, 
  INITIAL_TRANSACTIONS,
} from './data/initialData';
import { fetchSignalsFeed, fetchScoreHistory, ScorePoint } from './services/signalsFeedService';
import { fetchPortfolioFeed } from './services/portfolioFeedService';
import { fetchLiveEtfQuotes } from './services/constituentsFeedService';
import { Holding, DividendRecord, Transaction, IntelligenceSignal } from './types/portfolio';
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
    if (!saved) return INITIAL_DIVIDENDS;
    try {
      const parsed: DividendRecord[] = JSON.parse(saved);
      // 自動升級：若本機快照中 00882 的 2026-01 配息尚未更新二代健保扣繳，自動升級為實證金額
      return parsed.map((d) => {
        if (d.id === 'div-2026-01' && (d.nhiTaxAmount === 0 || d.netAmount === 117900)) {
          return {
            ...d,
            nhiTaxAmount: 1216,
            netAmount: 116684,
            notes: '1 月除息 0.45，給付總額 117,900，其中大陸營利所得 57,640 (48.89%) 扣繳二代健保 1,216，實收 116,684。',
          };
        }
        return d;
      });
    } catch {
      return INITIAL_DIVIDENDS;
    }
  });

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('inv_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
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

  // DCS 控制系統所需之情報庫評分歷史（讀取評分歷史分頁最後一列）
  const [latestScore, setLatestScore] = useState<ScorePoint | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchScoreHistory()
      .then((history) => {
        if (!cancelled && history.length > 0) {
          setLatestScore(history[history.length - 1]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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

  // 自動向伺服器同步持股標的的最新即時報價，確保總覽概況「現價行情」與即時報價 100% 同步
  useEffect(() => {
    const tickers = holdings.map((h) => h.ticker);
    if (tickers.length === 0) return;
    let cancelled = false;

    fetchLiveEtfQuotes(tickers)
      .then((quotes) => {
        if (cancelled) return;
        setHoldings((prev) =>
          prev.map((h) => {
            const q = quotes[h.ticker];
            if (q && q.price > 0 && (q.price !== h.currentPrice || !h.lastUpdated)) {
              const dateStr = q.time ? q.time.slice(0, 10) : h.lastUpdated;
              return {
                ...h,
                currentPrice: q.price,
                lastUpdated: dateStr,
              };
            }
            return h;
          })
        );
      })
      .catch((err) => {
        console.warn('同步持股即時報價失敗，沿用快照價格:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [holdings.length]);

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
    localStorage.setItem('inv_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('inv_dividends', JSON.stringify(dividends));
  }, [dividends]);

  useEffect(() => {
    localStorage.setItem('inv_transactions', JSON.stringify(transactions));
  }, [transactions]);

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
      const exists = holdings.some((h) => h.ticker === record.ticker);
      if (exists) {
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
      } else {
        // 新持股標的（若以前尚未持有該 ETF，自動納入持股清單）
        const newHolding: Holding = {
          id: `holding-${record.ticker}`,
          ticker: record.ticker,
          name: record.ticker,
          shares: record.reinvestedShares,
          currentPrice: record.reinvestedAmount && record.reinvestedShares > 0
            ? record.reinvestedAmount / record.reinvestedShares
            : 15.0,
          buyTotalCost: 0,
          buyShares: 0,
          reinvestShares: record.reinvestedShares,
          totalFees: 0,
          annualDividendPerShare: record.dividendPerShare,
          market: '台股',
          underlyingDesc: `${record.ticker} 配息再投入部位`,
          lastUpdated: record.paymentDate,
        };
        setHoldings([...holdings, newHolding]);
      }
      const existingHolding = holdings.find((h) => h.ticker === record.ticker);
      const reinvestPrice = record.reinvestedAmount && record.reinvestedShares > 0
        ? record.reinvestedAmount / record.reinvestedShares
        : (existingHolding?.currentPrice || mainHolding.currentPrice);

      const newTx: Transaction = {
        id: `tx-reinvest-${Date.now()}`,
        ticker: record.ticker,
        date: record.paymentDate,
        type: 'Reinvest',
        shares: record.reinvestedShares,
        price: reinvestPrice,
        fees: 0,
        notes: `${record.ticker} 股利入帳後再投入 ${(record.reinvestedShares / 1000).toFixed(0)} 張（零成本）`,
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
    setActiveTab('dividends');
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
            onNavigateTab={setActiveTab}
            onUpdateHolding={handleUpdateHolding}
            latestScore={latestScore}
          />
        )}


        {portfolioFeedError && activeTab === 'overview' && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {portfolioFeedError}。目前顯示的是本機資料；請確認 Portfolio_00882 下的「持股快照與交易紀錄」資料夾為公開連結後重新整理。
          </div>
        )}

        {activeTab === 'intelligence' && signalsFeedError && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {signalsFeedError}。目前顯示的是本機快取；請確認 Portfolio_00882 下的「情報與趨勢」資料夾為公開連結後重新整理。
          </div>
        )}

        {activeTab === 'intelligence' && (
          <IntelligenceTab
            signals={signals}
            baseDividendPerShare={mainHolding.annualDividendPerShare}
            onApplyScenarioToModel={handleApplyScenarioToModel}
          />
        )}

        {activeTab === 'radar' && (
          <RadarTab initialTicker={mainHolding?.ticker || '00882'} />
        )}

        {activeTab === 'dividends' && (
          <DividendsTab
            holdings={holdings}
            dividends={dividends}
            onAddDividend={handleAddDividend}
            holding={mainHolding}
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
