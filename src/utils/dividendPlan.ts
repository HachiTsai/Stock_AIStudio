// 股利達標試算：3D 圖與試算摘要共用同一套算法，確保同一組參數得到同一個答案。
// 假設：股價、每股年配息在試算期間持平；00882 半年配一次（1 月、7 月）；一次加碼於指定年月買進；
// 股利以毛額計（未扣二代健保與其他稅費），目標也以毛額比較；再投入以當時股價買進。以上皆為推估，不是事實。

export const MAX_YEARS = 30;

export interface PlanParams {
  shares: number; // 目前持股（股）
  price: number; // 買進／再投入股價
  divPerShare: number; // 每股年配息
  reinvestPct: number; // 股息再投入比例 0–100
  lumpSumTwd: number; // 一次加碼金額
  lumpSumMonth: string; // 加碼年月 YYYY-MM
  target: number; // 年股利目標（毛額）
  startMonth?: string; // 試算起點 YYYY-MM，預設本月
}

export interface PlanYear {
  year: number;
  shares: number;
  annualGross: number;
}

export interface PlanResult {
  yieldPct: number;
  annualGrossNow: number; // 現有持股的年配息毛額（不含未來加碼）
  gapNow: number;
  lotsNeededNow: number; // 不靠複利、一次補足缺口需要的張數
  yearsToTarget: number | null; // 達標所需年數（月精度，取一位小數），超過 MAX_YEARS 為 null
  reachMonth: string | null; // 達標年月
  lumpOffsetMonths: number | null; // 加碼距起點幾個月（超出試算範圍為 null）
  trajectory: PlanYear[]; // 第 0～MAX_YEARS 年
}

export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const toIndex = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};
const fromIndex = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;

// 逐月模擬：00882 在 1 月、7 月配息（各半），配息當月依比例再投入；加碼在指定年月買進。
export function simulatePlan(p: PlanParams): PlanResult {
  const annualGross = (s: number) => s * p.divPerShare;
  const start = toIndex(p.startMonth || currentMonth());
  const lumpOffset = p.lumpSumTwd > 0 && /^\d{4}-\d{2}$/.test(p.lumpSumMonth) ? toIndex(p.lumpSumMonth) - start : null;
  const lumpShares = p.price > 0 ? p.lumpSumTwd / p.price : 0;

  let shares = p.shares;
  const annualGrossNow = annualGross(shares);
  const gapNow = Math.max(0, p.target - annualGrossNow);
  const lotsNeededNow = p.divPerShare > 0 ? Math.ceil(gapNow / p.divPerShare / 1000) : 0;

  const trajectory: PlanYear[] = [];
  let reachOffset: number | null = null;
  for (let k = 0; k <= MAX_YEARS * 12; k++) {
    if (lumpOffset !== null && k === Math.max(0, lumpOffset)) shares += lumpShares;
    const month = (start + k) % 12; // 0 = 1 月
    if (k > 0 && (month === 0 || month === 6) && p.price > 0) {
      const payout = (shares * p.divPerShare) / 2;
      shares += (payout * (p.reinvestPct / 100)) / p.price;
    }
    if (reachOffset === null && annualGross(shares) >= p.target) reachOffset = k;
    if (k % 12 === 0) trajectory.push({ year: k / 12, shares, annualGross: annualGross(shares) });
  }

  return {
    yieldPct: p.price > 0 ? (p.divPerShare / p.price) * 100 : 0,
    annualGrossNow,
    gapNow,
    lotsNeededNow,
    yearsToTarget: reachOffset === null ? null : Math.round((reachOffset / 12) * 10) / 10,
    reachMonth: reachOffset === null ? null : fromIndex(start + reachOffset),
    lumpOffsetMonths: lumpOffset !== null && lumpOffset <= MAX_YEARS * 12 ? Math.max(0, lumpOffset) : null,
    trajectory,
  };
}

// 3D 曲面的股價／配息範圍，以中心值上下展開
export function priceRange(center: number): [number, number] {
  return [round2(center * 0.75), round2(center * 1.25)];
}
export function divRange(center: number): [number, number] {
  return [round2(Math.max(0.1, center * 0.6)), round2(center * 1.4)];
}

export const round2 = (v: number) => Math.round(v * 100) / 100;
