/**
 * 抓取台股 ETF（上限 MAX_ETFS 檔）的 1 年日線（含還原收盤價、成交量）、配息，以及集保每週受益人數，
 * 寫入 src/data/etfHistorySnapshot.json 與 src/data/etfHoldersHistory.json。
 *
 * 用法：npx tsx scripts/fetch-etf-data.ts
 *
 * - 價格/配息：Yahoo Finance chart API，先試 .TW 再試 .TWO。
 * - 受益人數：集保開放資料 1-5（持股分級 17 = 合計）。只提供最新一週，
 *   因此每次執行會把新的資料日期「追加」到 etfHoldersHistory.json 以累積趨勢。
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ETF_NAME_TO_ID } from '../src/services/constituentsFeedService';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data');
const HISTORY_FILE = path.join(DATA_DIR, 'etfHistorySnapshot.json');
const HOLDERS_FILE = path.join(DATA_DIR, 'etfHoldersHistory.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 報價來源查不到資料的代號（疑似已下市或槓桿／期貨型），不納入抓取清單。
const EXCLUDED_IDS = new Set(['0054', '0058', '0059', '0060', '00649', '00658L', '00659R']);
const BASE_IDS = [...new Set(Object.values(ETF_NAME_TO_ID))].filter((id) => !EXCLUDED_IDS.has(id)).sort();
const MAX_ETFS = 100;
// 台股代號（含債券 B、主動式 A 後綴）；排除日本、美國本地代號
const TW_CODE = /^\d{4,6}[A-Z]?$/;

const parseJsonLoose = (raw: string) => {
  // Secret 可能被貼成 `NAME={...}` 或帶引號，只取第一個 {...}
  const obj = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  return JSON.parse(obj || '{}');
};

/** 用服務帳號金鑰（GCP_SA_KEY）換 Sheets 唯讀存取權杖；只用 node:crypto，不加相依套件。 */
async function serviceAccountToken(): Promise<string> {
  const key = parseJsonLoose(process.env.GCP_SA_KEY ?? '');
  if (!key.client_email || !key.private_key) throw new Error('GCP_SA_KEY 未設定或格式錯誤');
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!r.ok) throw new Error(`取得權杖失敗 HTTP ${r.status}`);
  return (await r.json()).access_token;
}

/** 基本清單優先，再從全市場 ETF Sheet 的 ETF_Summary 依序補到 MAX_ETFS 檔；讀不到 Sheet 時只用基本清單。 */
async function resolveIds(): Promise<string[]> {
  try {
    const sheetId = parseJsonLoose(process.env.DRIVE_IDS ?? '').MARKET_ETF_SHEET_ID;
    if (!sheetId) throw new Error('DRIVE_IDS 未設定 MARKET_ETF_SHEET_ID');
    const token = await serviceAccountToken();
    const r = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ETF_Summary!A2:A?majorDimension=COLUMNS`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!r.ok) {
      const detail = (await r.json().catch(() => null))?.error;
      throw new Error(`Sheets API HTTP ${r.status} ${detail?.status ?? ''} ${detail?.message ?? ''}`.trim());
    }
    const col: string[] = (await r.json()).values?.[0] ?? [];
    const extra = col.map((id) => String(id).trim()).filter((id) => TW_CODE.test(id) && !EXCLUDED_IDS.has(id) && !BASE_IDS.includes(id));
    return [...BASE_IDS, ...new Set(extra)].slice(0, MAX_ETFS);
  } catch (e) {
    console.log(`讀不到全市場 ETF 清單，只抓基本清單：${e instanceof Error ? e.message : e}`);
    return BASE_IDS;
  }
}
let ids: string[] = BASE_IDS;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round = (n: number, d = 4) => Number(n.toFixed(d));

interface EtfHistory {
  symbol: string;
  dates: string[];
  close: number[];
  adjClose: number[];
  volume: number[];
  dividends: { date: string; amount: number }[];
}

const toDate = (ts: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ts * 1000));

async function fetchHistory(id: string): Promise<EtfHistory | null> {
  for (const suffix of ['.TW', '.TWO']) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${id}${suffix}?range=1y&interval=1d&events=div`,
          { headers: { 'User-Agent': UA, Accept: 'application/json' } }
        );
        if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
        if (!r.ok) break;
        const res = (await r.json())?.chart?.result?.[0];
        const ts: number[] | undefined = res?.timestamp;
        const closes: (number | null)[] | undefined = res?.indicators?.quote?.[0]?.close;
        const adj: (number | null)[] | undefined = res?.indicators?.adjclose?.[0]?.adjclose;
        const vols: (number | null)[] | undefined = res?.indicators?.quote?.[0]?.volume;
        if (!ts || !closes) break;
        const out: EtfHistory = { symbol: id + suffix, dates: [], close: [], adjClose: [], volume: [], dividends: [] };
        ts.forEach((t, i) => {
          const c = closes[i];
          if (c == null) return;
          out.dates.push(toDate(t));
          out.close.push(round(c));
          out.adjClose.push(round(adj?.[i] ?? c));
          out.volume.push(Math.round(vols?.[i] ?? 0));
        });
        for (const d of Object.values<any>(res?.events?.dividends ?? {})) {
          out.dividends.push({ date: toDate(d.date), amount: round(d.amount) });
        }
        out.dividends.sort((a, b) => a.date.localeCompare(b.date));
        return out.dates.length > 0 ? out : null;
      } catch {
        await sleep(1000);
      }
    }
  }
  return null;
}

