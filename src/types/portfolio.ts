export type DomainType = 
  | '目標' 
  | '配置' 
  | '現金流' 
  | '股利' 
  | '風險' 
  | '稅務' 
  | '決策規則' 
  | '資料系統';

export type NoteStatus = '草稿' | '生效' | '修訂中' | '廢止';

export type NoteType = 'arch' | 'research' | 'trends' | 'journal';

export interface Holding {
  id: string;
  ticker: string; // e.g. '00882'
  name: string; // e.g. '中信中國高股息'
  shares: number; // e.g. 300,000 (300 張)
  currentPrice: number; // e.g. 14.84
  buyTotalCost: number; // e.g. 4,139,880 (純買進本金)
  buyShares: number; // e.g. 282,000 (282 張)
  reinvestShares: number; // e.g. 18,000 (18 張，成本計為 0)
  totalFees: number; // e.g. 7,502 (手續費另計)
  annualDividendPerShare: number; // e.g. 1.00
  market: '台股' | '美股' | '日股' | '港股';
  underlyingDesc: string; // e.g. '港股中國高股息'
  lastUpdated: string; // YYYY-MM-DD
}

export interface DividendRecord {
  id: string;
  ticker: string;
  exDividendDate: string; // 除息日 e.g. '2026-01-15'
  paymentDate: string; // 入帳日 e.g. '2026-02-15'
  dividendPerShare: number; // 每股配息
  holdingShares: number; // 當期持股股數
  grossAmount: number; // 應配總額 (持股 * 每股配息)
  nhiTaxAmount: number; // 二代健保補充保費 (應扣繳部分 * 2.11%)
  otherFees: number; // 匯費或其他費用
  netAmount: number; // 實收金額
  reinvestedShares: number; // 實收再投入張數/股數
  reinvestedAmount: number; // 再投入金額
  notes: string;
}

export interface Transaction {
  id: string;
  ticker: string;
  date: string; // YYYY-MM-DD
  type: 'Buy' | 'Sell' | 'Reinvest';
  shares: number;
  price: number;
  fees: number;
  notes: string;
}

export interface PortfolioSnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  totalMarketValue: number;
  totalRealCost: number;
  projectedAnnualDividend: number;
  targetProgressPct: number;
  gapAmount: number;
  requiredCapital: number;
  holdingsSummary: {
    ticker: string;
    shares: number;
    price: number;
    marketValue: number;
    yieldPct: number;
  }[];
  notes: string;
}

export interface ArchNote {
  id: string;
  type: NoteType;
  title: string;
  domain: DomainType;
  status: NoteStatus;
  version: number;
  created: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  tags: string[];
  review?: string; // YYYY-MM-DD
  tickers?: string[];
  aliases?: string[];
  sources?: string[];
  summary: string;
  rules: string[];
  reasons: {
    facts: string[];
    judgments: string[];
  };
  scopeAndExceptions: string[];
  changelog: {
    version: number;
    date: string;
    changes: string;
    reason: string;
    superseded?: string;
  }[];
}

export type SignalDimension = 'dividend_sustainability' | 'valuation_margin' | 'friction_fx';
export type SignalDirection = 'bullish' | 'neutral' | 'bearish';
export type SignalSourceType = 'app_paste' | 'url_fetch' | 'drive_doc' | 'drive_sheet' | 'drive_slide' | 'drive_md' | 'local_md';

export interface ExtractedMetric {
  label: string;
  value: string;
}

export interface IntelligenceSignal {
  id: string;
  date: string; // YYYY-MM-DD
  ticker: string; // e.g. '00882'
  title: string;
  rawContent: string;
  sourceUrl?: string;
  sourceType: SignalSourceType;
  dimension: SignalDimension;
  direction: SignalDirection;
  weight: number; // 1 ~ 5
  hardFacts: string[];
  extractedMetrics: ExtractedMetric[];
  impliedDividendShift: number; // e.g. +0.04, 0, -0.05 TWD/share
  objectiveReasoning: string;
  tags: string[];
  extractionMethod: 'rule_engine' | 'ai_assisted';
  syncedToDrive?: boolean;
  driveFileId?: string;
}

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

