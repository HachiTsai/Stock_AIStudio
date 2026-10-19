import history from '../data/etfHistorySnapshot.json';

/**
 * 布林通道四象圖指標（以「還原收盤價」計算，避免除息被誤判成下跌）。
 *
 * - 中軌 = 20 日均線；上/下軌 = 中軌 ± 2 倍標準差（母體標準差）
 * - %B = (價格 − 下軌) ÷ (上軌 − 下軌)；0 = 下軌，1 = 上軌
 * - 通道寬度 = (上軌 − 下軌) ÷ 中軌
 * - 趨勢 = 價格相對 60 日均線的乖離率
 *
 * 轉成雷達圖 0–100 分的方式（皆為「位置/強度」刻度，非好壞評分）：
 * - posScore   = %B × 100，限制於 0–100
 * - widthScore = 通道寬度 ÷ 20% × 100，限制於 0–100（寬度 20% 為滿格）
 * - trendScore = 50 + 乖離率% × 5，限制於 0–100（乖離 ±10% 為極端）
 */
export interface TechnicalMetrics {
  asOf: string;
  price: number;
  ma20: number;
  ma60: number;
  upper: number;
  lower: number;
  percentB: number;
  bandwidth: number;
  trendDeviationPct: number;
  posScore: number;
  widthScore: number;
  trendScore: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

type HistoryFile = { etfs: Record<string, { dates: string[]; adjClose: number[] }> };

export function computeTechnicalMetrics(etfId: string): TechnicalMetrics | null {
  const series = (history as unknown as HistoryFile).etfs[etfId];
  if (!series || series.adjClose.length < 60) return null;
  const px = series.adjClose;
  const last = px[px.length - 1];
  const w20 = px.slice(-20);
  const ma20 = mean(w20);
  const sd = Math.sqrt(mean(w20.map((v) => (v - ma20) ** 2)));
  const upper = ma20 + 2 * sd;
  const lower = ma20 - 2 * sd;
  const ma60 = mean(px.slice(-60));
  const band = upper - lower;
  const percentB = band > 0 ? (last - lower) / band : 0.5;
  const bandwidth = ma20 > 0 ? band / ma20 : 0;
  const trendDeviationPct = ((last - ma60) / ma60) * 100;
  return {
    asOf: series.dates[series.dates.length - 1],
    price: last,
    ma20,
    ma60,
    upper,
    lower,
    percentB,
    bandwidth,
    trendDeviationPct,
    posScore: clamp(percentB * 100),
    widthScore: clamp((bandwidth / 0.2) * 100),
    trendScore: clamp(50 + trendDeviationPct * 5),
  };
}
