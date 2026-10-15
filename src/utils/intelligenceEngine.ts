import { 
  IntelligenceSignal, 
  SignalDimension, 
  SignalDirection, 
  SignalSourceType, 
  ExtractedMetric 
} from '../types/portfolio';

export const INITIAL_INTELLIGENCE_SIGNALS: IntelligenceSignal[] = [
  {
    id: 'sig-2026-10-12-1',
    date: '2026-10-12',
    ticker: '00882',
    title: '00882 核心內銀與能源成分股維持 30%~60% 派息率承諾',
    rawContent: '中信中國高股息 (00882) 前十大成分股中，工商銀行、建設銀行、中國銀行等國有大行中期與年度分紅派息率穩定維持於 30% 水準；能源權重股中國神華承諾 2025-2027 年度每年以現金方式分配的利潤不少於當年實現淨利潤的 60%。',
    sourceType: 'app_paste',
    dimension: 'dividend_sustainability',
    direction: 'bullish',
    weight: 5,
    hardFacts: [
      '國有大型銀行成分股現金分紅比例穩定維持 30%',
      '中國神華章程承諾 2025-2027 現金派息率不低於 60%',
      '前十大高息國企權重合計逾 52%，底層股息現金流具契約支撐',
    ],
    extractedMetrics: [
      { label: '內銀派息率', value: '30.0%' },
      { label: '神華保底派息率', value: '≥60.0%' },
      { label: '前十大權重', value: '52.4%' },
    ],
    impliedDividendShift: 0.04,
    objectiveReasoning: '底層成分股分紅政策受國資委市值管理與章程約束，配息率下限明確，對 00882 可分配投資收益提供高確定性支撐。',
    tags: ['成分股財報', '分紅政策', '高股息底層'],
    extractionMethod: 'rule_engine',
    syncedToDrive: false,
  },
  {
    id: 'sig-2026-10-08-2',
    date: '2026-10-08',
    ticker: '00882',
    title: '2026 下半年除息 0.55 元之二代健保實際扣繳基數僅佔總額 34.4%',
    rawContent: '2026/7 除息 0.55 元（300張應配 165,000 元），8/11 實收 158,344 元，二代健保補充保費僅扣繳 1,197 元（反推應稅股利基數約 56,730 元，佔比 34.4%），其餘 65.6% 屬海外所得或收益平準金免扣二代健保。',
    sourceType: 'drive_sheet',
    dimension: 'friction_fx',
    direction: 'bullish',
    weight: 4,
    hardFacts: [
      '2026/7 應配總額 165,000 TWD，二代健保僅扣 1,197 TWD',
      '實際有效健保扣繳率僅 0.725%（遠低於法定上限 2.11%）',
      '約 65.6% 配息組成免計入二代健保補充保費基數',
    ],
    extractedMetrics: [
      { label: '有效健保扣繳率', value: '0.73%' },
      { label: '免扣健保佔比', value: '65.6%' },
      { label: '實收留存率', value: '95.97%' },
    ],
    impliedDividendShift: 0.02,
    objectiveReasoning: '海外股利所得與平準金結構大幅降低二代健保摩擦成本，使稅後實收現金流高於一般純台股高股息 ETF。',
    tags: ['二代健保', '稅務摩擦', '實收現金流'],
    extractionMethod: 'rule_engine',
    syncedToDrive: true,
  },
  {
    id: 'sig-2026-10-05-3',
    date: '2026-10-05',
    ticker: '00882',
    title: '港幣兌台幣匯率近一季區間波動 -1.8%，折算台幣配息微幅承壓',
    rawContent: '00882 底層資產以港幣計價為主，近一季 HKD/TWD 匯率由 4.16 回落至 4.085（約 -1.8%）。若成分股原幣配息持平，折算回新台幣之可分配收益將有約 1.5%~2% 之匯兌折減。',
    sourceType: 'app_paste',
    dimension: 'friction_fx',
    direction: 'bearish',
    weight: 3,
    hardFacts: [
      'HKD/TWD 匯率近一季由 4.16 變動至 4.085（-1.8%）',
      '底層港股股息匯回新台幣時受匯率直接折算影響',
    ],
    extractedMetrics: [
      { label: 'HKD/TWD 變動', value: '-1.80%' },
      { label: '參考匯率', value: '4.085' },
    ],
    impliedDividendShift: -0.02,
    objectiveReasoning: '港幣走弱會直接按比例稀釋匯回台灣之可分配收益金額，需觀察除息換匯時點之匯率水準。',
    tags: ['匯率風險', '港幣兌台幣', '可分配收益'],
    extractionMethod: 'rule_engine',
    syncedToDrive: false,
  },
  {
    id: 'sig-2026-10-01-4',
    date: '2026-10-01',
    ticker: '00882',
    title: '00882 收盤 14.84 元對應年配 1.00 元之殖利率為 6.74%，高於純買進成本殖利率',
    rawContent: '2026/10/01 收盤價 14.84 元，近兩次配息合計 1.00 元（0.45 + 0.55），現價殖利率 6.74%。以個人真實成本 13.80 元計算，成本殖利率達 7.25%。',
    sourceType: 'drive_doc',
    dimension: 'valuation_margin',
    direction: 'bullish',
    weight: 4,
    hardFacts: [
      '現價 14.84 TWD 對應年配息 1.00 TWD 之當期殖利率為 6.74%',
      '個人真實每股成本 13.80 TWD 對應之成本殖利率為 7.25%',
      '目前市價高於真實成本 +7.54%，具備資本安全墊',
    ],
    extractedMetrics: [
      { label: '現價殖利率', value: '6.74%' },
      { label: '成本殖利率', value: '7.25%' },
      { label: '安全邊際溢價', value: '+7.54%' },
    ],
    impliedDividendShift: 0.00,
    objectiveReasoning: '現價殖利率維持 6.7% 以上高檔區間，股息再投入（Reinvest）仍具備良好複利累積效率。',
    tags: ['估值位階', '殖利率', '安全邊際'],
    extractionMethod: 'rule_engine',
    syncedToDrive: true,
  },
  {
    id: 'sig-2026-09-25-5',
    date: '2026-09-25',
    ticker: '00882',
    title: '中國人行降準與房市政策使內銀淨息差（NIM）收窄約 8~12 bps',
    rawContent: '受存量房貸利率下調與 LPR 調降影響，主要內銀股最新財報顯示淨息差（NIM）平均收窄 8 至 12 個基點（bps），壓抑銀行股短期營收成長空間在 -1% ~ +1% 之間。',
    sourceType: 'app_paste',
    dimension: 'dividend_sustainability',
    direction: 'bearish',
    weight: 3,
    hardFacts: [
      '主要內銀股淨息差（NIM）年減約 8~12 bps',
      '銀行板塊短期營收年增率落在 -1.0% ~ +1.0% 區間',
    ],
    extractedMetrics: [
      { label: 'NIM 變動', value: '-10 bps' },
      { label: '營收年增區間', value: '0.0%' },
    ],
    impliedDividendShift: -0.03,
    objectiveReasoning: '內銀淨息差收窄限制了盈餘與每股股利進一步大幅調升的空間，使配息傾向維持持平而非高成長。',
    tags: ['淨息差', '內銀基本面', '總經政策'],
    extractionMethod: 'rule_engine',
    syncedToDrive: false,
  },
];

