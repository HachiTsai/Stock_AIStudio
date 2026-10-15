import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { TargetModelTab } from './components/TargetModelTab';
import { IntelligenceTab } from './components/IntelligenceTab';
import { PortfolioTab } from './components/PortfolioTab';
import { DividendsTab } from './components/DividendsTab';
import { TransactionsTab } from './components/TransactionsTab';
import { NotesTab } from './components/NotesTab';
import { SnapshotExportModal } from './components/SnapshotExportModal';
import { 
  INITIAL_HOLDINGS, 
  INITIAL_DIVIDENDS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SNAPSHOTS, 
  INITIAL_ARCH_NOTE 
} from './data/initialData';
import { INITIAL_INTELLIGENCE_SIGNALS } from './utils/intelligenceEngine';
import { Holding, DividendRecord, Transaction, PortfolioSnapshot, ArchNote, IntelligenceSignal } from './types/portfolio';
import { calculateGoalStats } from './utils/calculations';

export const App: React.FC = () => {
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

  // Notes state
  const [notes, setNotes] = useState<ArchNote[]>(() => {
    const saved = localStorage.getItem('inv_notes');
    return saved ? JSON.parse(saved) : [INITIAL_ARCH_NOTE];
  });

  // Intelligence Signals state
  const [signals, setSignals] = useState<IntelligenceSignal[]>(() => {
    const saved = localStorage.getItem('inv_intelligence_signals');
    return saved ? JSON.parse(saved) : INITIAL_INTELLIGENCE_SIGNALS;
  });

  // External scenario bridged from Intelligence Hub to 3D Target Model
  const [externalScenario, setExternalScenario] = useState<{
    dividendPerShare: number;
    label: string;
  } | null>(null);

  // Modals state
  const [isSnapshotExportOpen, setIsSnapshotExportOpen] = useState(false);

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
    localStorage.setItem('inv_notes', JSON.stringify(notes));
  }, [notes]);

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

  const handleUpdateNote = (updated: ArchNote) => {
    setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleAddNote = (newNote: ArchNote) => {
    setNotes([newNote, ...notes]);
  };

  const handleAddSignal = (newSignal: IntelligenceSignal) => {
    setSignals([newSignal, ...signals]);
  };

  const handleUpdateSignal = (updated: IntelligenceSignal) => {
    setSignals(signals.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSignal = (id: string) => {
    setSignals(signals.filter((s) => s.id !== id));
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
      />

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
            archNote={notes[0] || INITIAL_ARCH_NOTE}
            externalScenario={externalScenario}
            onClearExternalScenario={() => setExternalScenario(null)}
          />
        )}

        {activeTab === 'intelligence' && (
          <IntelligenceTab
            signals={signals}
            baseDividendPerShare={mainHolding.annualDividendPerShare}
            onAddSignal={handleAddSignal}
            onUpdateSignal={handleUpdateSignal}
            onDeleteSignal={handleDeleteSignal}
            onApplyScenarioToModel={handleApplyScenarioToModel}
            onSaveToNotesLibrary={handleAddNote}
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

        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            onUpdateNote={handleUpdateNote}
            onAddNote={handleAddNote}
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
