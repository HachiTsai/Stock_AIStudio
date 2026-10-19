import history from '../data/etfHistorySnapshot.json';
import holdersHistory from '../data/etfHoldersHistory.json';

/**
 * 債券 ETF 看板指標：價格、配息殖利率、受益人數。
 *
 * - 配息殖利率 = 近 365 天配息合計 ÷ 現價（為「配息殖利率」，不等於債券到期殖利率 YTM）
 * - 受益人數 = 集保各持股分級合計人數；每週快照，至少兩週才有增減
 */
export interface BondMetrics {
  asOf: string;
  lastClose: number;
  high52w: number;
  low52w: number;
  rangePosPct: number;
  dividendTtm: number;
  dividendCount: number;
  lastDividend: { date: string; amount: number } | null;
  recentDividends: { date: string; amount: number }[];
  closes: number[];
  dates: string[];
  holders: { date: string; count: number } | null;
  holdersChange: { prevDate: string; delta: number; pct: number } | null;
}

type HistoryFile = {
  etfs: Record<string, { dates: string[]; close: number[]; dividends: { date: string; amount: number }[] }>;
};
type HoldersFile = { snapshots: { date: string; holders: Record<string, number> }[] };

export function computeBondMetrics(etfId: string): BondMetrics | null {
  const s = (history as unknown as HistoryFile).etfs[etfId];
  if (!s || s.close.length === 0) return null;
  const lastClose = s.close[s.close.length - 1];
  const asOf = s.dates[s.dates.length - 1];
  const high52w = Math.max(...s.close);
  const low52w = Math.min(...s.close);
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  // Yahoo 偶爾會把同一筆配息重複回報在相鄰兩天（例如 00772B 2026-01-19/20），3 天內同金額視為重複
  const dedup = s.dividends.filter((d, i, arr) => {
    const p = arr[i - 1];
    if (!p || p.amount !== d.amount) return true;
    return (new Date(d.date).getTime() - new Date(p.date).getTime()) / 86_400_000 > 3;
  });
  const ttm = dedup.filter((d) => d.date > cutoffStr);
  const dividendTtm = ttm.reduce((a, d) => a + d.amount, 0);

  const snaps = (holdersHistory as unknown as HoldersFile).snapshots
    .filter((x) => x.holders[etfId] != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = snaps[snaps.length - 1];
  const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
  const count = latest ? latest.holders[etfId] : null;
  return {
    asOf,
    lastClose,
    high52w,
    low52w,
    rangePosPct: high52w > low52w ? ((lastClose - low52w) / (high52w - low52w)) * 100 : 50,
    dividendTtm,
    dividendCount: ttm.length,
    lastDividend: ttm.length ? ttm[ttm.length - 1] : null,
    recentDividends: ttm.slice(-12),
    closes: s.close.slice(-120),
    dates: s.dates.slice(-120),
    holders: latest && count != null ? { date: latest.date, count } : null,
    holdersChange:
      latest && prev && count != null
        ? {
            prevDate: prev.date,
            delta: count - prev.holders[etfId],
            pct: prev.holders[etfId] > 0 ? ((count - prev.holders[etfId]) / prev.holders[etfId]) * 100 : 0,
          }
        : null,
  };
}

/** 以現價計算配息殖利率（%）。 */
export const dividendYieldPct = (m: BondMetrics, price: number) => (price > 0 ? (m.dividendTtm / price) * 100 : 0);
