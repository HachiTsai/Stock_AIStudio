import { parseCsv } from './signalsFeedService';

// Drive: Project_財商工程/Portfolio_00882/成分股股利資料庫/00882_成分股股利資料庫（資料夾為知道連結者可檢視，免登入）
// 由 Investment_Tracker 端每月底排程（富途牛牛＋中信投信持股）重建；APP 只讀不寫。
export const CONSTITUENTS_SHEET_ID = '1Jq599WzoQUDsooZDhJhyK8uaEMgDiLLCoZthWk2WXtw';

const csvUrl = (sheet: string) =>
  `https://docs.google.com/spreadsheets/d/${CONSTITUENTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;

export interface ConstituentRow {
  code: string;
  name: string;
  weightPct: number;
  divTtmHkd: number;
  divLfyHkd: number;
  chgPct: number;
  yieldTtmPct: number;
  interim2026: string;
}

export interface ConstituentsFeed {
  rows: ConstituentRow[];
  summary: Record<string, string>;
}

async function fetchCsv(sheet: string): Promise<string[][]> {
  const res = await fetch(csvUrl(sheet));
  if (!res.ok) throw new Error(`讀取成分股股利資料庫失敗 (${res.status})`);
  return parseCsv(await res.text());
}

export async function fetchConstituentsFeed(): Promise<ConstituentsFeed> {
  const [rowsCsv, sumCsv] = await Promise.all([fetchCsv('成分股'), fetchCsv('摘要')]);
  const header = (rowsCsv[0] ?? []).map((h) => h.trim());
  const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
  const rows = rowsCsv
    .slice(1)
    .filter((r) => col(r, 'code'))
    .map((r) => ({
      code: col(r, 'code'),
      name: col(r, 'name'),
      weightPct: Number(col(r, 'weightPct')) || 0,
      divTtmHkd: Number(col(r, 'divTtmHkd')) || 0,
      divLfyHkd: Number(col(r, 'divLfyHkd')) || 0,
      chgPct: Number(col(r, 'chgPct')) || 0,
      yieldTtmPct: Number(col(r, 'yieldTtmPct')) || 0,
      interim2026: col(r, 'interim2026'),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);
  const summary: Record<string, string> = {};
  sumCsv.slice(1).forEach((r) => {
    if (r[0]) summary[r[0].trim()] = (r[1] ?? '').trim();
  });
  return { rows, summary };
}

// Drive: Project_財商工程/All_Market/全市場_ETF成分股資料庫（資料夾為知道連結者可檢視，免登入）
// 由 Investment_Tracker 端 tw-etf-fetcher 技能維護；APP 只讀不寫。
export const ALL_MARKET_ETF_SHEET_ID = '1GIhbRyL-h96ACVjlSSW9YUFMiAItg_SP9Wi0o3WwG70';

export const allMarketCsvUrl = (sheet: string) =>
  `https://docs.google.com/spreadsheets/d/${ALL_MARKET_ETF_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;

const FOUR_DIGIT_ETFS = new Set(['0050', '0051', '0052', '0053', '0054', '0055', '0056']);

export function normalizeEtfId(id: string): string {
  const clean = id.trim().toUpperCase();
  if (!clean) return '';

  // 帶 B 債券 ETF，如 679B, 00679B
  if (/^\d+B$/.test(clean)) {
    const num = clean.slice(0, -1);
    return `${num.padStart(5, '0')}B`;
  }

  // 純數字
  if (/^\d+$/.test(clean)) {
    const numVal = parseInt(clean, 10);
    // 0050, 0056 等少數 4 碼 ETF
    if (numVal === 50 || numVal === 56 || (clean.length <= 4 && FOUR_DIGIT_ETFS.has(clean.padStart(4, '0')))) {
      return clean.padStart(4, '0');
    }
    // 其餘所有台股跨市場 ETF 一律為 5 碼（如 00882, 00878, 00919, 00646 等）
    return clean.padStart(5, '0');
  }

  return clean;
}