async function fetchHolders(): Promise<{ date: string; holders: Record<string, number> } | null> {
  try {
    const r = await fetch('https://opendata.tdcc.com.tw/getOD.ashx?id=1-5');
    if (!r.ok) return null;
    const text = await r.text();
    const want = new Set(ids);
    const holders: Record<string, number> = {};
    let date = '';
    for (const line of text.split(/\r?\n/)) {
      const [d, code, level, people] = line.replace(/^\uFEFF/, '').split(',');
      if (!code || !want.has(code.trim()) || level?.trim() !== '17') continue;
      date = d.trim();
      holders[code.trim()] = Number(people);
    }
    return date ? { date, holders } : null;
  } catch {
    return null;
  }
}

async function main() {
  ids = await resolveIds();
  const prevHistory: Record<string, EtfHistory> = fs.existsSync(HISTORY_FILE)
    ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')).etfs ?? {}
    : {};
  const etfs: Record<string, EtfHistory> = {};
  const failed: string[] = [];
  for (const id of ids) {
    const h = await fetchHistory(id);
    if (h) etfs[id] = h;
    else if (prevHistory[id]) { etfs[id] = prevHistory[id]; failed.push(id + '(沿用舊資料)'); }
    else failed.push(id);
    process.stdout.write(h ? '.' : 'x');
    await sleep(400);
  }
  console.log();
  fs.writeFileSync(
    HISTORY_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), source: 'Yahoo Finance (adjclose 為還原價)', etfs })
  );

  const prevHolders: { date: string; holders: Record<string, number> }[] = fs.existsSync(HOLDERS_FILE)
    ? JSON.parse(fs.readFileSync(HOLDERS_FILE, 'utf8')).snapshots ?? []
    : [];
  const latest = await fetchHolders();
  if (latest && !prevHolders.some((s) => s.date === latest.date)) prevHolders.push(latest);
  prevHolders.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(
    HOLDERS_FILE,
    JSON.stringify({ source: '集保開放資料 1-5（持股分級 17 = 合計人數）', snapshots: prevHolders })
  );

  console.log(`價格：${Object.keys(etfs).length}/${ids.length} 檔；受益人數快照：${prevHolders.length} 週，最新 ${latest?.date ?? '取得失敗'}`);
  if (failed.length) console.log('失敗/沿用舊資料：', failed.join(', '));
  // 只有基本清單缺資料才算失敗；補進來的標的抓不到不擋流程
  if (BASE_IDS.some((id) => !etfs[id])) process.exitCode = 1;
}

main();
