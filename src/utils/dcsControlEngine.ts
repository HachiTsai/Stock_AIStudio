import { DCSControlState, TacticalPosture } from '../types/portfolio';
import { ScorePoint } from '../services/signalsFeedService';

export const DCS_CALIBRATION = {
  SETPOINT_SP: 500000,
  PAYOUT_RATIO: 0.954,
  TAX_RETENTION: 0.9922774, // 1 - 36.6% * 2.11%
  CHEAP_THRESHOLD: 0.082,
  CHEAP_EXIT_THRESHOLD: 0.078,
  EXPENSIVE_THRESHOLD: 0.048,
  DEFAULT_BENCHMARK_PRICE: 15.20,
  DEFAULT_BENCHMARK_DIVIDEND: 0.86,
};

export interface SnowballYear {
  year: number;
  shares: number;
  annualDividendTwd: number;
}

/**
 * 模擬 C 引擎（複利滾雪球時間線）：純股利半年再投入
 */
export function simulateSnowballTimeline(
  initialShares: number,
  annualDiv: number,
  price: number,
  taxRetention: number = DCS_CALIBRATION.TAX_RETENTION,
  targetIncome: number = DCS_CALIBRATION.SETPOINT_SP,
  maxYears: number = 30
): { yearsToGoal: number; timeline: SnowballYear[] } {
  let currentShares = initialShares;
  const timeline: SnowballYear[] = [];
  let yearsToGoal = maxYears;
  let reached = false;

  const initialIncome = currentShares * annualDiv * taxRetention;
  timeline.push({ year: 0, shares: Math.round(currentShares), annualDividendTwd: Math.round(initialIncome) });

  if (initialIncome >= targetIncome) {
    return { yearsToGoal: 0, timeline };
  }

  for (let year = 1; year <= maxYears; year++) {
    // 假設每年配息兩次（各 50%）
    const semiDiv = (annualDiv * currentShares * taxRetention) / 2.0;
    const reinvestedShares = (semiDiv * 2.0) / price;
    currentShares += reinvestedShares;
    const projectedIncome = currentShares * annualDiv * taxRetention;

    timeline.push({
      year,
      shares: Math.round(currentShares),
      annualDividendTwd: Math.round(projectedIncome),
    });

    if (projectedIncome >= targetIncome && !reached) {
      // 內插計算更精確的年份小數
      const prevIncome = timeline[year - 1].annualDividendTwd;
      const frac = (targetIncome - prevIncome) / (projectedIncome - prevIncome);
      yearsToGoal = Number((year - 1 + frac).toFixed(1));
      reached = true;
    }
  }

  return { yearsToGoal: reached ? yearsToGoal : maxYears, timeline };
}

/**
 * DCS 投資控制系統現場求值
 */
