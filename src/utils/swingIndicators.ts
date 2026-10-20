// 波段圖表用指標：布林通道與費波那契回檔。只描述價格位置，不是買賣指示。

export interface Bar {
  t: number; // Unix 秒
  o: number;
  h: number;
  l: number;
  c: number;
  a: number; // 還原收盤價（含配息調整）
  v: number;
}

export interface BollingerPoint {
  mid: number;
  upper: number;
  lower: number;
}

/** 布林通道（預設 20 日、2 倍標準差，母體標準差）；不足 n 根的位置為 null。 */
export function bollinger(closes: number[], n = 20, k = 2): (BollingerPoint | null)[] {
  return closes.map((_, i) => {
    if (i < n - 1) return null;
    const w = closes.slice(i - n + 1, i + 1);
    const mid = w.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - mid) ** 2, 0) / n);
    return { mid, upper: mid + k * sd, lower: mid - k * sd };
  });
}

export const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export interface FibResult {
  direction: 'up' | 'down'; // up：先低後高（自高點回檔）；down：先高後低（自低點反彈）
  high: number;
  low: number;
  levels: { ratio: number; price: number }[];
}

/**
 * 以最近 lookback 根的最高價與最低價為一段波段：
 * - 先低後高 → 從高點往下量回檔，price = high − ratio × (high − low)
 * - 先高後低 → 從低點往上量反彈，price = low + ratio × (high − low)
 */
export function fibonacci(bars: Bar[], lookback = 60): FibResult | null {
  const w = bars.slice(-lookback);
  if (w.length < 5) return null;
  let hi = 0;
  let lo = 0;
  w.forEach((b, i) => {
    if (b.h >= w[hi].h) hi = i;
    if (b.l <= w[lo].l) lo = i;
  });
  const high = w[hi].h;
  const low = w[lo].l;
  if (high <= low) return null;
  const direction = lo < hi ? 'up' : 'down';
  const range = high - low;
  return {
    direction,
    high,
    low,
    levels: FIB_RATIOS.map((ratio) => ({
      ratio,
      price: direction === 'up' ? high - ratio * range : low + ratio * range,
    })),
  };
}

export interface PriceSeries {
  t: number[]; // Unix 秒，由舊到新
  c: number[]; // 原始收盤價
  a: number[]; // 還原收盤價（含配息調整，視同股息再投入）
}

export interface PeriodReturn {
  total: number; // 含息報酬率 %
  price: number; // 不含息報酬率 %
  dividendEffect: number; // 含息 − 不含息（百分點）
  fromTime: number; // 實際起算日（該日或之前最近的交易日）
}

/**
 * 近 days 個日曆天的報酬率：起點取「最後一個交易日 − days 天」當天或之前最近的交易日。
 * 含息用還原收盤價，不含息用原始收盤價；日線涵蓋不到該天數（例如新上市）時回傳 null。
 */
export function periodReturn(s: PriceSeries, days: number): PeriodReturn | null {
  const n = s.t.length;
  if (n < 2 || days < 1) return null;
  const target = s.t[n - 1] - days * 86400;
  if (s.t[0] > target + 3 * 86400) return null; // 容許 3 天（週末與假日）的誤差
  let i = n - 1;
  while (i > 0 && s.t[i] > target) i--;
  if (i === n - 1 || !s.a[i] || !s.c[i]) return null;
  const total = (s.a[n - 1] / s.a[i] - 1) * 100;
  const price = (s.c[n - 1] / s.c[i] - 1) * 100;
  return { total, price, dividendEffect: total - price, fromTime: s.t[i] };
}

export const RETURN_PRESETS = [
  { label: '1 週', days: 7 },
  { label: '2 週', days: 14 },
  { label: '1 個月', days: 30 },
  { label: '3 個月', days: 91 },
  { label: '6 個月', days: 182 },
  { label: '1 年', days: 365 },
] as const;
