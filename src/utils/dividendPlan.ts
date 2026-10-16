// 股利達標試算：3D 圖與情境矩陣共用同一套算法，確保同一組參數得到同一個答案。
// 假設：股價、每股年配息在試算期間持平；00882 半年配一次（1 月、7 月）；
// 二代健保以實際觀察的有效扣除率 0.72% 估算；再投入以當時股價買進。以上皆為推估，不是事實。

export const MODEL_DIV_PER_SHARE = 0.86; // 股利目標模型 v6（成分股股息 × 校準配發比 95%，2026-10-16）
export const NHI_EFFECTIVE_RATE = 0.0072;
export const MAX_YEARS = 30;

export interface PlanParams {
  shares: number; // 目前持股（股）
  price: number; // 買進／再投入股價
  divPerShare: number; // 每股年配息
  reinvestPct: number; // 股息再投入比例 0–100
  lumpSumTwd: number; // 現在一次加碼金額
  target: number; // 年股利目標（實收）
}

export interface PlanYear {
  year: number;
  shares: number;
  annualNet: number;
}

export interface PlanResult {
  yieldPct: number;
  annualNetNow: number; // 加碼後、第 0 年的年實收
  gapNow: number;
  lotsNeededNow: number; // 不靠複利、一次補足缺口需要的張數
  yearsToTarget: number | null; // 達標所需年數（半年精度），超過 MAX_YEARS 為 null
  trajectory: PlanYear[]; // 第 0～MAX_YEARS 年
}

export function simulatePlan(p: PlanParams): PlanResult {
  const netRate = 1 - NHI_EFFECTIVE_RATE;
  const annualNet = (s: number) => s * p.divPerShare * netRate;
  let shares = p.shares + (p.price > 0 ? p.lumpSumTwd / p.price : 0);

  const annualNetNow = annualNet(shares);
  const gapNow = Math.max(0, p.target - annualNetNow);
  const netPerShare = p.divPerShare * netRate;
  const lotsNeededNow = netPerShare > 0 ? Math.ceil(gapNow / netPerShare / 1000) : 0;

  const trajectory: PlanYear[] = [{ year: 0, shares, annualNet: annualNetNow }];
  let yearsToTarget: number | null = annualNetNow >= p.target ? 0 : null;

  for (let half = 1; half <= MAX_YEARS * 2; half++) {
    const payout = (shares * p.divPerShare * netRate) / 2;
    if (p.price > 0) shares += (payout * (p.reinvestPct / 100)) / p.price;
    if (yearsToTarget === null && annualNet(shares) >= p.target) yearsToTarget = half / 2;
    if (half % 2 === 0) trajectory.push({ year: half / 2, shares, annualNet: annualNet(shares) });
  }

  return {
    yieldPct: p.price > 0 ? (p.divPerShare / p.price) * 100 : 0,
    annualNetNow,
    gapNow,
    lotsNeededNow,
    yearsToTarget,
    trajectory,
  };
}

// 以目前值為中心產生情境格點，3D 曲面與矩陣共用同一個範圍。
export function priceRange(center: number): [number, number] {
  return [round2(center * 0.75), round2(center * 1.25)];
}
export function divRange(center: number): [number, number] {
  return [round2(Math.max(0.1, center * 0.6)), round2(center * 1.4)];
}
export function priceSteps(center: number): number[] {
  return [-0.1, -0.05, 0, 0.05, 0.1].map((k) => round2(center * (1 + k)));
}
export function divSteps(center: number): number[] {
  return [-0.1, -0.05, 0, 0.05, 0.1].map((k) => round2(Math.max(0.05, center + k)));
}

export const round2 = (v: number) => Math.round(v * 100) / 100;
