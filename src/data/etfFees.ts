/**
 * 各檔 ETF 的「總管理費用率」（內扣費用，含經理費、保管費、指數授權費、交易雜支等）。
 *
 * 來源：MoneyDJ ETF 基本資料頁（https://www.moneydj.com/etf/x/basic/basic0004.xdjhtm?etfid=XXXX.tw），
 * 其數值轉載自投信公會與公開說明書，為第三方彙整，非官方原始揭露。
 * 查證日期：2026-10-19。投信會依年度調整，請定期重新查證；若要最嚴謹，可對照
 * 投信公會「各項費用比率」或各投信官網的公開說明書。
 */
export const ETF_FEES_VERIFIED_AT = '2026-10-19';
export const ETF_FEES_SOURCE = 'MoneyDJ（轉載投信公會／公開說明書）';

export interface EtfFeeRecord {
  /** 經理費（%） */
  mgmtPct: number;
  /** 總管理費用率（%），作為持有成本 TER */
  totalExpensePct: number;
  note?: string;
}

export const ETF_FEES: Record<string, EtfFeeRecord> = {
  '0050': { mgmtPct: 0.15, totalExpensePct: 0.22 },
  '0056': { mgmtPct: 0.4, totalExpensePct: 0.57 },
  '006208': { mgmtPct: 0.1, totalExpensePct: 0.23 },
  '00645': { mgmtPct: 0.5, totalExpensePct: 0.76 },
  '00646': { mgmtPct: 0.3, totalExpensePct: 0.36 },
  '00657': { mgmtPct: 0.45, totalExpensePct: 1.3 },
  '00661': { mgmtPct: 0.5, totalExpensePct: 0.6 },
  '00662': { mgmtPct: 0.3, totalExpensePct: 0.54 },
  '00679B': { mgmtPct: 0.1, totalExpensePct: 0.14 },
  '00687B': { mgmtPct: 0.1, totalExpensePct: 0.15 },
  '00692': { mgmtPct: 0.15, totalExpensePct: 0.23 },
  '00710B': { mgmtPct: 0.3, totalExpensePct: 0.46 },
  '00712': { mgmtPct: 0.25, totalExpensePct: 3.77, note: "總管理費用含 3.52 非管理費用（疑為海外不動產標的交易成本），數值偏高請留意" },
  '00713': { mgmtPct: 0.45, totalExpensePct: 0.72 },
  '00720B': { mgmtPct: 0.3, totalExpensePct: 0.39 },
  '00751B': { mgmtPct: 0.18, totalExpensePct: 0.25 },
  '00757': { mgmtPct: 0.85, totalExpensePct: 1.12 },
  '00772B': { mgmtPct: 0.2, totalExpensePct: 0.31 },
  '00830': { mgmtPct: 0.35, totalExpensePct: 0.58 },
  '00878': { mgmtPct: 0.25, totalExpensePct: 0.53 },
  '00881': { mgmtPct: 0.4, totalExpensePct: 0.55 },
  '00882': { mgmtPct: 0.45, totalExpensePct: 0.93 },
  '00891': { mgmtPct: 0.4, totalExpensePct: 0.62 },
  '00915': { mgmtPct: 0.25, totalExpensePct: 0.84 },
  '00918': { mgmtPct: 0.35, totalExpensePct: 0.82 },
  '00919': { mgmtPct: 0.3, totalExpensePct: 0.69 },
  '00923': { mgmtPct: 0.32, totalExpensePct: 0.59 },
  '00929': { mgmtPct: 0.3, totalExpensePct: 0.9 },
  '00933B': { mgmtPct: 0.2, totalExpensePct: 0.28 },
  '00935': { mgmtPct: 0.4, totalExpensePct: 0.64 },
  '00937B': { mgmtPct: 0.2, totalExpensePct: 0.26 },
  '00939': { mgmtPct: 0.3, totalExpensePct: 1.02 },
  '00940': { mgmtPct: 0.3, totalExpensePct: 0.62 },
  '00945B': { mgmtPct: 0.3, totalExpensePct: 0.4 },
  '00949': { mgmtPct: 0.6, totalExpensePct: 1.27 },
  '00951': { mgmtPct: 0.45, totalExpensePct: 0.45, note: "新成立基金，網站總管理費用(0.17)低於經理費，採經理費 0.45" },
  '00954': { mgmtPct: 0.6, totalExpensePct: 0.86 },
  '00955': { mgmtPct: 0.6, totalExpensePct: 0.7 },
  '00956': { mgmtPct: 0.5, totalExpensePct: 0.8 },
  '00985A': { mgmtPct: 0.45, totalExpensePct: 0.88, note: "首批主動式 ETF，總管理費用含主動選股營運成本" },
};
