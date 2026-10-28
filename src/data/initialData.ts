import { Holding, DividendRecord, Transaction, PortfolioSnapshot } from '../types/portfolio';

export const INITIAL_HOLDINGS: Holding[] = [
  {
    id: 'holding-00882',
    ticker: '00882',
    name: '中信中國高股息',
    shares: 300000, // 300 張
    currentPrice: 14.84,
    buyTotalCost: 4139880, // Buy 合計（不含手續費）
    buyShares: 282000, // 282 張現金買進
    reinvestShares: 18000, // 18 張股息再投入（成本計為 0）
    totalFees: 7502, // 手續費另列，不併入每股成本
    annualDividendPerShare: 1.00, // 2026/1 除息 0.45 + 2026/7 除息 0.55
    market: '台股',
    underlyingDesc: '底層為港股中國高股息股',
    lastUpdated: '2026-10-01',
  },
];

export const INITIAL_DIVIDENDS: DividendRecord[] = [
  {
    id: 'div-2026-07',
    ticker: '00882',
    exDividendDate: '2026-07-16',
    paymentDate: '2026-08-11',
    dividendPerShare: 0.55,
    holdingShares: 290000, // 當時持股 290 張
    grossAmount: 159500, // 290,000 * 0.55
    nhiTaxAmount: 1156, // 證交所將 54,810 (34.36%) 列為大陸營利所得扣繳 2.11%
    otherFees: 0,
    netAmount: 158344, // 實收
    reinvestedShares: 10000, // 8/11 再投入 10 張
    reinvestedAmount: 148400,
    notes: '7 月除息 0.55，8/11 入帳 158,344，其中 10 張股息再投入。扣繳二代健保補充保費 1,156。',
  },
  {
    id: 'div-2026-01',
    ticker: '00882',
    exDividendDate: '2026-01-16',
    paymentDate: '2026-02-15',
    dividendPerShare: 0.45,
    holdingShares: 262000, // 當時持股 262 張
    grossAmount: 117900, // 262,000 * 0.45
    nhiTaxAmount: 1216, // 大陸地區營利所得 57,640 (48.89%) 扣繳 2.11% 補充保費
    otherFees: 0,
    netAmount: 116684, // 實收
    reinvestedShares: 8000, // 再投入 8 張
    reinvestedAmount: 112000,
    notes: '1 月除息 0.45，給付總額 117,900，其中大陸營利所得 57,640 (48.89%) 扣繳二代健保 1,216，實收 116,684。',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    ticker: '00882',
    date: '2026-08-11',
    type: 'Reinvest',
    shares: 10000,
    price: 14.84,
    fees: 0,
    notes: '7 月股利實收 158,344 入帳後，股息再投入 10 張（零成本計入真實成本）',
  },
  {
    id: 'tx-002',
    ticker: '00882',
    date: '2026-06-20',
    type: 'Buy',
    shares: 28000,
    price: 14.70,
    fees: 588,
    notes: '除息前定期加碼 28 張',
  },
  {
    id: 'tx-003',
    ticker: '00882',
    date: '2026-02-20',
    type: 'Reinvest',
    shares: 8000,
    price: 14.00,
    fees: 0,
    notes: '1 月股利入帳後再投入 8 張（零成本）',
  },
  {
    id: 'tx-004',
    ticker: '00882',
    date: '2025-10-15',
    type: 'Buy',
    shares: 254000,
    price: 14.68,
    fees: 6914,
    notes: '初始部位建立與定期買進累計 254 張',
  },
];

export const INITIAL_SNAPSHOTS: PortfolioSnapshot[] = [
  {
    id: 'snapshot-2026-10-01',
    date: '2026-10-01',
    title: '持股快照 2026-10-01',
    totalMarketValue: 4452000,
    totalRealCost: 4139880,
    projectedAnnualDividend: 300000,
    gapAmount: 200000,
    requiredCapital: 2970000,
    holdingsSummary: [
      {
        ticker: '00882',
        shares: 300000,
        price: 14.84,
        marketValue: 4452000,
        yieldPct: 6.74,
      },
    ],
    notes: '真實成本：Buy 合計 4,139,880（不含手續費 7,502），Reinvest 18 張成本計 0。2026 年已入帳股利 275,028。距年領 50 萬目標缺口約 200,000/年，約需再投入 2,970,000 TWD。',
  },
];

export const CONTROLLED_VOCABULARY = {
  domain: ['目標', '配置', '現金流', '股利', '風險', '稅務', '決策規則', '資料系統'],
  status: ['草稿', '生效', '修訂中', '廢止'],
  tags: [
    '高股息', '股利', '再投入', '複利', 'ETF', '台股', '港股', '中國', 
    '美股', '日股', '集中度', '殖利率', '成本', '手續費', '二代健保', 
    '匯率', '現金部位', '再平衡'
  ],
};
