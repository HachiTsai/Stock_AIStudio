import { Holding, DividendRecord, Transaction, PortfolioSnapshot, ArchNote } from '../types/portfolio';

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
    nhiTaxAmount: 0, // 當期無補充保費扣繳
    otherFees: 0,
    netAmount: 117900,
    reinvestedShares: 8000, // 再投入 8 張
    reinvestedAmount: 112000,
    notes: '1 月除息 0.45，實收 117,900，全額相符無健保扣繳。',
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
    targetProgressPct: 60.0,
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
    notes: '真實成本：Buy 合計 4,139,880（不含手續費 7,502），Reinvest 18 張成本計 0。2026 年已入帳股利 276,244。距年領 50 萬目標缺口約 200,000/年，約需再投入 2,970,000 TWD。',
  },
];

export const INITIAL_ARCH_NOTE: ArchNote = {
  id: 'arch-dividend-target-model',
  type: 'arch',
  title: '股利目標模型',
  domain: '目標',
  status: '生效',
  version: 2,
  created: '2026-10-01',
  updated: '2026-10-01',
  tags: ['股利', '高股息', '複利', '殖利率', '二代健保'],
  review: '2027-01-31',
  tickers: ['00882'],
  aliases: ['年股利50萬目標', '股利缺口試算'],
  sources: ['portfolio/snapshots/2026-10-01.md', 'Investment_Tracker_Core'],
  summary: '以每年股利實收 500,000 TWD 為目標；用「持股 × 近一年每股配息」推估年股利，再以「缺口 ÷ 殖利率」算出還需追加的本金。2026-10-01 進度 60%，缺口約 200,000／年，約需再投入 2,970,000。',
  rules: [
    '目標：每年股利實收 ≥ 500,000 TWD。',
    '年股利推估 = Σ（各標的持股數 × 該標的近一年每股配息），假設配息持平。',
    '進度 = 年股利推估 ÷ 500,000。',
    '缺口 = 500,000 − 年股利推估；推估 ≥ 目標時缺口記為 0。',
    '需追加本金 = 缺口 ÷ 預計投入標的的現行殖利率（近一年每股配息 ÷ 現價）。',
    '重算時機：每次產生持股快照、每次除息公告或股利入帳後重算，結果寫進當期快照。',
    '推估一律註明「假設配息持平」，不得寫成確定收入。',
    '推估是配息總額，判斷是否達標以實收為準：實收 = 配息總額 − 二代健保補充保費。補充保費 = 證交所認定的應扣繳部分 × 2.11%，每次入帳都要記錄實際扣除額。',
    '各期應扣繳的比例不固定（2026/1 為 0，2026/7 為 34.36%），因此推估不套用固定扣除率。改以「近一年實際扣除額合計」說明推估與實收的落差。',
  ],
  reasons: {
    facts: [
      '00882 持有 300,000 股，近一年每股配息 1.00（2026/1 除息 0.45＋2026/7 除息 0.55），現價 14.84，殖利率 6.74%。',
      '年股利推估 300,000 × 1.00 = 300,000，進度 60%；缺口 200,000。',
      '需追加本金 200,000 ÷ 6.74% ≈ 2,967,000（快照取整為 2,970,000，約 200 張 00882 或同等殖利率標的）。',
      '2026 年已入帳股利 276,244。',
      '推估與實收的差異：1 月實收 117,900 = 262,000 股 × 0.45，完全相符。7 月除息時持股 290,000 股，應配 159,500，實收 158,344，少 1,156（約 0.72%）。',
      '7 月差額來源：證交所把當期股利中的 54,810（佔 34.36%）列為大陸地區營利所得，扣繳二代健保補充保費 54,810 × 2.11% = 1,156。',
      '近一年補充保費扣除合計 1,156。',
    ],
    judgments: [
      '目標是「現金流」而不是「資產總值」，因此用殖利率倒推本金，比用報酬率估算更直接。',
      '用近一年實際配息、不用預測值：可驗證，也避免把樂觀預期寫進模型。',
    ],
  },
  scopeAndExceptions: [
    '適用：所有以配息為主要目的的持股；目前只有 00882。',
    '推估是配息總額，不是實收：判斷是否達標時，要扣除近一年實際補充保費（規則 8、9）。',
    '例外：配息未滿一年的新標的，以已公告的配息年化估算，並在快照中註明是估算值。',
  ],
  changelog: [
    {
      version: 2,
      date: '2026-10-01',
      changes: 'status 由草稿改為生效；新增規則 8（判斷達標以實收為準，扣除二代健保 2.11%）與規則 9（不套用固定扣除率）；理由補上 7 月差額來源 1,156。',
      reason: 'Hachi 確認 1,156 是證交所把部分股利（54,810）列為大陸地區營利所得而扣繳的補充保費，並確認規則生效。',
    },
    {
      version: 1,
      date: '2026-10-01',
      changes: '建立股利目標模型，定義推估、進度、缺口、追加本金的算法與重算時機。',
      reason: '建立財商工程大本營，把「年股利 50 萬」目標量化成可重複計算的規則。',
    },
  ],
};

export const CONTROLLED_VOCABULARY = {
  domain: ['目標', '配置', '現金流', '股利', '風險', '稅務', '決策規則', '資料系統'],
  status: ['草稿', '生效', '修訂中', '廢止'],
  tags: [
    '高股息', '股利', '再投入', '複利', 'ETF', '台股', '港股', '中國', 
    '美股', '日股', '集中度', '殖利率', '成本', '手續費', '二代健保', 
    '匯率', '現金部位', '再平衡'
  ],
};
