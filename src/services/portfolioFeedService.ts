import { Holding, Transaction } from '../types/portfolio';
import { parseCsv } from './signalsFeedService';

// Drive: Project_財商工程/持股快照與交易紀錄/（資料夾已設為知道連結者可檢視，免登入）
// 兩份 Sheet 由排程依 Investment_Tracker_Core 唯讀重建；APP 只讀不寫。
export const HOLDINGS_SHEET_ID = '1CWLwi1tsQoWaEYm0IOK9aH7NEkENgd71sbz6Y_lpRVI';
export const TRANSACTIONS_SHEET_ID = '1yFr6OSW6LKWm5wdoc-QoJFXyUotYEd8_YEl_qR-24ks';

const csvUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=0`;

const MARKETS: Holding['market'][] = ['台股', '美股', '日股', '港股'];
const TX_TYPES: Transaction['type'][] = ['Buy', 'Sell', 'Reinvest'];

async function fetchTable(id: string, label: string): Promise<Record<string, string>[]> {
  const res = await fetch(csvUrl(id));
  if (!res.ok) throw new Error(`讀取${label}失敗 (${res.status})`);
  const rows = parseCsv(await res.text());
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => {
      rec[h] = (r[i] ?? '').trim();
    });
    return rec;
  });
}

/** 持股資料庫一列 → Holding；現價與更新日由 APP 即時報價決定，這裡給預設值 */
export function recordToHolding(rec: Record<string, string>, fallbackPrice: number): Holding | null {
  const shares = Number(rec.shares);
  if (!rec.ticker || !Number.isFinite(shares)) return null;
  const market = (MARKETS.includes(rec.market as Holding['market']) ? rec.market : '台股') as Holding['market'];
  return {
    id: `holding-${rec.ticker}`,
    ticker: rec.ticker,
    name: rec.name,
    shares,
    currentPrice: fallbackPrice,
    buyTotalCost: Number(rec.buyTotalCost) || 0,
    buyShares: Number(rec.buyShares) || 0,
    reinvestShares: Number(rec.reinvestShares) || 0,
    totalFees: Number(rec.totalFees) || 0,
    annualDividendPerShare: Number(rec.annualDividendPerShare) || 0,
    market,
    underlyingDesc: rec.underlyingDesc,
    lastUpdated: rec.asOf,
  };
}

export function recordToTransaction(rec: Record<string, string>): Transaction | null {
  const type = rec.type as Transaction['type'];
  const shares = Number(rec.shares);
  if (!rec.id || !rec.ticker || !rec.date || !TX_TYPES.includes(type) || !Number.isFinite(shares)) return null;
  return {
    id: rec.id,
    ticker: rec.ticker,
    date: rec.date,
    type,
    shares,
    price: Number(rec.price) || 0,
    fees: Number(rec.fees) || 0,
    notes: rec.notes,
  };
}

export async function fetchPortfolioFeed(
  priceByTicker: Record<string, number>
): Promise<{ holdings: Holding[]; transactions: Transaction[] }> {
  const [holdingRows, txRows] = await Promise.all([
    fetchTable(HOLDINGS_SHEET_ID, '持股資料庫'),
    fetchTable(TRANSACTIONS_SHEET_ID, '交易明細資料庫'),
  ]);
  const holdings = holdingRows
    .map((r) => recordToHolding(r, priceByTicker[r.ticker] ?? 0))
    .filter((h): h is Holding => h !== null);
  const transactions = txRows
    .map(recordToTransaction)
    .filter((t): t is Transaction => t !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { holdings, transactions };
}
