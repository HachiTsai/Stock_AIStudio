import { Holding } from '../types/portfolio';

export const TARGET_ANNUAL_DIVIDEND = 500000; // TWD 50 萬核心目標

/**
 * Format currency with commas: e.g. 4,452,000 TWD
 */
export function formatTWD(val: number, showDecimals: boolean = false): string {
  if (isNaN(val) || !isFinite(val)) return '0';
  if (showDecimals) {
    return val.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return Math.round(val).toLocaleString('zh-TW');
}

/**
 * Format share count: e.g. 300,000 股 (300 張)
 */
export function formatShares(shares: number): string {
  const lots = (shares / 1000).toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  return `${shares.toLocaleString('zh-TW')} 股 (${lots} 張)`;
}

/**
 * Calculate Real Cost per share:
 * Buy 合計 ÷ 總股數（包含零成本股息再投入 shares）
 */
export function calculateRealCostPerShare(holding: Holding): number {
  if (holding.shares <= 0) return 0;
  return holding.buyTotalCost / holding.shares;
}

/**
 * Calculate Market Yield %:
 * 近一年每股配息 ÷ 現價
 */
export function calculateYield(holding: Holding): number {
  if (holding.currentPrice <= 0) return 0;
  return (holding.annualDividendPerShare / holding.currentPrice) * 100;
}

/**
 * Calculate Market Value:
 * 總持股數 × 現價
 */
export function calculateMarketValue(holding: Holding): number {
  return holding.shares * holding.currentPrice;
}

/**
 * Calculate Unrealized Gain / Loss:
 * 市值 - 純買進本金
 */
export function calculateUnrealizedPnL(holding: Holding): { amount: number; pct: number } {
  const marketVal = calculateMarketValue(holding);
  const cost = holding.buyTotalCost;
  const amount = marketVal - cost;
  const pct = cost > 0 ? (amount / cost) * 100 : 0;
  return { amount, pct };
}

/**
 * Calculate Portfolio Total Projected Annual Dividend
 */
export function calculateProjectedDividend(holdings: Holding[]): number {
  return holdings.reduce((sum, h) => sum + h.shares * h.annualDividendPerShare, 0);
}

/**
 * Calculate Goal Progress & Gap
 */
export function calculateGoalStats(holdings: Holding[], customTarget: number = TARGET_ANNUAL_DIVIDEND) {
  const projectedAnnualDividend = calculateProjectedDividend(holdings);
  const progressPct = customTarget > 0 ? (projectedAnnualDividend / customTarget) * 100 : 0;
  const gap = Math.max(0, customTarget - projectedAnnualDividend);
  
  // Weighted average yield across portfolio
  const totalMarketVal = holdings.reduce((sum, h) => sum + calculateMarketValue(h), 0);
  let weightedYieldPct = 0;
  if (totalMarketVal > 0) {
    weightedYieldPct = holdings.reduce((sum, h) => {
      const weight = calculateMarketValue(h) / totalMarketVal;
      return sum + calculateYield(h) * weight;
    }, 0);
  } else if (holdings.length > 0) {
    weightedYieldPct = calculateYield(holdings[0]);
  }

  // 追加本金 = 缺口 ÷ 殖利率
  const requiredCapital = weightedYieldPct > 0 ? (gap / (weightedYieldPct / 100)) : 0;

  return {
    target: customTarget,
    projectedAnnualDividend,
    progressPct,
    gap,
    weightedYieldPct,
    requiredCapital: Math.round(requiredCapital),
  };
}


/**
 * Dividend Compound Simulation
 * Projects dividend growth over N years with dynamic reinvestment ratio + one-time extra capital addition
 */
export function simulateDividendGrowth({
  initialShares,
  currentPrice,
  dividendPerShare,
  lumpSumTwd,
  lumpSumYear = 1,
  dividendGrowthRatePct = 0,
  priceGrowthRatePct = 0,
  reinvestRatioPct = 100,
  taxRatePct = 0,
  targetDividend = TARGET_ANNUAL_DIVIDEND,
  years = 10,
}: {
  initialShares: number;
  currentPrice: number;
  dividendPerShare: number;
  lumpSumTwd: number;
  /** 一次性加碼於第幾年年初投入（1 = 現在） */
  lumpSumYear?: number;
  dividendGrowthRatePct?: number;
  priceGrowthRatePct?: number;
  reinvestRatioPct?: number;
  taxRatePct?: number;
  targetDividend?: number;
  years?: number;
}) {
  const rows = [];
  let shares = initialShares;
  let price = currentPrice;
  let divPerShare = dividendPerShare;
  let cumulativeInvested = 0;
  let cumulativeDividends = 0;

  for (let year = 1; year <= years; year++) {
    const startShares = shares;
    // Shares bought at the start of the year already earn that year's dividend
    if (year === lumpSumYear && price > 0) shares += lumpSumTwd / price;
    const grossAnnualDividend = shares * divPerShare;
    const netAnnualDividend = grossAnnualDividend * (1 - taxRatePct / 100);
    cumulativeDividends += netAnnualDividend;

    // One-time extra addition, bought at the start of lumpSumYear at that year's price
    const annualCapitalAddition = year === lumpSumYear ? lumpSumTwd : 0;
    cumulativeInvested += annualCapitalAddition;

    // New shares from the one-time addition
    const newSharesFromCash = price > 0 ? annualCapitalAddition / price : 0;

    // New shares from reinvested dividends (based on reinvestRatioPct)
    const amountToReinvest = netAnnualDividend * (reinvestRatioPct / 100);
    const newSharesFromReinvest = price > 0 ? amountToReinvest / price : 0;

    shares += newSharesFromReinvest;

    const endMarketValue = shares * price;

    rows.push({
      year,
      startShares: Math.round(startShares),
      endShares: Math.round(shares),
      price: Number(price.toFixed(2)),
      divPerShare: Number(divPerShare.toFixed(2)),
      grossAnnualDividend: Math.round(grossAnnualDividend),
      annualDividend: Math.round(netAnnualDividend),
      annualCapitalAddition,
      amountToReinvest: Math.round(amountToReinvest),
      newSharesFromCash: Math.round(newSharesFromCash),
      newSharesFromReinvest: Math.round(newSharesFromReinvest),
      endMarketValue: Math.round(endMarketValue),
      isGoalReached: netAnnualDividend >= targetDividend,
      progressPct: targetDividend > 0 ? (netAnnualDividend / targetDividend) * 100 : 0,
    });

    // Grow price and dividend for next year
    price *= (1 + priceGrowthRatePct / 100);
    divPerShare *= (1 + dividendGrowthRatePct / 100);
  }

  return rows;
}

/**
 * Estimate exact months / years to reach target
 */
export function estimateTimeToGoal({
  initialShares,
  currentPrice,
  dividendPerShare,
  lumpSumTwd,
  lumpSumYear = 1,
  targetDividend,
  reinvestRatioPct = 100,
  taxRatePct = 0,
}: {
  initialShares: number;
  currentPrice: number;
  dividendPerShare: number;
  lumpSumTwd: number;
  /** 一次性加碼於第幾年年初投入（1 = 現在） */
  lumpSumYear?: number;
  targetDividend: number;
  reinvestRatioPct?: number;
  taxRatePct?: number;
}): { years: number; months: number; reachable: boolean } {
  let shares = initialShares;
  const lumpSumMonth = (lumpSumYear - 1) * 12;
  const initialAnnualNet = shares * dividendPerShare * (1 - taxRatePct / 100);
  if (initialAnnualNet >= targetDividend) {
    return { years: 0, months: 0, reachable: true };
  }

  if (lumpSumTwd <= 0 && (reinvestRatioPct <= 0 || dividendPerShare <= 0)) {
    return { years: 99, months: 0, reachable: false };
  }

  const maxMonths = 360; // 30 years limit
  for (let m = 0; m <= maxMonths; m++) {
    // One-time cash addition buys shares at the start of its month
    if (m === lumpSumMonth && lumpSumTwd > 0 && currentPrice > 0) {
      shares += lumpSumTwd / currentPrice;
    }
    if (m === 0) {
      if (shares * dividendPerShare * (1 - taxRatePct / 100) >= targetDividend) {
        return { years: 0, months: 0, reachable: true };
      }
      continue;
    }

    // Dividends assumed distributed semi-annually (month 6 and 12)
    if (m % 6 === 0) {
      const halfYearNet = (shares * (dividendPerShare / 2)) * (1 - taxRatePct / 100);
      const reinvestAmount = halfYearNet * (reinvestRatioPct / 100);
      if (reinvestAmount > 0 && currentPrice > 0) {
        shares += reinvestAmount / currentPrice;
      }
    }

    const currentAnnualNet = shares * dividendPerShare * (1 - taxRatePct / 100);
    if (currentAnnualNet >= targetDividend) {
      const y = Math.floor(m / 12);
      const remM = m % 12;
      return { years: y, months: remM, reachable: true };
    }
  }

  return { years: 30, months: 0, reachable: false };
}