export function cleanHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export const ETF_NAME_TO_ID: Record<string, string> = {
  '元大台灣50': '0050',
  '元大高股息': '0056',
  '富邦台50': '006208',
  '富邦日本': '00645',
  '元大 S&P500': '00646',
  '國泰日經225': '00657',
  '元大日經225': '00661',
  '富邦NASDAQ': '00662',
  '元大美債20年': '00679B',
  '國泰20年美債': '00687B',
  '富邦公司治理': '00692',
  '復華彭博非投等債': '00710B',
  '復華富時不動產': '00712',
  '元大台灣高息低波': '00713',
  '元大投資級公司債': '00720B',
  '元大AAA至A公司債': '00751B',
  '統一FANG+': '00757',
  '中信高評級公司債': '00772B',
  '國泰費城半導體': '00830',
  '國泰永續高股息': '00878',
  '國泰台灣科技龍頭': '00881',
  '00882 中信中國高股息': '00882',
  '中信中國高股息': '00882',
  '凱基優選高股息30': '00915',
  '大華優利高填息30 ETF': '00918',
  '群益台灣精選高息': '00919',
  '復華台灣科技優息': '00929',
  '國泰10Y+金融債': '00933B',
  '群益ESG投等債20+': '00937B',
  '統一台灣高息動能ETF基金': '00939',
  '元大台灣價值高息': '00940',
  '凱基美國非投等債': '00945B',
  '復華日本龍頭': '00949',
  '台新日本半導體ETF': '00951',
  '中信日本半導體': '00954',
  '中信日經高股息': '00956',
};

export function resolveEtfId(rawId: string, name: string): string {
  const clean = cleanHtmlEntities(name);
  if (rawId && rawId.trim()) {
    return normalizeEtfId(rawId);
  }
  return ETF_NAME_TO_ID[clean] || (clean.toUpperCase().includes('00882') ? '00882' : '');
}

export interface EtfTaxFeeMetrics {
  terPct: number;
  nhiPct: number;
  stampTaxPct: number;
  totalFrictionPct: number;
  costPerMillion: number;
  fricScore: number;
  taxNote: string;
}

