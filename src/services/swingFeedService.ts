import { parseCsv } from './signalsFeedService';

// Drive: Project_財商工程 內的「波段觀察」試算表（知道連結者可檢視，免登入；不含持股數量）
// 由 Investment_Tracker 端 price-dividend-fetcher 的 swing.py --scan 產出；APP 只讀不寫。
export const SWING_SHEET_ID = '1pyGzkgaspYMYdXOPYerkLsxOMwNwa2yOKuNDrOrrhtQ';

const csvUrl = `https://docs.google.com/spreadsheets/d/${SWING_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

export interface SwingRow {
  ticker: string;
  name: string;
  market: string;
  source: string;
  label: string;
  close: number | null;
  rsi14: number | null;
  sma20: number | null;
  pos52wPct: number | null;
  fibLabel: string;
  stopPrice: number | null;
  stopDistancePct: number | null;
  reason: string;
  updatedAt: string;
}

export interface SwingFeed {
  rows: SwingRow[];
  updatedAt: string;
}

const num = (s: string): number | null => {
  const v = Number(s);
  return s.trim() !== '' && Number.isFinite(v) ? v : null;
};

export async function fetchSwingFeed(): Promise<SwingFeed> {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`讀取波段觀察失敗 (${res.status})`);
  const csv = parseCsv(await res.text());
  const header = (csv[0] ?? []).map((h) => h.trim());
  const col = (r: string[], k: string) => (r[header.indexOf(k)] ?? '').trim();
  const rows = csv
    .slice(1)
    .filter((r) => col(r, '代號'))
    .map((r) => ({
      ticker: col(r, '代號'),
      name: col(r, '名稱'),
      market: col(r, '市場'),
      source: col(r, '來源'),
      label: col(r, '狀態'),
      close: num(col(r, '收盤')),
      rsi14: num(col(r, 'RSI14')),
      sma20: num(col(r, '20日線')),
      pos52wPct: num(col(r, '52週位置%')),
      fibLabel: col(r, '費波那契位置30日'),
      stopPrice: num(col(r, '2xATR停損價')),
      stopDistancePct: num(col(r, '停損距離%')),
      reason: col(r, '判定依據'),
      updatedAt: col(r, '更新日'),
    }));
  return { rows, updatedAt: rows[0]?.updatedAt ?? '' };
}

/** 狀態排序：需要留意的在前 */
export const SWING_STATE_ORDER = ['過熱', '偏空迴避', '超跌觀察', '趨勢偏多', '無訊號'];
export const swingRank = (label: string): number => {
  const i = SWING_STATE_ORDER.findIndex((s) => label.includes(s));
  return i < 0 ? SWING_STATE_ORDER.length : i;
};
