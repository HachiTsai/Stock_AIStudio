/**
 * 抓取 35 檔 ETF 的 1 年日線（含還原收盤價、成交量）、配息，以及集保每週受益人數，
 * 寫入 src/data/etfHistorySnapshot.json 與 src/data/etfHoldersHistory.json。
 *
 * 用法：npx tsx scripts/fetch-etf-data.ts
 *
 * - 價格/配息：Yahoo Finance chart API，先試 .TW 再試 .TWO。
 * - 受益人數：集保開放資料 1-5（持股分級 17 = 合計）。只提供最新一週，
 *   因此每次執行會把新的資料日期「追加」到 etfHoldersHistory.json 以累積趨勢。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ETF_NAME_TO_ID } from '../src/services/constituentsFeedService';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data');
const HISTORY_FILE = path.join(DATA_DIR, 'etfHistorySnapshot.json');
const HOLDERS_FILE = path.join(DATA_DIR, 'etfHoldersHistory.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ids = [...new Set(Object.values(ETF_NAME_TO_ID))].sort();
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
  if (Object.keys(etfs).length < ids.length) process.exitCode = 1;
}

main();
