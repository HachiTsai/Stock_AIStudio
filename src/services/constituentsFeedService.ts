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
    .filter((r) => col(r, 'etf_id'))
    .map((r) => ({
      etfId: normalizeEtfId(col(r, 'etf_id')),
      etfName: cleanHtmlEntities(col(r, 'etf_name')),
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
    .filter((r) => col(r, 'etf_id'))
    .map((r) => {
      const id = normalizeEtfId(col(r, 'etf_id'));
      const parsedPrice = Number(col(r, 'current_price')) || Number(col(r, 'currentPrice'));
      const fallbackPrice = ETF_PRICE_SNAPSHOTS[id];
      return {
        etfId: id,
        etfName: cleanHtmlEntities(col(r, 'etf_name')),
        currentPrice: parsedPrice > 0 ? parsedPrice : fallbackPrice,
        exchange: col(r, 'exchange'),
        category: col(r, 'category'),
        benchmark: cleanHtmlEntities(col(r, 'benchmark')),
        constituentCount: Number(col(r, 'constituent_count')) || 0,
        top1Holding: cleanHtmlEntities(col(r, 'top1_holding')),
        top2Holding: cleanHtmlEntities(col(r, 'top2_holding')),
        top3Holding: cleanHtmlEntities(col(r, 'top3_holding')),
        weightedRoe: col(r, 'weighted_roe') || '-',
        netScore: Number(col(r, 'net_score')) || 0,
        divScore: Number(col(r, 'div_score')) || 0,
        valScore: Number(col(r, 'val_score')) || 0,
        fricScore: Number(col(r, 'fric_score')) || 0,
        lastModelUpdate: col(r, 'last_model_update'),
      };
    });
}


