import { 
  IntelligenceSignal, 
  SignalDimension, 
  SignalDirection, 
  SignalSourceType, 
  ExtractedMetric 
} from '../types/portfolio';
import { ETF_TAX_FEE_MAP } from '../services/constituentsFeedService';
import { ALL_MARKET_SUMMARY_FALLBACK } from '../data/allMarketEtfSnapshot';

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
  // 0. Structured Markdown / ArchNote / CLAUDE.md detection
  const hasFrontmatter = rawText.includes('---') && (rawText.includes('title:') || rawText.includes('type:'));
  const hasMarkdownSections = rawText.includes('## 結論摘要') || rawText.includes('## 萃取硬數據') || rawText.includes('## 規則') || rawText.includes('## 摘要');

  if (hasFrontmatter || hasMarkdownSections) {
    const titleMatch = rawText.match(/^title:\s*(.+)$/m)?.[1] || rawText.match(/^#\s+(.+)$/m)?.[1];
    const tickerMatch = rawText.match(/tickers?:\s*\[(.*?)\]/m)?.[1]?.split(',')?.[0]?.replace(/['"]/g, '').trim() ||
      rawText.match(/\b(00\d{3,4}[A-Z]?|\d{4}\.HK|\d{4})\b/)?.[1] || defaultTicker;
    
    const tagsMatch = rawText.match(/tags:\s*\[(.*?)\]/m)?.[1];
    const parsedTags = tagsMatch ? tagsMatch.split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean) : [];

    let dimension: SignalDimension = 'dividend_sustainability';
    if (rawText.includes('估值安全邊際') || rawText.includes('估值與安全邊際') || rawText.includes('valuation_margin')) {
      dimension = 'valuation_margin';
    } else if (rawText.includes('稅費與匯率摩擦') || rawText.includes('匯率') || rawText.includes('二代健保') || rawText.includes('friction_fx')) {
      dimension = 'friction_fx';
    }

    let direction: SignalDirection = 'neutral';
    if (rawText.includes('正向支撐') || rawText.includes('bullish') || rawText.includes('正向 (+)')) {
      direction = 'bullish';
    } else if (rawText.includes('潛在風險') || rawText.includes('bearish') || rawText.includes('潛在壓抑')) {
      direction = 'bearish';
    }

    const weightMatch = rawText.match(/權重\s*(\d)\/5/);
    const weight = weightMatch ? parseInt(weightMatch[1], 10) : (direction !== 'neutral' ? 4 : 3);

    const shiftMatch = rawText.match(/(?:對每股年配息邊際影響推估|impliedDividendShift)[：:\s]*([+-]?\d+(?:\.\d+)?)/);
    let impliedDividendShift = shiftMatch ? parseFloat(shiftMatch[1]) : (direction === 'bullish' ? 0.03 : direction === 'bearish' ? -0.03 : 0);

    // Hard Facts extraction from sections
    const hardFacts: string[] = [];
    const factsSection = rawText.match(/## (?:萃取硬數據|規則|事實|理由)[^\n]*\n([\s\S]*?)(?=\n## |$)/);
    if (factsSection) {
      const lines = factsSection[1].split('\n')
        .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
        .filter((l) => l.length >= 4 && !l.startsWith('#'));
      hardFacts.push(...lines.slice(0, 4));
    }

    // Metrics extraction
    const extractedMetrics: ExtractedMetric[] = [];
    const metricMatches = Array.from(rawText.matchAll(/[-*]\s*\*\*([^*]+)\*\*[：:]\s*`?([^`\n]+)`?/g));
    for (const m of metricMatches.slice(0, 4)) {
      extractedMetrics.push({ label: m[1].trim(), value: m[2].trim() });
    }

    // Objective Reasoning extraction
    let objectiveReasoning = '';
    const reasonMatch = rawText.match(/(?:客觀推論|客觀推導|摘要|結論)[：:\s]*([^\n]+)/);
    if (reasonMatch && reasonMatch[1].trim()) {
      objectiveReasoning = reasonMatch[1].trim();
    } else {
      objectiveReasoning = `由 Google Drive 匯入之「${titleMatch?.trim() || '客觀分析筆記'}」，已完成結構化屬性對齊。`;
    }

    return {
      date: new Date().toISOString().split('T')[0],
      ticker: tickerMatch,
      title: titleMatch ? titleMatch.trim() : 'Google Drive 分析筆記',
      rawContent: rawText,
      sourceUrl: sourceUrl || undefined,
      sourceType: sourceType === 'app_paste' ? 'drive_doc' : sourceType,
      dimension,
      direction,
      weight,
      hardFacts: hardFacts.length > 0 ? hardFacts : ['自雲端硬碟檔案中解析之結構化事實'],
      extractedMetrics,
      impliedDividendShift,
      objectiveReasoning,
      tags: parsedTags.length > 0 ? parsedTags : ['Drive筆記', '客觀情報'],
      extractionMethod: 'rule_engine',
      syncedToDrive: true,
    };
  }

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

export interface ObjectiveDimensionStat {
  bullWeight: number;
  bearWeight: number;
  count: number;
  netScore: number;
  radarBaseScore: number;
  signalSupportPct: number;
  benchmarkDescription: string;
}

/**
 * Deterministic Statistical Trend Synthesis Engine
 */
export function synthesizeObjectiveTrends(
  signals: IntelligenceSignal[], 
  baseDividend: number = 1.00,
  targetTicker: string = '00882'
) {
  let bullWeight = 0;
  let bearWeight = 0;
  let neutralWeight = 0;

  let bullCount = 0;
  let bearCount = 0;
  let neutralCount = 0;

  // 取得目標標的在全市場四象圖與基本面體檢庫之客觀基準指標
  const summary = ALL_MARKET_SUMMARY_FALLBACK.find((s) => s.etf_id === targetTicker);
  const taxMetrics = ETF_TAX_FEE_MAP[targetTicker];

  const baseDivScore = summary?.div_score ? Number(summary.div_score) : 66.5;
  const baseValScore = summary?.val_score ? Number(summary.val_score) : 95.2;
  const baseFricScore = taxMetrics?.fricScore ?? (summary?.fric_score ? Number(summary.fric_score) : 80.5);

  const dimStats: Record<SignalDimension, ObjectiveDimensionStat> = {
    dividend_sustainability: {
      bullWeight: 0,
      bearWeight: 0,
      count: 0,
      netScore: baseDivScore,
      radarBaseScore: baseDivScore,
      signalSupportPct: 50,
      benchmarkDescription: `四象圖基準：${summary?.constituent_count || 49} 檔成分股加權分紅狀況（基準 ${baseDivScore.toFixed(1)} 分）`,
    },
    valuation_margin: {
      bullWeight: 0,
      bearWeight: 0,
      count: 0,
      netScore: baseValScore,
      radarBaseScore: baseValScore,
      signalSupportPct: 50,
      benchmarkDescription: `四象圖基準：高殖利率位階與折價安全邊際（基準 ${baseValScore.toFixed(1)} 分）`,
    },
    friction_fx: {
      bullWeight: 0,
      bearWeight: 0,
      count: 0,
      netScore: baseFricScore,
      radarBaseScore: baseFricScore,
      signalSupportPct: 50,
      benchmarkDescription: `四象圖基準：實質年損耗 ${taxMetrics ? taxMetrics.totalFrictionPct.toFixed(2) : '0.99'}%（TER ${taxMetrics ? taxMetrics.terPct.toFixed(2) : '0.93'}% + 二代健保實質負擔）`,
    },
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

  // Compute dimension net scores (連動四象圖量化基準，並依正反證據邊際動態合成)
  (Object.keys(dimStats) as SignalDimension[]).forEach((dim) => {
    const d = dimStats[dim];
    const total = d.bullWeight + d.bearWeight;
    d.signalSupportPct = total > 0 ? Math.round((d.bullWeight / total) * 100) : 50;
    // 依累積情報之正反證據權重進行微調校準（±2.5 分以內，忠實反映情報邊際效應同時錨定四象圖基準）
    const shift = total > 0 ? ((d.bullWeight - d.bearWeight) / total) * 1.5 : 0;
    d.netScore = Number(Math.min(100, Math.max(0, d.radarBaseScore + shift)).toFixed(1));
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
