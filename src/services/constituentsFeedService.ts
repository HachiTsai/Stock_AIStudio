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

import priceHistory from '../data/etfHistorySnapshot.json';
import { ETF_FEES } from '../data/etfFees';

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

/** 二代健保補充保費費率 */
const NHI_RATE = 0.0211;
/** 00882 配息中屬大陸地區營利所得（需課二代健保）的比例；其餘海外所得免課 */
const ETF_00882_TAXABLE_RATIO = 0.3436;
/** 配息來自境內所得、需課二代健保的台股 ETF */
const DOMESTIC_NHI_ETFS = new Set([
  '0050', '0056', '006208', '00692', '00713', '00878', '00881',
  '00915', '00918', '00919', '00929', '00939', '00940',
]);

/** 近 12 個月配息殖利率（小數）；無快照時回傳 0 */
function trailingYield(id: string): number {
  const s = (priceHistory as unknown as {
    etfs: Record<string, { dates: string[]; close: number[]; dividends: { date: string; amount: number }[] }>;
  }).etfs[id];
  if (!s || s.close.length === 0) return 0;
  const asOf = new Date(s.dates[s.dates.length - 1]);
  asOf.setDate(asOf.getDate() - 365);
  const cutoff = asOf.toISOString().slice(0, 10);
  // Yahoo 偶爾重複回報相鄰兩天同金額配息，3 天內同金額視為重複
  const dedup = s.dividends.filter((d, i, arr) => {
    const p = arr[i - 1];
    if (!p || p.amount !== d.amount) return true;
    return (new Date(d.date).getTime() - new Date(p.date).getTime()) / 86_400_000 > 3;
  });
  const total = dedup.filter((d) => d.date > cutoff).reduce((a, d) => a + d.amount, 0);
  return total / s.close[s.close.length - 1];
}

function buildTaxFeeMetrics(id: string): EtfTaxFeeMetrics {
  const fee = ETF_FEES[id];
  const isBond = id.toUpperCase().endsWith('B');
  const terPct = fee ? fee.totalExpensePct : 0.5;
  const stampTaxPct = isBond ? 0.0 : 0.1;
  const yld = trailingYield(id);
  let nhiPct = 0;
  let taxNote: string;
  if (id === '00882') {
    nhiPct = yld * 100 * ETF_00882_TAXABLE_RATIO * NHI_RATE;
    taxNote = '★ 僅 34.36% 大陸營利所得課 2.11% 二代健保，65.64% 海外所得免課';
  } else if (DOMESTIC_NHI_ETFS.has(id)) {
    nhiPct = yld * 100 * NHI_RATE;
    taxNote = '境內所得配息課 2.11% 二代健保（以近 12 月配息殖利率估算），股票證交稅 0.1%';
  } else if (isBond) {
    taxNote = '海外所得免二代健保，債券依法停徵證交稅';
  } else {
    taxNote = '海外所得免二代健保，股票證交稅 0.1%';
  }
  if (fee?.note) taxNote += `；${fee.note}`;
  const totalFrictionPct = terPct + nhiPct;
  return {
    terPct: Number(terPct.toFixed(2)),
    nhiPct: Number(nhiPct.toFixed(3)),
    stampTaxPct,
    totalFrictionPct: Number(totalFrictionPct.toFixed(2)),
    costPerMillion: Math.round(totalFrictionPct * 10000),
    // 成本友善度：年損耗 0% = 100 分，每增加 1% 扣 20 分
    fricScore: Number(Math.min(100, Math.max(0, 100 - totalFrictionPct * 20)).toFixed(1)),
    taxNote,
  };
}

export const ETF_TAX_FEE_MAP: Record<string, EtfTaxFeeMetrics> = Object.fromEntries(
  [...new Set(Object.values(ETF_NAME_TO_ID))].map((id) => [id, buildTaxFeeMetrics(id)])
);

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
  priceSource?: 'live' | 'snapshot';
  priceTime?: string;
  priceChangePct?: number;
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

