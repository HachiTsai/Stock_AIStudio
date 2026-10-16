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
