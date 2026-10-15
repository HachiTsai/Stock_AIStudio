import React, { useState } from 'react';
import { History, Plus, TrendingUp, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Transaction, Holding } from '../types/portfolio';
import { formatTWD, formatShares, calculateRealCostPerShare } from '../utils/calculations';

interface TransactionsTabProps {
  transactions: Transaction[];
  holding: Holding;
  onAddTransaction: (tx: Transaction) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  holding,
  onAddTransaction,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'Buy' | 'Sell' | 'Reinvest'>('Reinvest');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shares, setShares] = useState('10000'); // 10 張
  const [price, setPrice] = useState('14.84');
  const [fees, setFees] = useState('0');
  const [notes, setNotes] = useState('');

  const sharesNum = parseFloat(shares) || 0;
  const priceNum = parseFloat(price) || 0;
  const feesNum = parseFloat(fees) || 0;
  const totalAmount = sharesNum * priceNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      ticker: '00882',
      date,
      type,
      shares: sharesNum,
      price: priceNum,
      fees: feesNum,
      notes: notes || (type === 'Reinvest' ? '股息再投入（零成本入帳）' : '定期買進'),
    };
    onAddTransaction(newTx);
    setShowAddForm(false);
    setNotes('');
  };

  const realCost = calculateRealCostPerShare(holding);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header and Real cost callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <History className="w-3.5 h-3.5" />
              <span>交易與股息再投入明細</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">買賣成交與再投入歷史</h1>
            <p className="text-sm text-slate-400 mt-1">
              精確分離「純現金買進本金」與「股息再投入部位」，嚴格遵守真實成本口徑。
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增交易 / 再投入</span>
          </button>
        </div>

        {/* Real Cost Formula Summary Card */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 font-sans block">純買進總本金 (Buy)</span>
            <span className="font-bold text-slate-100 text-base">
              {formatTWD(holding.buyTotalCost)} TWD
            </span>
            <span className="text-[11px] text-slate-500 block">共 {(holding.buyShares / 1000).toFixed(0)} 張</span>
          </div>

          <div>
            <span className="text-slate-500 font-sans block">股息再投入股數 (Reinvest)</span>
            <span className="font-bold text-teal-400 text-base">
              {(holding.reinvestShares / 1000).toFixed(0)} 張 ({holding.reinvestShares.toLocaleString()} 股)
            </span>
            <span className="text-[11px] text-slate-500 block">成本計為 0 TWD</span>
          </div>

          <div>
            <span className="text-slate-500 font-sans block">交易手續費總計</span>
            <span className="font-bold text-slate-300 text-base">
              {formatTWD(holding.totalFees)} TWD
            </span>
            <span className="text-[11px] text-slate-500 block">獨立列帳不併入持股成本</span>
          </div>

          <div>
            <span className="text-slate-500 font-sans block">稀釋後真實每股成本</span>
            <span className="font-bold text-emerald-400 text-lg">
              {realCost.toFixed(2)} TWD
            </span>
            <span className="text-[11px] text-slate-400 block font-sans">
              未再投入前約 14.68
            </span>
          </div>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>新增交易紀錄</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              取消
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">交易類型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              >
                <option value="Reinvest">Reinvest (股息再投入 - 零成本)</option>
                <option value="Buy">Buy (現金買進)</option>
                <option value="Sell">Sell (賣出)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">交易日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">股數 (股)</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                placeholder="10000 為 10 張"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">成交單價 (TWD)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">交易手續費 (TWD)</label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">備註說明</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                placeholder="例如：股利入帳後再投入 10 張"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              寫入交易紀錄
            </button>
          </div>
        </form>
      )}

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-100">成交交易列表</h2>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">日期</th>
                <th className="py-3.5 px-4">類型</th>
                <th className="py-3.5 px-4">標的</th>
                <th className="py-3.5 px-4">成交股數 (張數)</th>
                <th className="py-3.5 px-4">成交單價</th>
                <th className="py-3.5 px-4">總金額 (TWD)</th>
                <th className="py-3.5 px-4">手續費</th>
                <th className="py-3.5 px-4">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition font-mono">
                  <td className="py-4 px-4 font-bold text-slate-200">{tx.date}</td>

                  <td className="py-4 px-4 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        tx.type === 'Reinvest'
                          ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                          : tx.type === 'Buy'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    <span className="text-slate-100 font-bold">{tx.ticker}</span>
                  </td>

                  <td className="py-4 px-4 font-bold text-slate-100">
                    {(tx.shares / 1000).toFixed(0)} 張 ({tx.shares.toLocaleString()} 股)
                  </td>

                  <td className="py-4 px-4 text-slate-300">
                    {tx.price.toFixed(2)} TWD
                  </td>

                  <td className="py-4 px-4 font-bold text-slate-200">
                    {tx.type === 'Reinvest' ? (
                      <span className="text-teal-400">0 (股息再投入)</span>
                    ) : (
                      formatTWD(tx.shares * tx.price)
                    )}
                  </td>

                  <td className="py-4 px-4 text-slate-400">
                    {tx.fees > 0 ? formatTWD(tx.fees) : '0'}
                  </td>

                  <td className="py-4 px-4 text-slate-400 font-sans max-w-xs truncate" title={tx.notes}>
                    {tx.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