export const ETF_TAX_FEE_MAP: Record<string, EtfTaxFeeMetrics> = {
  // 台股高息/大盤 (13)
  '0050': { terPct: 0.43, nhiPct: 0.068, stampTaxPct: 0.10, totalFrictionPct: 0.50, costPerMillion: 4980, fricScore: 88.0, taxNote: '境內 54C 課健保，股票證交稅 0.1%' },
  '0056': { terPct: 0.65, nhiPct: 0.117, stampTaxPct: 0.10, totalFrictionPct: 0.77, costPerMillion: 7670, fricScore: 81.0, taxNote: '境內高息 54C 課健保，股票證交稅 0.1%' },
  '006208': { terPct: 0.25, nhiPct: 0.064, stampTaxPct: 0.10, totalFrictionPct: 0.31, costPerMillion: 3140, fricScore: 93.0, taxNote: '低經理費優勢，54C 課健保，股票證交稅 0.1%' },
  '00692': { terPct: 0.35, nhiPct: 0.076, stampTaxPct: 0.10, totalFrictionPct: 0.43, costPerMillion: 4260, fricScore: 90.0, taxNote: '公司治理 54C 課健保，股票證交稅 0.1%' },
  '00713': { terPct: 0.62, nhiPct: 0.095, stampTaxPct: 0.10, totalFrictionPct: 0.72, costPerMillion: 7150, fricScore: 82.0, taxNote: '高息低波 54C 課健保，股票證交稅 0.1%' },
  '00878': { terPct: 0.46, nhiPct: 0.101, stampTaxPct: 0.10, totalFrictionPct: 0.56, costPerMillion: 5610, fricScore: 86.0, taxNote: '永續高息 54C 課健保，股票證交稅 0.1%' },
  '00881': { terPct: 0.55, nhiPct: 0.080, stampTaxPct: 0.10, totalFrictionPct: 0.63, costPerMillion: 6300, fricScore: 84.0, taxNote: '科技龍頭 54C 課健保，股票證交稅 0.1%' },
  '00915': { terPct: 0.58, nhiPct: 0.110, stampTaxPct: 0.10, totalFrictionPct: 0.69, costPerMillion: 6900, fricScore: 83.0, taxNote: '優選高息 54C 課健保，股票證交稅 0.1%' },
  '00918': { terPct: 0.60, nhiPct: 0.125, stampTaxPct: 0.10, totalFrictionPct: 0.73, costPerMillion: 7250, fricScore: 82.0, taxNote: '高填息 54C 課健保，股票證交稅 0.1%' },
  '00919': { terPct: 0.68, nhiPct: 0.116, stampTaxPct: 0.10, totalFrictionPct: 0.80, costPerMillion: 7960, fricScore: 80.0, taxNote: '精選高息 54C 課健保，股票證交稅 0.1%' },
  '00929': { terPct: 0.52, nhiPct: 0.120, stampTaxPct: 0.10, totalFrictionPct: 0.64, costPerMillion: 6400, fricScore: 84.0, taxNote: '科技高息 54C 課健保，股票證交稅 0.1%' },
  '00939': { terPct: 0.56, nhiPct: 0.090, stampTaxPct: 0.10, totalFrictionPct: 0.65, costPerMillion: 6500, fricScore: 84.0, taxNote: '高息動能 54C 課健保，股票證交稅 0.1%' },
  '00940': { terPct: 0.48, nhiPct: 0.085, stampTaxPct: 0.10, totalFrictionPct: 0.57, costPerMillion: 5650, fricScore: 86.0, taxNote: '價值高息 54C 課健保，股票證交稅 0.1%' },

  // 00882 (定錨規則)
  '00882': { terPct: 0.90, nhiPct: 0.049, stampTaxPct: 0.10, totalFrictionPct: 0.95, costPerMillion: 9490, fricScore: 85.0, taxNote: '★ 僅 34.36% 大陸營利所得課二代健保，65.64% 海外所得免課' },

  // 美股市場 (5)
  '00646': { terPct: 0.41, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.41, costPerMillion: 4100, fricScore: 90.0, taxNote: '標普500，海外所得 76 完全免二代健保' },
  '00662': { terPct: 0.52, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.52, costPerMillion: 5200, fricScore: 87.0, taxNote: 'NASDAQ-100，海外所得 76 完全免二代健保' },
  '00757': { terPct: 0.88, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.88, costPerMillion: 8800, fricScore: 78.0, taxNote: 'FANG+ 尖牙股，海外所得 76 完全免二代健保' },
  '00830': { terPct: 0.65, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.65, costPerMillion: 6500, fricScore: 84.0, taxNote: '費城半導體，海外所得 76 完全免二代健保' },
  '00712': { terPct: 0.75, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.75, costPerMillion: 7500, fricScore: 81.0, taxNote: '富時不動產，海外所得 76 完全免二代健保' },

  // 日股市場 (7)
  '00645': { terPct: 0.58, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.58, costPerMillion: 5800, fricScore: 86.0, taxNote: '日股東證，海外所得 76 完全免二代健保' },
  '00657': { terPct: 0.62, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.62, costPerMillion: 6200, fricScore: 85.0, taxNote: '日經225，海外所得 76 完全免二代健保' },
  '00661': { terPct: 0.60, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.60, costPerMillion: 6000, fricScore: 85.0, taxNote: '元大日經，海外所得 76 完全免二代健保' },
  '00949': { terPct: 0.65, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.65, costPerMillion: 6500, fricScore: 84.0, taxNote: '日本龍頭，海外所得 76 完全免二代健保' },
  '00951': { terPct: 0.68, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.68, costPerMillion: 6800, fricScore: 83.0, taxNote: '日本半導體，海外所得 76 完全免二代健保' },
  '00954': { terPct: 0.68, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.68, costPerMillion: 6800, fricScore: 83.0, taxNote: '中信日半，海外所得 76 完全免二代健保' },
  '00956': { terPct: 0.66, nhiPct: 0.00, stampTaxPct: 0.10, totalFrictionPct: 0.66, costPerMillion: 6600, fricScore: 84.0, taxNote: '日經高股息，海外所得 76 完全免二代健保' },

  // 公債 / 債券 (9)
  '00679B': { terPct: 0.14, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.14, costPerMillion: 1400, fricScore: 98.0, taxNote: '美債20年，海外所得免健保，債券依法停徵證交稅' },
  '00687B': { terPct: 0.14, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.14, costPerMillion: 1400, fricScore: 98.0, taxNote: '20年美債，海外所得免健保，債券依法停徵證交稅' },
  '00710B': { terPct: 0.45, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.45, costPerMillion: 4500, fricScore: 91.0, taxNote: '非投等債，海外所得免健保，債券依法停徵證交稅' },
  '00720B': { terPct: 0.22, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.22, costPerMillion: 2200, fricScore: 96.0, taxNote: '投資級公司債，海外所得免健保，債券依法停徵證交稅' },
  '00751B': { terPct: 0.20, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.20, costPerMillion: 2000, fricScore: 97.0, taxNote: 'AAA至A公司債，海外所得免健保，債券依法停徵證交稅' },
  '00772B': { terPct: 0.22, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.22, costPerMillion: 2200, fricScore: 96.0, taxNote: '高評級公司債，海外所得免健保，債券依法停徵證交稅' },
  '00933B': { terPct: 0.24, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.24, costPerMillion: 2400, fricScore: 95.0, taxNote: '金融債，海外所得免健保，債券依法停徵證交稅' },
  '00937B': { terPct: 0.25, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.25, costPerMillion: 2500, fricScore: 95.0, taxNote: 'ESG投等債20+，海外所得免健保，債券依法停徵證交稅' },
  '00945B': { terPct: 0.48, nhiPct: 0.00, stampTaxPct: 0.00, totalFrictionPct: 0.48, costPerMillion: 4800, fricScore: 90.0, taxNote: '美國非投等債，海外所得免健保，債券依法停徵證交稅' },
};

