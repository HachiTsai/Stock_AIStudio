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

export function normalizeEtfId(id: string): string {
  const clean = id.trim();
  if (/^\d+$/.test(clean)) {
    return clean.padStart(clean.length <= 4 ? 4 : 5, '0');
  }
  if (/^\d+B$/i.test(clean)) {
    const num = clean.slice(0, -1);
    return `${num.padStart(5, '0')}B`;
  }
  return clean;
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
      etfName: col(r, 'etf_name'),
      constituentTicker: col(r, 'constituent_ticker'),
      constituentName: col(r, 'constituent_name'),
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
    .map((r) => ({
      etfId: normalizeEtfId(col(r, 'etf_id')),
      etfName: col(r, 'etf_name'),
      exchange: col(r, 'exchange'),
      category: col(r, 'category'),
      benchmark: col(r, 'benchmark'),
      constituentCount: Number(col(r, 'constituent_count')) || 0,
      top1Holding: col(r, 'top1_holding'),
      top2Holding: col(r, 'top2_holding'),
      top3Holding: col(r, 'top3_holding'),
      weightedRoe: col(r, 'weighted_roe') || '-',
      netScore: Number(col(r, 'net_score')) || 0,
      divScore: Number(col(r, 'div_score')) || 0,
      valScore: Number(col(r, 'val_score')) || 0,
      fricScore: Number(col(r, 'fric_score')) || 0,
      lastModelUpdate: col(r, 'last_model_update'),
    }));
}


