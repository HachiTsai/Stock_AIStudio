import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DividendRecord, Holding } from '../types/portfolio';
import { formatTWD } from '../utils/calculations';
import { usePrivacy } from '../context/PrivacyContext';
import { ConstituentsPanel } from './ConstituentsPanel';
import { DividendPlanner } from './DividendPlanner';
import { ETF_NAME_TO_ID } from '../services/constituentsFeedService';

interface DividendsTabProps {
  holdings?: Holding[];
  holding: Holding | null;
  externalScenario?: { dividendPerShare: number; label: string } | null;
  onClearExternalScenario?: () => void;
  dividends: DividendRecord[];
  onAddDividend: (record: DividendRecord) => void;
}

export const DividendsTab: React.FC<DividendsTabProps> = ({
  holdings = [],
  dividends,
  onAddDividend,
  holding,
  externalScenario,
  onClearExternalScenario,
}) => {
  const { isPrivacyMaskActive, maskTWD } = usePrivacy();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string>(holding?.ticker || '00882');
  const [exDate, setExDate] = useState('2027-01-16');
  const [payDate, setPayDate] = useState('2027-02-15');
  const [divPerShare, setDivPerShare] = useState('0.50');
  const [holdingShares, setHoldingShares] = useState(
    (holding?.shares || 300000).toString()
  );
  const [nhiRatePct, setNhiRatePct] = useState(''); // 00882 各期大陸營利所得比例不同，須逐期依公告填寫，不預設
  const [reinvestLots, setReinvestLots] = useState('0'); // 預設 0 張再投入
  const [filterTicker, setFilterTicker] = useState<string>('all');

  // 整理全市場 40 檔 ETF 與現有持股清單供表單選擇
  const etfOptions = useMemo(() => {
    const list: { ticker: string; name: string }[] = [];
    const seen = new Set<string>();

    // 1. 現有持股置頂
    holdings.forEach((h) => {
      seen.add(h.ticker);
      list.push({ ticker: h.ticker, name: `${h.name} (持股中)` });
    });

    // 2. 補充全市場標的
    Object.entries(ETF_NAME_TO_ID).forEach(([name, id]) => {
      if (!seen.has(id)) {
        seen.add(id);
        list.push({ ticker: id, name });
      }
    });

    return list;
  }, [holdings]);

  // 切換欲登記之 ETF 標的
  const handleTickerChange = (ticker: string) => {
    setSelectedTicker(ticker);
    const existing = holdings.find((h) => h.ticker === ticker);
    if (existing) {
      setHoldingShares(existing.shares.toString());
    }
    // 依標的類型自動給予合理建議之二代健保課稅比率
    if (ticker === '00882') {
      setNhiRatePct(''); // 大陸地區營利所得比例逐期不同，清空待填
    } else if (
      ticker.toUpperCase().endsWith('B') ||
      ['00645', '00646', '00657', '00661', '00662', '00757', '00830', '00949', '00951', '00954', '00955', '00956'].includes(ticker)
    ) {
      setNhiRatePct('0'); // 海外所得/債券依法免扣補充保費
    } else {
      setNhiRatePct('100'); // 境內台股原型/高股息/科技 ETF 54C 課徵
    }
  };

  // 即時計算
  const sharesNum = parseFloat(holdingShares) || 0;
  const divPerShareNum = parseFloat(divPerShare) || 0;
  const gross = Math.round(sharesNum * divPerShareNum);
  const taxablePortion = gross * ((parseFloat(nhiRatePct) || 0) / 100);
  // 法定二代健保扣繳門檻：單次給付達 20,000 元才扣繳 2.11%
  const calculatedNhiTax = taxablePortion >= 20000 ? Math.round(taxablePortion * 0.0211) : 0;
  const net = gross - calculatedNhiTax;

  const reinvestLotsNum = parseFloat(reinvestLots) || 0;
  const reinvestSharesNum = reinvestLotsNum * 1000;
  const targetHolding = holdings.find((h) => h.ticker === selectedTicker);
  const reinvestPrice = targetHolding?.currentPrice || 15.0;
  const reinvestAmount = reinvestSharesNum * reinvestPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: DividendRecord = {
      id: `div-${Date.now()}`,
      ticker: selectedTicker,
      exDividendDate: exDate,
      paymentDate: payDate,
      dividendPerShare: divPerShareNum,
      holdingShares: sharesNum,
      grossAmount: gross,
      nhiTaxAmount: calculatedNhiTax,
      otherFees: 0,
      netAmount: net,
      reinvestedShares: reinvestSharesNum,
      reinvestedAmount: reinvestAmount,
      notes: `${selectedTicker} 除息 ${divPerShareNum}，實收 ${formatTWD(net)}` +
        (reinvestLotsNum > 0 ? `，再投入 ${reinvestLotsNum} 張` : '') +
        (calculatedNhiTax > 0 ? `。扣繳二代健保 ${formatTWD(calculatedNhiTax)}` : '。免扣二代健保') +
        (taxablePortion > 0 && taxablePortion < 20000 ? '（課稅所得未達 2 萬門檻免扣繳）' : ''),
    };
    onAddDividend(newRecord);
    setShowAddForm(false);
  };

  const totalNet = dividends.reduce((sum, d) => sum + d.netAmount, 0);
  const totalGross = dividends.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalNhi = dividends.reduce((sum, d) => sum + d.nhiTaxAmount, 0);

  // 依標的過濾清單
  const uniqueTickers = useMemo(() => [...new Set(dividends.map((d) => d.ticker))], [dividends]);
  const displayedDividends = useMemo(() => {
    if (filterTicker === 'all') return dividends;
    return dividends.filter((d) => d.ticker === filterTicker);
  }, [dividends, filterTicker]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <DividendPlanner
        holding={holding}
        externalScenario={externalScenario}
        onClearExternalScenario={onClearExternalScenario}
      />

      {/* Header and Summary stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-semibold border border-teal-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>現金流實收管理</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">股利入帳紀錄與二代健保扣繳</h1>
            <p className="text-sm text-slate-400 mt-1">
              實收 = 配息總額 − 二代健保補充保費（2.11%）− 匯費。以實到戶頭金額作為達標基準。
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>記錄新一期股利入帳</span>
          </button>
        </div>

        {/* 3 Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400">累計實收股利 (已扣稅費)</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {maskTWD(totalNet)} <span className="text-xs text-slate-500 font-normal">TWD</span>
            </div>
            <span className="text-[11px] text-slate-500">真實進入帳戶之可支配現金流</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400">法定除息應配總額 (推估口徑)</span>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {maskTWD(totalGross)} <span className="text-xs text-slate-500 font-normal">TWD</span>
            </div>
            <span className="text-[11px] text-slate-500">持股數 × 當期公告每股配息</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400">二代健保補充保費扣繳合計</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {maskTWD(totalNhi)} <span className="text-xs text-slate-500 font-normal">TWD</span>
            </div>
            <span className="text-[11px] text-slate-500">
              實質扣除率約 {totalGross > 0 ? (totalNhi / totalGross * 100).toFixed(2) : '0.00'}%（依認列營利所得比例）
            </span>
          </div>
        </div>

        {/* Tax Note (Rule 8 & 9) */}
        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center space-x-2 text-teal-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>規則 8 & 9：二代健保補充保費（2.11%）機制解析</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            • <strong>各標的課稅屬性不同</strong>：境內台股 ETF（如 0056、00878、00919 等）54C 股利所得課徵 2.11%；海外 ETF（如 00955 日本商社、00646 S&P500 等）與債券 ETF 屬海外所得依法免扣；00882 屬特定架構，僅大陸地區營利所得部分課徵 2.11%，各期比例不同，須逐期依證交所公告填寫。<br />
            • <strong>單次給付達 20,000 元門檻始扣繳</strong>：課稅所得金額若未達 20,000 元則免扣取補充保費。<br />
            • <strong>模型不套用死板固定扣除率</strong>：推估時以「配息總額」展示，目標檢核時以「實到現金流」為準。
          </p>
        </div>
      </div>

      {/* Add dividend form modal/drawer */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>新增配息入帳明細</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              取消
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">配息標的 (ETF)</label>
              <select
                value={selectedTicker}
                onChange={(e) => handleTickerChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {etfOptions.map((opt) => (
                  <option key={opt.ticker} value={opt.ticker}>
                    {opt.ticker} ｜ {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">除息日期</label>
              <input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">入帳發放日</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">當期每股配息 (TWD)</label>
              <input
                type="number"
                step="0.01"
                value={divPerShare}
                onChange={(e) => setDivPerShare(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">參與除息持股 (股)</label>
              <input
                type="number"
                value={holdingShares}
                onChange={(e) => setHoldingShares(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                二代健保課稅認列比率 (%)
                <span className="text-[10px] text-slate-500 ml-1">
                  {selectedTicker === '00882' ? '(大陸營利比率)' : selectedTicker.toUpperCase().endsWith('B') || ['00955', '00645', '00646', '00662'].includes(selectedTicker) ? '(海外/債券免課)' : '(境內54C)'}
                </span>
              </label>
              <input
                type="number"
                step="0.01"
                value={nhiRatePct}
                required={selectedTicker === '00882'}
                onChange={(e) => setNhiRatePct(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">入帳後再投入張數 (張，選填)</label>
              <input
                type="number"
                value={reinvestLots}
                onChange={(e) => setReinvestLots(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>

          {/* Real-time calculation preview */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400">應配總額：</span>
              <span className="text-slate-200 font-bold">{formatTWD(gross)} TWD</span>
            </div>
            <div>
              <span className="text-slate-400">健保課稅部分：</span>
              <span className="text-slate-300 font-bold">{formatTWD(taxablePortion)} TWD</span>
            </div>
            <div>
              <span className="text-slate-400">健保扣繳(2.11%)：</span>
              <span className="text-amber-400 font-bold">
                {calculatedNhiTax > 0 ? `${formatTWD(calculatedNhiTax)} TWD` : '0 (未達2萬或免扣)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">最終實收：</span>
              <span className="text-emerald-400 font-bold text-sm">{formatTWD(net)} TWD</span>
            </div>
            {reinvestLotsNum > 0 && (
              <div className="w-full pt-1 border-t border-slate-800/60 text-[11px] text-teal-300">
                ★ 股息再投入 {reinvestLotsNum} 張（約 {formatTWD(reinvestAmount)} TWD），將以 0 元成本計入真實成本稀釋均價，並自動建立交易紀錄。
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              確認寫入入帳紀錄
            </button>
          </div>
        </form>
      )}

      {/* Dividends History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-100">逐期除息與實收紀錄</h2>

          {/* Multi-ticker Filter */}
          {uniqueTickers.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">篩選標的：</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterTicker('all')}
                  className={`px-2.5 py-1 rounded-lg border font-mono transition cursor-pointer ${
                    filterTicker === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  全部 ({dividends.length})
                </button>
                {uniqueTickers.map((tk) => (
                  <button
                    key={tk}
                    onClick={() => setFilterTicker(tk)}
                    className={`px-2.5 py-1 rounded-lg border font-mono transition cursor-pointer ${
                      filterTicker === tk
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {tk} ({dividends.filter((d) => d.ticker === tk).length})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">除息日 / 入帳日</th>
                <th className="py-3.5 px-4">標的</th>
                <th className="py-3.5 px-4">除息持股</th>
                <th className="py-3.5 px-4">每股配息</th>
                <th className="py-3.5 px-4">除息應配總額</th>
                <th className="py-3.5 px-4">二代健保 (2.11%)</th>
                <th className="py-3.5 px-4">實收到戶金額</th>
                <th className="py-3.5 px-4">再投入狀況</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {displayedDividends.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition font-mono">
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-100">{d.exDividendDate}</div>
                    <div className="text-[11px] text-slate-500">入帳：{d.paymentDate}</div>
                  </td>

                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      {d.ticker}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-slate-200">
                    {isPrivacyMaskActive ? '••• 張 (•••••• 股)' : `${(d.holdingShares / 1000).toLocaleString()} 張 (${d.holdingShares.toLocaleString()} 股)`}
                  </td>

                  <td className="py-4 px-4 text-teal-400 font-bold">
                    {d.dividendPerShare.toFixed(2)} TWD
                  </td>

                  <td className="py-4 px-4 text-slate-200">
                    {maskTWD(d.grossAmount)} TWD
                  </td>

                  <td className="py-4 px-4 text-amber-400 font-bold">
                    {isPrivacyMaskActive ? '-•••• TWD' : (d.nhiTaxAmount > 0 ? `-${formatTWD(d.nhiTaxAmount)} TWD` : '0 (免扣)')}
                  </td>

                  <td className="py-4 px-4 font-bold text-emerald-400 text-sm">
                    {maskTWD(d.netAmount)} TWD
                  </td>

                  <td className="py-4 px-4">
                    {d.reinvestedShares > 0 ? (
                      <div>
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[11px] font-sans font-medium border border-teal-500/20">
                          <CheckCircle2 className="w-3 h-3 text-teal-400" />
                          <span>再投入 {isPrivacyMaskActive ? '••' : (d.reinvestedShares / 1000).toFixed(0)} 張</span>
                        </span>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          零成本稀釋均價
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-sans text-[11px]">未再投入</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConstituentsPanel />
    </div>
  );
};
