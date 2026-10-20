// 波段圖表用指標：布林通道與費波那契回檔。只描述價格位置，不是買賣指示。

export interface Bar {
  t: number; // Unix 秒
  o: number;
  h: number;
  l: number;
  c: number;
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
