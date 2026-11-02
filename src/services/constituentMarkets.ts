// 成分股所屬市場（資料池 ETF_Constituents 的 constituent_market 欄）。
// 新增細分市場（例如 EU、IN、KR）只需在 CONSTITUENT_MARKETS 加一筆；
// 資料池寫出登錄表沒有的代碼時，畫面仍會以原代碼顯示，不會壞。

export interface ConstituentMarketInfo {
  code: string;
  label: string;
  /** 顯示順序，數字小的排前面 */
  order: number;
  /** 標籤的 Tailwind 色調（背景、文字、邊框） */
  tone: string;
}

export const CONSTITUENT_MARKETS: Record<string, ConstituentMarketInfo> = {
  TW: { code: 'TW', label: '台股', order: 1, tone: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  US: { code: 'US', label: '美股', order: 2, tone: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  JP: { code: 'JP', label: '日股', order: 3, tone: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  HK: { code: 'HK', label: '港股', order: 4, tone: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  CN: { code: 'CN', label: '陸股', order: 5, tone: 'bg-red-500/15 text-red-300 border-red-500/30' },
  BOND: { code: 'BOND', label: '債券', order: 6, tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  DERIV: { code: 'DERIV', label: '期貨選擇權', order: 7, tone: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  CASH: { code: 'CASH', label: '現金', order: 8, tone: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  OTHER: { code: 'OTHER', label: '其他地區', order: 9, tone: 'bg-slate-600/20 text-slate-400 border-slate-600/40' },
};

const UNKNOWN_TONE = 'bg-slate-600/20 text-slate-400 border-slate-600/40';

/** 取得顯示資訊；登錄表沒有的代碼以原代碼顯示、排在最後。 */
export function getConstituentMarketInfo(code: string): ConstituentMarketInfo {
  const key = (code || '').trim().toUpperCase();
  if (!key) return CONSTITUENT_MARKETS.OTHER;
  return CONSTITUENT_MARKETS[key] ?? { code: key, label: key, order: 99, tone: UNKNOWN_TONE };
}

const SUFFIX_MARKET: Record<string, string> = {
  TW: 'TW', TWO: 'TW', US: 'US', JP: 'JP', T: 'JP', HK: 'HK', SH: 'CN', SZ: 'CN', SS: 'CN', TF: 'DERIV',
};

/**
 * 備援快照（沒有 constituent_market 欄）時的粗略推斷：只認代號後綴與期貨字樣，
 * 認不出來就回傳空字串，畫面不顯示市場標籤，不亂猜。
 */
export function inferConstituentMarket(ticker: string, name = ''): string {
  const t = (ticker || '').trim();
  const m = /\.([A-Za-z]{1,3})$/.exec(t);
  if (m && SUFFIX_MARKET[m[1].toUpperCase()]) return SUFFIX_MARKET[m[1].toUpperCase()];
  if (/期貨|選擇權/.test(t) || /期貨|選擇權/.test(name)) return 'DERIV';
  return '';
}

export interface MarketWeight {
  info: ConstituentMarketInfo;
  weightPct: number;
}

/** 依市場加總權重，依登錄順序排列；沒有市場標籤的列不計入。 */
export function summarizeMarketWeights(rows: { constituentMarket: string; weightPct: number }[]): MarketWeight[] {
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (!r.constituentMarket) continue;
    const key = r.constituentMarket.trim().toUpperCase();
    sums.set(key, (sums.get(key) ?? 0) + r.weightPct);
  }
  return [...sums.entries()]
    .map(([code, weightPct]) => ({ info: getConstituentMarketInfo(code), weightPct }))
    .sort((a, b) => a.info.order - b.info.order || b.weightPct - a.weightPct);
}
