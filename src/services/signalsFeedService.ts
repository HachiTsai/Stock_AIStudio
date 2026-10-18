import { IntelligenceSignal, SignalDimension, SignalDirection, SignalSourceType } from '../types/portfolio';

// Drive: Project_財商工程/Portfolio_00882/情報與趨勢/情報資料庫（資料夾已設為知道連結者可檢視，免登入）
export const SIGNALS_SHEET_ID = '1BF2xvF0cmyODdN0nXR8QHbOTC3ikqswvSwBboY1cGQo';
export const SIGNALS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SIGNALS_SHEET_ID}/edit`;

const FEED_URL = `https://docs.google.com/spreadsheets/d/${SIGNALS_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;

const DIMENSIONS: SignalDimension[] = ['dividend_sustainability', 'valuation_margin', 'friction_fx'];
const DIRECTIONS: SignalDirection[] = ['bullish', 'neutral', 'bearish'];
const SOURCES: SignalSourceType[] = ['app_paste', 'url_fetch', 'drive_doc', 'drive_sheet', 'drive_slide', 'drive_md', 'local_md'];

/** RFC 4180 CSV parser（含引號內逗號與換行） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const splitList = (s: string, sep: string) =>
  s.split(sep).map((x) => x.trim()).filter(Boolean);

/** 試算表一列 → IntelligenceSignal；欄位不合法的列回傳 null */
export function rowToSignal(header: string[], row: string[]): IntelligenceSignal | null {
  const get = (name: string) => (row[header.indexOf(name)] ?? '').trim();
  const dimension = get('dimension') as SignalDimension;
  const direction = get('direction') as SignalDirection;
  if (!get('id') || !get('title') || !DIMENSIONS.includes(dimension) || !DIRECTIONS.includes(direction)) {
    return null;
  }
  const sourceType = (SOURCES.includes(get('sourceType') as SignalSourceType)
    ? get('sourceType')
    : 'drive_sheet') as SignalSourceType;
  const metrics = splitList(get('extractedMetrics'), '|').map((m) => {
    const idx = m.indexOf('=');
    return idx < 0 ? { label: m, value: '' } : { label: m.slice(0, idx).trim(), value: m.slice(idx + 1).trim() };
  });
  return {
    id: get('id'),
    date: get('date'),
    ticker: get('ticker') || '00882',
    title: get('title'),
    rawContent: get('rawContent'),
    sourceUrl: get('sourceUrl') || undefined,
    sourceType,
    dimension,
    direction,
    weight: Math.min(5, Math.max(1, Number(get('weight')) || 3)),
    hardFacts: splitList(get('hardFacts'), '|'),
    extractedMetrics: metrics,
    impliedDividendShift: Number(get('impliedDividendShift')) || 0,
    objectiveReasoning: get('objectiveReasoning'),
    tags: splitList(get('tags'), ','),
    extractionMethod: get('extractionMethod') === 'rule_engine' ? 'rule_engine' : 'ai_assisted',
    syncedToDrive: true,
  };
}

/** 免登入讀取 Drive 情報資料庫（僅 GET） */
export async function fetchSignalsFeed(): Promise<IntelligenceSignal[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`讀取情報資料庫失敗 (${res.status})`);
  const rows = parseCsv(await res.text());
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .map((r) => rowToSignal(header, r))
    .filter((s): s is IntelligenceSignal => s !== null);
}

export interface ScorePoint {
  date: string; // YYYY-MM-DD
  netScore: number; // 0 ~ 100，正向權重 ÷ (正向＋風險權重)
  bullWeight: number;
  bearWeight: number;
  divScore?: number;
  valScore?: number;
  fricScore?: number;
  signalCount?: number;
}

const HISTORY_URL = `https://docs.google.com/spreadsheets/d/${SIGNALS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('評分歷史')}`;

/** 免登入讀取「評分歷史」分頁（每個交易日一列，由風向日報寫入） */
export async function fetchScoreHistory(): Promise<ScorePoint[]> {
  const res = await fetch(HISTORY_URL);
  if (!res.ok) throw new Error(`讀取評分歷史失敗 (${res.status})`);
  const rows = parseCsv(await res.text());
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  return rows
    .slice(1)
    .map((r) => {
      const dScore = idx('divScore') >= 0 ? Number(r[idx('divScore')]) : undefined;
      const vScore = idx('valScore') >= 0 ? Number(r[idx('valScore')]) : undefined;
      const fScore = idx('fricScore') >= 0 ? Number(r[idx('fricScore')]) : undefined;
      const sCount = idx('signalCount') >= 0 ? Number(r[idx('signalCount')]) : undefined;
      return {
        date: (r[idx('date')] ?? '').trim(),
        netScore: Number(r[idx('netScore')]),
        bullWeight: Number(r[idx('bullWeight')]),
        bearWeight: Number(r[idx('bearWeight')]),
        divScore: Number.isFinite(dScore) ? dScore : undefined,
        valScore: Number.isFinite(vScore) ? vScore : undefined,
        fricScore: Number.isFinite(fScore) ? fScore : undefined,
        signalCount: Number.isFinite(sCount) ? sCount : undefined,
      };
    })
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.netScore))
    .sort((a, b) => a.date.localeCompare(b.date));
}