// Subjective hype/panic phrases to strip in deterministic rule parser
const NOISE_WORDS_REGEX = /專家強烈看好|無腦買進|散戶恐慌|飆漲|暴跌|上看|外資狂買|必買|崩盤|完美買點|閉眼買/g;

/**
 * Deterministic Rule-Based Extraction Engine (100% Free, Zero AI API required)
 */
export function extractSignalByRules(
  rawText: string,
  sourceUrl: string = '',
  sourceType: SignalSourceType = 'app_paste',
  defaultTicker: string = '00882'
): Omit<IntelligenceSignal, 'id'> {
  const cleanedText = rawText.replace(NOISE_WORDS_REGEX, '').trim();

  // 1. Detect Ticker
  const tickerMatch = cleanedText.match(/\b(00\d{3,4}[A-Z]?|\d{4}\.HK|\d{4})\b/);
  const ticker = tickerMatch ? tickerMatch[1] : defaultTicker;

  // 2. Classify Dimension by keyword scoring
  const divKeywords = ['配息', '派息', '分紅', '除息', 'EPS', '盈餘', '淨利', '可分配', '平準金', '現金流', '淨息差', 'NIM', '營收'];
  const valKeywords = ['股價', '淨值', 'NAV', '折價', '溢價', '殖利率', 'PB', 'PE', '本益比', '估值', '收盤', '買點', '成本'];
  const fxKeywords = ['匯率', '港幣', '人民幣', 'HKD', 'RMB', '二代健保', '補充保費', '扣繳', '稅', '保管費', '費用率', '海外所得', '54C'];

  const scoreKeywords = (kws: string[]) =>
    kws.reduce((acc, kw) => acc + (cleanedText.includes(kw) ? 1 : 0), 0);

  const divScore = scoreKeywords(divKeywords);
  const valScore = scoreKeywords(valKeywords);
  const fxScore = scoreKeywords(fxKeywords);

  let dimension: SignalDimension = 'dividend_sustainability';
  if (fxScore > divScore && fxScore >= valScore) {
    dimension = 'friction_fx';
  } else if (valScore > divScore && valScore > fxScore) {
    dimension = 'valuation_margin';
  }

  // 3. Detect Direction & Weight by factual indicators
  const bullishKeywords = ['成長', '增加', '年增', '提高', '調升', '上調', '不低於', '高於', '承諾', '免扣', '升值', '穩定維持', '超預期', '填息'];
  const bearishKeywords = ['衰退', '減少', '年減', '下調', '調降', '收窄', '下滑', '貶值', '承壓', '縮水', '跌破', '減損', '虧損'];

  const bullCount = scoreKeywords(bullishKeywords);
  const bearCount = scoreKeywords(bearishKeywords);

  let direction: SignalDirection = 'neutral';
  if (bullCount > bearCount) direction = 'bullish';
  else if (bearCount > bullCount) direction = 'bearish';

  const totalSignalStrength = bullCount + bearCount + Math.min(3, divScore + valScore + fxScore);
  const weight = Math.max(1, Math.min(5, totalSignalStrength || 3));

  // 4. Extract Metrics (Percentages, Currency numbers, bps)
  const extractedMetrics: ExtractedMetric[] = [];
  const pctMatches = Array.from(cleanedText.matchAll(/([\u4e00-\u9fa5A-Za-z]{2,8})[為約達佔僅落在至]*\s*([+-]?\d+(?:\.\d+)?%)/g));
  for (const m of pctMatches.slice(0, 4)) {
    extractedMetrics.push({
      label: m[1].replace(/^[的之與及]/, '').slice(0, 6),
      value: m[2],
    });
  }

  const numMatches = Array.from(cleanedText.matchAll(/([\u4e00-\u9fa5A-Za-z]{2,6})\s*([+-]?\d+(?:,\d+)*(?:\.\d+)?)\s*(元|TWD|HKD|bps|張)/g));
  for (const m of numMatches.slice(0, 4 - extractedMetrics.length)) {
    extractedMetrics.push({
      label: m[1].replace(/^[的之與及]/, '').slice(0, 6),
      value: `${m[2]} ${m[3]}`,
    });
  }

  if (extractedMetrics.length === 0) {
    // Fallback generic percentage or number extraction
    const genericPct = cleanedText.match(/[+-]?\d+(?:\.\d+)?%/g);
    if (genericPct) {
      genericPct.slice(0, 3).forEach((val, idx) => {
        extractedMetrics.push({ label: `量化數值 #${idx + 1}`, value: val });
      });
    }
  }

  // 5. Extract Hard Facts (split sentences, prioritize sentences with numbers)
  const sentences = cleanedText
    .split(/[。；！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  const numericSentences = sentences.filter((s) => /\d/.test(s));
  const hardFacts = (numericSentences.length > 0 ? numericSentences : sentences).slice(0, 3);
  if (hardFacts.length === 0) {
    hardFacts.push(cleanedText.slice(0, 80));
  }

  // 6. Generate Objective Title
  const firstSentence = hardFacts[0] || cleanedText;
  const title = firstSentence.length > 28 ? `${firstSentence.slice(0, 28)}...` : firstSentence;

  // 7. Implied Dividend Shift
  let impliedDividendShift = 0;
  if (direction === 'bullish') {
    impliedDividendShift = Number((weight * 0.01).toFixed(2));
  } else if (direction === 'bearish') {
    impliedDividendShift = Number((-weight * 0.01).toFixed(2));
  }

  // 8. Tags
  const allMatchedTags: string[] = [];
  [...divKeywords, ...valKeywords, ...fxKeywords].forEach((kw) => {
    if (cleanedText.includes(kw) && allMatchedTags.length < 4) {
      allMatchedTags.push(kw);
    }
  });
  if (allMatchedTags.length === 0) allMatchedTags.push('客觀情報');

  const dimLabel =
    dimension === 'dividend_sustainability'
      ? '配息續航力'
      : dimension === 'valuation_margin'
      ? '估值安全邊際'
      : '稅費與匯率摩擦';

  const dirLabel =
    direction === 'bullish' ? '正向支撐' : direction === 'bearish' ? '潛在壓抑風險' : '中性客觀觀察';

  return {
    date: new Date().toISOString().split('T')[0],
    ticker,
    title,
    rawContent: rawText,
    sourceUrl: sourceUrl || undefined,
    sourceType,
    dimension,
    direction,
    weight,
    hardFacts,
    extractedMetrics,
    impliedDividendShift,
    objectiveReasoning: `依規則引擎量化拆解，此情報歸屬「${dimLabel}」維度，呈現${dirLabel}（權重 ${weight}/5）。`,
    tags: allMatchedTags,
    extractionMethod: 'rule_engine',
    syncedToDrive: false,
  };
}

/**
 * Deterministic Statistical Trend Synthesis Engine
 */
export function synthesizeObjectiveTrends(signals: IntelligenceSignal[], baseDividend: number = 1.00) {
  let bullWeight = 0;
  let bearWeight = 0;
  let neutralWeight = 0;

  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;

  const dimStats: Record<
    SignalDimension,
    { bullWeight: number; bearWeight: number; count: number; netScore: number }
  > = {
    dividend_sustainability: { bullWeight: 0, bearWeight: 0, count: 0, netScore: 50 },
    valuation_margin: { bullWeight: 0, bearWeight: 0, count: 0, netScore: 50 },
    friction_fx: { bullWeight: 0, bearWeight: 0, count: 0, netScore: 50 },
  };

  let weightedShiftSum = 0;
  let totalWeights = 0;

  signals.forEach((sig) => {
    const w = sig.weight || 1;
    totalWeights += w;
    weightedShiftSum += (sig.impliedDividendShift || 0) * w;

    dimStats[sig.dimension].count += 1;

    if (sig.direction === 'bullish') {
      bullWeight += w;
      bullCount += 1;
      dimStats[sig.dimension].bullWeight += w;
    } else if (sig.direction === 'bearish') {
      bearWeight += w;
      bearCount += 1;
      dimStats[sig.dimension].bearWeight += w;
    } else {
      neutralWeight += w;
      neutralCount += 1;
    }
  });

  // Compute dimension net scores (0 ~ 100, 50 = neutral)
  (Object.keys(dimStats) as SignalDimension[]).forEach((dim) => {
    const d = dimStats[dim];
    const total = d.bullWeight + d.bearWeight;
    if (total > 0) {
      d.netScore = Math.round((d.bullWeight / total) * 100);
    } else {
      d.netScore = 50;
    }
  });

  const totalDirectionalWeight = bullWeight + bearWeight;
  const bullRatioPct = totalDirectionalWeight > 0 ? (bullWeight / totalDirectionalWeight) * 100 : 50;
  const bearRatioPct = totalDirectionalWeight > 0 ? (bearWeight / totalDirectionalWeight) * 100 : 50;

  // Calculate implied dividend scenarios
  const avgShift = totalWeights > 0 ? weightedShiftSum / totalWeights : 0;
  const consensusDividend = Number(Math.max(0.4, baseDividend + avgShift).toFixed(2));

  // Bearish stress test sums negative shifts or takes -8%
  const bearishSignals = signals.filter((s) => s.direction === 'bearish');
  const totalBearShift = bearishSignals.reduce((acc, s) => acc + Math.min(0, s.impliedDividendShift), 0);
  const conservativeDividend = Number(
    Math.max(0.4, baseDividend + Math.min(-0.06, totalBearShift)).toFixed(2)
  );

  // Bullish case sums positive shifts
  const bullishSignals = signals.filter((s) => s.direction === 'bullish');
  const totalBullShift = bullishSignals.reduce((acc, s) => acc + Math.max(0, s.impliedDividendShift), 0);
  const optimisticDividend = Number(
    Math.min(2.0, baseDividend + Math.max(0.06, totalBullShift)).toFixed(2)
  );

  // Determine objective consensus verdict
  let consensusVerdict = '中性持平（配息動能與風險因子均衡）';
  if (bullRatioPct >= 65) {
    consensusVerdict = '客觀偏多支撐（底層分紅與稅後留存具優勢）';
  } else if (bearRatioPct >= 60) {
    consensusVerdict = '客觀偏空警戒（匯率或基本面逆風占主導）';
  }

  return {
    totalSignals: signals.length,
    bullCount,
    bearCount,
    neutralCount,
    bullWeight,
    bearWeight,
    neutralWeight,
    bullRatioPct,
    bearRatioPct,
    dimStats,
    consensusVerdict,
    scenarios: {
      conservative: conservativeDividend,
      consensus: consensusDividend,
      optimistic: optimisticDividend,
    },
    bullishSignals: signals.filter((s) => s.direction === 'bullish'),
    bearishSignals: signals.filter((s) => s.direction === 'bearish'),
    neutralSignals: signals.filter((s) => s.direction === 'neutral'),
  };
}