import {
  ALL_MARKET_SUMMARY_FALLBACK,
  ALL_MARKET_CONSTITUENTS_FALLBACK,
} from '../data/allMarketEtfSnapshot';

export async function fetchAllMarketConstituents(): Promise<EtfConstituentRow[]> {
  try {
    const res = await fetch(allMarketCsvUrl('ETF_Constituents'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rowsCsv = parseCsv(await res.text());
    const header = (rowsCsv[0] ?? []).map((h) => h.trim());
    const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
    const rows = rowsCsv
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
    if (rows.length > 0) return rows;
    throw new Error('Empty constituents response');
  } catch (err) {
    console.warn('載入 Google Sheets ETF 成分股失敗，啟用本機備援快照:', err);
    return ALL_MARKET_CONSTITUENTS_FALLBACK.map((c: any) => ({
      etfId: normalizeEtfId(c.etf_id),
      etfName: cleanHtmlEntities(c.etf_name),
      constituentTicker: c.constituent_ticker,
      constituentName: cleanHtmlEntities(c.constituent_name),
      weightPct: Number(c.weight_pct) || 0,
      shares: c.shares || '',
      updateDate: c.update_date || '2026-10-18',
    }));
  }
}

export async function fetchAllMarketSummary(): Promise<EtfSummaryRow[]> {
  try {
    const res = await fetch(allMarketCsvUrl('ETF_Summary'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rowsCsv = parseCsv(await res.text());
    const header = (rowsCsv[0] ?? []).map((h) => h.trim());
    const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
    const rows = rowsCsv
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
    if (rows.length > 0) return rows;
    throw new Error('Empty summary response');
  } catch (err) {
    console.warn('載入 Google Sheets ETF 摘要失敗，啟用本機備援快照:', err);
    return ALL_MARKET_SUMMARY_FALLBACK.map((s: any) => {
      const id = normalizeEtfId(s.etf_id);
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
        etfName: cleanHtmlEntities(s.etf_name),
        currentPrice: Number(s.current_price) || ETF_PRICE_SNAPSHOTS[id],
        exchange: s.exchange || 'TWSE',
        category: s.category || 'ETF',
        benchmark: cleanHtmlEntities(s.benchmark),
        constituentCount: Number(s.constituent_count) || 0,
        top1Holding: cleanHtmlEntities(s.top1_holding),
        top2Holding: cleanHtmlEntities(s.top2_holding),
        top3Holding: cleanHtmlEntities(s.top3_holding),
        weightedRoe: s.weighted_roe || '-',
        netScore: Number(s.net_score) || 70,
        divScore: Number(s.div_score) || 70,
        valScore: Number(s.val_score) || 70,
        fricScore: taxMetrics.fricScore,
        lastModelUpdate: s.last_model_update || '2026-10-18',
        terPct: taxMetrics.terPct,
        nhiPct: taxMetrics.nhiPct,
        stampTaxPct: taxMetrics.stampTaxPct,
        totalFrictionPct: taxMetrics.totalFrictionPct,
        costPerMillion: taxMetrics.costPerMillion,
        taxNote: taxMetrics.taxNote,
      };
    });
  }
}


export interface LiveEtfQuote {
  id: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  time: string;
  symbol: string;
}

/**
 * 向本專案伺服器取得即時報價；伺服器不可用或失敗時回傳空物件，
 * 呼叫端應退回 Sheets / 本機快照價格。
 */
export async function fetchLiveEtfQuotes(ids: string[]): Promise<Record<string, LiveEtfQuote>> {
  if (ids.length === 0) return {};
  try {
    const res = await fetch(`/api/etf-quotes?tickers=${encodeURIComponent(ids.join(','))}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json?.quotes ?? {}) as Record<string, LiveEtfQuote>;
  } catch (err) {
    console.warn('即時報價載入失敗，沿用快照價格:', err);
    return {};
  }
}