export interface EtfConstituentRow {
  etfId: string;
  etfName: string;
  constituentTicker: string;
  constituentName: string;
  weightPct: number;
  shares: string;
  updateDate: string;
}

export interface EtfSummaryRow {
  etfId: string;
  etfName: string;
  currentPrice?: number;
  exchange: string;
  category: string;
  benchmark: string;
  constituentCount: number;
  top1Holding: string;
  top2Holding: string;
  top3Holding: string;
  weightedRoe: string;
  netScore: number;
  divScore: number;
  valScore: number;
  fricScore: number;
  lastModelUpdate: string;
  // 實質稅費明細
  terPct: number;
  nhiPct: number;
  stampTaxPct: number;
  totalFrictionPct: number;
  costPerMillion: number;
  taxNote: string;
}

export const ETF_PRICE_SNAPSHOTS: Record<string, number> = {
  '0050': 109.0,
  '0056': 58.75,
  '006208': 250.35,
  '00645': 57.8,
  '00646': 79.35,
  '00657': 78.1,
  '00661': 85.35,
  '00662': 124.95,
  '00679B': 25.74,
  '00687B': 26.75,
  '00692': 94.35,
  '00710B': 18.78,
  '00712': 7.18,
  '00713': 65.8,
  '00720B': 31.9,
  '00751B': 29.93,
  '00757': 146.3,
  '00772B': 32.37,
  '00830': 83.95,
  '00878': 35.53,
  '00881': 50.0,
  '00882': 15.21,
  '00915': 33.71,
  '00918': 34.53,
  '00919': 32.74,
  '00929': 29.84,
  '00933B': 15.48,
  '00937B': 14.15,
  '00939': 25.09,
  '00940': 13.48,
  '00945B': 14.48,
  '00949': 22.96,
  '00951': 16.73,
  '00954': 17.83,
  '00956': 13.79,
};

