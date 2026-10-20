import history from '../data/etfHistorySnapshot.json';

/**
 * 動態評分矩陣技術指標：趨勢、MACD 動能、均量比（成本軸另計）。
 * 價格類指標一律使用「還原收盤價」，避免除息被誤判成下跌。
 *
 * - 趨勢 = 價格相對 60 日均線的乖離率
 * - MACD：DIF = 12 日 EMA − 26 日 EMA；訊號線 = DIF 的 9 日 EMA；柱狀體 = DIF − 訊號線
 *   （以柱狀體 ÷ 價格 % 標準化，才能跨不同價位的 ETF 比較）
 * - 均量比 = 近 5 日平均成交量 ÷ 近 60 日平均成交量
 *
 * 轉成雷達圖 0–100 分的方式（皆為「強度/位置」刻度，非好壞評分）：
 * - 兩軸都先除以該標的自身的日報酬標準差（波動），再用 tanh 壓縮到 0–100，50 代表持平：
 *   不同波動的 ETF 才有可比的刻度，也不會被固定門檻壓到 0 或 100 而看起來像「沒有評分」。
 * - trendScore = 50 + 50 × tanh(乖離率% ÷ (日波動% × √30) ÷ 1.5)
 * - macdScore  = 50 + 50 × tanh(柱狀體% ÷ 日波動% ÷ 0.8)
 * - volScore   = 均量比 × 50，限制於 0–100（1.0 = 50 分，2.0 以上滿格）
 */
export interface TechnicalMetrics {
  asOf: string;
  price: number;
  ma60: number;
  trendDeviationPct: number;
  dif: number;
  signal: number;
  histogram: number;
  histogramPct: number;
  volRatio: number;
  avgVol5: number;
  avgVol60: number;
  totalReturn1Y: number;
  trendScore: number;
  macdScore: number;
  volScore: number;
  returnScore: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** 指數移動平均，以第一筆資料為初始值（k = 2 / (n + 1)） */
function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

type HistoryFile = { etfs: Record<string, { dates: string[]; adjClose: number[]; volume?: number[] }> };

export function computeTechnicalMetrics(etfId: string): TechnicalMetrics | null {
  const series = (history as unknown as HistoryFile).etfs[etfId];
  if (!series || series.adjClose.length < 60) return null;
  const px = series.adjClose;
  const last = px[px.length - 1];
  const ma60 = mean(px.slice(-60));
  const trendDeviationPct = ((last - ma60) / ma60) * 100;

  const e12 = ema(px, 12);
  const e26 = ema(px, 26);
  const difSeries = e12.map((v, i) => v - e26[i]);
  const signalSeries = ema(difSeries, 9);
  const difLast = difSeries[difSeries.length - 1];
  const signalLast = signalSeries[signalSeries.length - 1];
  const histogram = difLast - signalLast;
  const histogramPct = (histogram / last) * 100;

  // 日報酬標準差（%）：作為趨勢與 MACD 兩軸的波動刻度
  const rets = px.slice(1).map((v, i) => v / px[i] - 1);
  const retMean = mean(rets);
  const dailyVolPct = Math.max(Math.sqrt(mean(rets.map((r) => (r - retMean) ** 2))) * 100, 0.1);
  const squash = (z: number) => 50 + 50 * Math.tanh(z);

  const vol = series.volume ?? [];
  const avgVol5 = vol.length >= 60 ? mean(vol.slice(-5)) : 0;
  const avgVol60 = vol.length >= 60 ? mean(vol.slice(-60)) : 0;
  const volRatio = avgVol60 > 0 ? avgVol5 / avgVol60 : 1;

  const firstAdj = px[0];
  const totalReturn1Y = firstAdj > 0 ? ((last - firstAdj) / firstAdj) * 100 : 0;

  // 1Y 含息總回報評分（賺錢實績）：
  // 0%（保本不賺不賠）為 40 分；負報酬每 -1% 扣 2 分（-20% 以下為 0 分）；
  // 正報酬：0%~15% 為 40~55 分；15%~35% 為 55~75 分；35%~60% 為 75~90 分；60% 以上為 90~100 分
  let returnScore = 40;
  if (totalReturn1Y < 0) {
    returnScore = clamp(40 + totalReturn1Y * 2, 0, 40);
  } else if (totalReturn1Y <= 15) {
    returnScore = 40 + (totalReturn1Y / 15) * 15;
  } else if (totalReturn1Y <= 35) {
    returnScore = 55 + ((totalReturn1Y - 15) / 20) * 20;
  } else if (totalReturn1Y <= 60) {
    returnScore = 75 + ((totalReturn1Y - 35) / 25) * 15;
  } else {
    returnScore = clamp(90 + ((totalReturn1Y - 60) / 40) * 10, 90, 100);
  }

  return {
    asOf: series.dates[series.dates.length - 1],
    price: last,
    ma60,
    trendDeviationPct,
    dif: difLast,
    signal: signalLast,
    histogram,
    histogramPct,
    volRatio,
    avgVol5,
    avgVol60,
    totalReturn1Y,
    trendScore: squash(trendDeviationPct / (dailyVolPct * Math.sqrt(30)) / 1.5),
    macdScore: squash(histogramPct / dailyVolPct / 0.8),
    volScore: clamp(volRatio * 50),
    returnScore: Number(returnScore.toFixed(1)),
  };
}