export function evaluateDCSControl(
  shares: number = 300000,
  price: number = DCS_CALIBRATION.DEFAULT_BENCHMARK_PRICE,
  annualDividend: number = DCS_CALIBRATION.DEFAULT_BENCHMARK_DIVIDEND,
  latestScore: ScorePoint | null = null,
  southboundFlow: number = 0
): DCSControlState {
  const currentPrice = price > 0 ? price : DCS_CALIBRATION.DEFAULT_BENCHMARK_PRICE;
  const modelAnnualDividend = annualDividend > 0 ? annualDividend : DCS_CALIBRATION.DEFAULT_BENCHMARK_DIVIDEND;
  const modelYield = modelAnnualDividend / currentPrice;
  const modelYieldPct = Number((modelYield * 100).toFixed(2));

  const setpointSP = DCS_CALIBRATION.SETPOINT_SP;
  const processValuePV = Math.round(shares * modelAnnualDividend * DCS_CALIBRATION.TAX_RETENTION);
  const systemError = setpointSP - processValuePV;
  const achievementPct = Number(((processValuePV / setpointSP) * 100).toFixed(2));

  const effectiveYieldTwdPerShare = modelAnnualDividend * DCS_CALIBRATION.TAX_RETENTION;
  const capitalNeededTwd = systemError > 0 && effectiveYieldTwdPerShare > 0
    ? Math.round((systemError / effectiveYieldTwdPerShare) * currentPrice)
    : 0;

  const sharesNeededBoards = systemError > 0 && effectiveYieldTwdPerShare > 0
    ? Number((systemError / (effectiveYieldTwdPerShare * 1000)).toFixed(1))
    : 0;

  // 風控互鎖判定（BLS）
  const netScore = latestScore?.netScore ?? 71;
  const divScore = latestScore?.divScore ?? 54;
  const valScore = latestScore?.valScore !== undefined && latestScore.valScore !== 100 ? latestScore.valScore : 95.2;
  const fricScore = latestScore?.fricScore !== undefined && latestScore.fricScore !== 100 ? latestScore.fricScore : 80.5;
  const scoreDate = latestScore?.date ?? '2026-10-16';

  let posture: TacticalPosture = 'STEADY_REINVEST';
  let postureName = '穩健複利策略 (Steady Reinvest)';
  let postureLabel = '【穩健複利策略 (Steady Reinvest)】';
  let actionGuide = '維持例行性半年配息再投入，按部就班累積雪球';
  let color: 'red' | 'yellow' | 'green' | 'orange' | 'blue' = 'blue';

  // 優先級 1：高息陷阱防護
  if (modelYield >= 0.08 && (netScore < 50 || divScore < 40)) {
    posture = 'TRAP_ALERT';
    postureName = '高息陷阱防護警戒 (Yield Trap Alert)';
    postureLabel = '【陷阱防護警戒 (Yield Trap Alert)】';
    actionGuide = '防護機制啟動！股息暫留現金池，啟動持股基本面檢視';
    color = 'red';
  } else if (southboundFlow < -8000) {
    // 優先級 2：流速過快警報
    posture = 'VELOCITY_PAUSE';
    postureName = '資金流速防護警戒 (Velocity Pause)';
    postureLabel = '【流速防護警戒 (Velocity Pause)】';
    actionGuide = '暫緩大額市價單買進，等待資金流速放緩再行佈置';
    color = 'yellow';
  } else if (modelYield >= DCS_CALIBRATION.CHEAP_THRESHOLD && netScore >= 70 && divScore >= 60) {
    // 優先級 3：積極增持
    posture = 'AGGRESSIVE_ACCUMULATE';
    postureName = '積極增持配置 (Aggressive Accumulate)';
    postureLabel = '【積極增持配置 (Aggressive Accumulate)】';
    actionGuide = '股息 100% 立即再投入，若有閒置資金可分批增持';
    color = 'green';
  } else if (modelYield <= DCS_CALIBRATION.EXPENSIVE_THRESHOLD) {
    // 優先級 4：估值偏高觀望
    posture = 'OVERVALUED_HOLD';
    postureName = '估值偏高觀望 (Overvalued / Hold)';
    postureLabel = '【估值偏高觀望 (Overvalued / Hold)】';
    actionGuide = '暫停追高買進，維持既有部位持有，股息可部分保留現金儲備';
    color = 'orange';
  }

  // C 引擎模擬達標時間
  const { yearsToGoal } = simulateSnowballTimeline(
    shares,
    modelAnnualDividend,
    currentPrice,
    DCS_CALIBRATION.TAX_RETENTION,
    setpointSP
  );

  return {
    ticker: '00882',
    posture,
    postureName,
    postureLabel,
    actionGuide,
    color,
    setpointSP,
    processValuePV,
    systemError,
    achievementPct,
    currentShares: shares,
    currentPrice,
    modelYieldPct,
    modelAnnualDividend,
    cheapThreshold: DCS_CALIBRATION.CHEAP_THRESHOLD * 100,
    expensiveThreshold: DCS_CALIBRATION.EXPENSIVE_THRESHOLD * 100,
    capitalNeededTwd,
    sharesNeededBoards,
    yearsToGoal,
    scores: {
      netScore,
      divScore,
      valScore,
      fricScore,
      status: `Drive 情報資料庫 (${scoreDate})`,
    },
  };
}