export async function fetchAllMarketConstituents(): Promise<EtfConstituentRow[]> {
  const res = await fetch(allMarketCsvUrl('ETF_Constituents'));
  if (!res.ok) throw new Error(`讀取全市場 ETF 成分股資料庫失敗 (${res.status})`);
  const rowsCsv = parseCsv(await res.text());
  const header = (rowsCsv[0] ?? []).map((h) => h.trim());
  const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
  return rowsCsv
    .slice(1)
    .map((r) => {
      const name = cleanHtmlEntities(col(r, 'etf_name'));
      const id = resolveEtfId(col(r, 'etf_id'), name);
      return { r, id, name };
    })
    .filter((item) => item.id)
    .map(({ r, id, name }) => ({
      etfId: id,
      etfName: name,
      constituentTicker: col(r, 'constituent_ticker'),
      constituentName: cleanHtmlEntities(col(r, 'constituent_name')),
      weightPct: Number(col(r, 'weight_pct')) || Number(col(r, 'weightPct')) || 0,
      shares: col(r, 'shares'),
      updateDate: col(r, 'update_date'),
    }));
}

export async function fetchAllMarketSummary(): Promise<EtfSummaryRow[]> {
  const res = await fetch(allMarketCsvUrl('ETF_Summary'));
  if (!res.ok) throw new Error(`讀取全市場 ETF 摘要失敗 (${res.status})`);
  const rowsCsv = parseCsv(await res.text());
  const header = (rowsCsv[0] ?? []).map((h) => h.trim());
  const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
  return rowsCsv
    .slice(1)
    .map((r) => {
      const name = cleanHtmlEntities(col(r, 'etf_name'));
      const id = resolveEtfId(col(r, 'etf_id'), name);
      return { r, id, name };
    })
    .filter((item) => item.id)
    .map(({ r, id, name }) => {
      const parsedPrice = Number(col(r, 'current_price')) || Number(col(r, 'currentPrice'));
      const fallbackPrice = ETF_PRICE_SNAPSHOTS[id];
      const taxMetrics = ETF_TAX_FEE_MAP[id] || {
        terPct: 0.50,
        nhiPct: 0.00,
        stampTaxPct: id.endsWith('B') ? 0.00 : 0.10,
        totalFrictionPct: 0.50,
        costPerMillion: 5000,
        fricScore: 85.0,
        taxNote: '標準標的稅費模型',
      };
      return {
        etfId: id,
        etfName: name,
        currentPrice: parsedPrice > 0 ? parsedPrice : fallbackPrice,
        exchange: col(r, 'exchange') || 'TWSE',
        category: col(r, 'category') || 'ETF',
        benchmark: cleanHtmlEntities(col(r, 'benchmark')),
        constituentCount: Number(col(r, 'constituent_count')) || 0,
        top1Holding: cleanHtmlEntities(col(r, 'top1_holding')),
        top2Holding: cleanHtmlEntities(col(r, 'top2_holding')),
        top3Holding: cleanHtmlEntities(col(r, 'top3_holding')),
        weightedRoe: col(r, 'weighted_roe') || '-',
        netScore: Number(col(r, 'net_score')) || 70,
        divScore: Number(col(r, 'div_score')) || 70,
        valScore: Number(col(r, 'val_score')) || 70,
        fricScore: taxMetrics.fricScore,
        lastModelUpdate: col(r, 'last_model_update') || '2026-10-18',
        terPct: taxMetrics.terPct,
        nhiPct: taxMetrics.nhiPct,
        stampTaxPct: taxMetrics.stampTaxPct,
        totalFrictionPct: taxMetrics.totalFrictionPct,
        costPerMillion: taxMetrics.costPerMillion,
        taxNote: taxMetrics.taxNote,
      };
    });
}


