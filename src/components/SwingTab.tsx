import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { StockChartModal } from './StockChartModal';
import { ReturnRangePicker } from './ReturnRangePicker';
import { periodReturn, type PriceSeries } from '../utils/swingIndicators';
import { fetchSwingFeed, swingRank, type SwingFeed } from '../services/swingFeedService';

const MARKETS = ['全部', '台股', '港股', '美股', '日股'];

const pillClass = (label: string): string => {
  if (label.includes('偏熱')) return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  if (label.includes('偏空')) return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
  if (label.includes('超跌')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  if (label.includes('趨勢')) return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
  return 'bg-slate-800 text-slate-400 border-slate-700';
};

interface LiveQuote {
  price: number;
  previousClose: number;
  changePct: number;
  quoteTime: number | null;
}

const LIVE_REFRESH_MS = 60_000;

const fmt = (v: number | null, d: number) => (v == null ? '-' : v.toFixed(d));

const KINDS = ['全部', '個股', 'ETF'] as const;
/** 來源欄含「ETF」（ETF 卡片、全市場 ETF）為 ETF，其餘（個股卡片、成分股）為個股。 */
const kindOf = (source: string) => (source.includes('ETF') ? 'ETF' : '個股');
/** 口袋名單 = 卡片與 00882 成分股；來源為「全市場 ETF」的是全市場補充。 */
const isPocket = (source: string) => !source.includes('全市場');
/** 與排程的關鍵組合一致（swing_levels.KEY_COMBOS）。 */
const KEY_COMBOS = ['三週期共振偏多', '三週期共振偏空', '長多短回檔', '長空短反彈'];

const FILTER_KEY = 'swing-filters-v1';
interface SavedFilters {
  states: string[];
  combos: string[];
  keyOnly: boolean;
  pocketOnly: boolean;
}
const loadFilters = (): SavedFilters => {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}');
    return {
      states: Array.isArray(raw.states) ? raw.states : [],
      combos: Array.isArray(raw.combos) ? raw.combos : [],
      keyOnly: !!raw.keyOnly,
      pocketOnly: !!raw.pocketOnly,
    };
  } catch {
    return { states: [], combos: [], keyOnly: false, pocketOnly: false };
  }
};

export const SwingTab: React.FC = () => {
  const [feed, setFeed] = useState<SwingFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<string>('全部');
  const [kind, setKind] = useState<string>('全部');
  const [saved] = useState(loadFilters);
  const [states, setStates] = useState<string[]>(saved.states);
  const [combos, setCombos] = useState<string[]>(saved.combos);
  const [keyOnly, setKeyOnly] = useState(saved.keyOnly);
  const [pocketOnly, setPocketOnly] = useState(saved.pocketOnly);
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ states, combos, keyOnly, pocketOnly }));
    } catch {
      // 無法存瀏覽器設定時，篩選只在這次有效
    }
  }, [states, combos, keyOnly, pocketOnly]);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const [live, setLive] = useState<Record<string, LiveQuote>>({});
  const [history, setHistory] = useState<Record<string, PriceSeries>>({});
  const [rangeDays, setRangeDays] = useState(91);
  const [chartRow, setChartRow] = useState<{ ticker: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSwingFeed()
      .then((f) => !cancelled && setFeed(f))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  // 即時價：載入後立刻抓一次，之後每分鐘更新；失敗就沿用 Sheet 的日線收盤。
  // 手動「更新報價」帶 fresh=1，略過後端 60 秒快取，立刻重抓全部標的。
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const tickerList = useMemo(() => (feed?.rows ?? []).map((r) => r.ticker).join(','), [feed]);

  const loadQuotes = useCallback(
    async (fresh: boolean) => {
      if (!tickerList) return;
      try {
        const r = await fetch(`/api/swing-quotes?tickers=${encodeURIComponent(tickerList)}${fresh ? '&fresh=1' : ''}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setLive(j.quotes ?? {});
        setRefreshError(false);
      } catch {
        setRefreshError(true);
      }
    },
    [tickerList],
  );

  useEffect(() => {
    if (!tickerList) return;
    loadQuotes(false);
    const id = setInterval(() => loadQuotes(false), LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [tickerList, loadQuotes]);

  // 階段性報酬用的 1 年日線（含還原收盤價）：區間切換在前端計算，每 5 分鐘與手動更新時重抓
  const loadHistory = useCallback(
    async (fresh: boolean) => {
      if (!tickerList) return;
      try {
        const r = await fetch(`/api/swing-history?tickers=${encodeURIComponent(tickerList)}${fresh ? '&fresh=1' : ''}`);
        if (!r.ok) return;
        const j = await r.json();
        setHistory(j.history ?? {});
      } catch {
        // 沿用上一次的日線
      }
    },
    [tickerList],
  );

  useEffect(() => {
    if (!tickerList) return;
    loadHistory(false);
    const id = setInterval(() => loadHistory(false), 5 * 60_000);
    return () => clearInterval(id);
  }, [tickerList, loadHistory]);

  const manualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadQuotes(true), loadHistory(true)]);
    setRefreshing(false);
  };

  const latestQuoteTime = useMemo(
    () => Math.max(0, ...Object.values(live).map((q) => q.quoteTime ?? 0)),
    [live],
  );

  // 先套用市場、類型、口袋名單、關鍵組合；狀態與組合的統計以此為底，點選後再細篩
  const baseRows = useMemo(
    () =>
      (feed?.rows ?? [])
        .filter((r) => market === '全部' || r.market === market)
        .filter((r) => kindOf(r.source) === kind || kind === '全部')
        .filter((r) => !pocketOnly || isPocket(r.source))
        .filter((r) => !keyOnly || KEY_COMBOS.includes(r.combo))
        .sort((a, b) => swingRank(a.label) - swingRank(b.label)),
    [feed, market, kind, pocketOnly, keyOnly],
  );

  const rows = useMemo(
    () =>
      baseRows
        .filter((r) => states.length === 0 || states.includes(r.label))
        .filter((r) => combos.length === 0 || combos.includes(r.combo)),
    [baseRows, states, combos],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    baseRows.filter((r) => combos.length === 0 || combos.includes(r.combo)).forEach((r) => {
      c[r.label] = (c[r.label] ?? 0) + 1;
    });
    return c;
  }, [baseRows, combos]);

  const comboCounts = useMemo(() => {
    const c: Record<string, number> = {};
    baseRows.filter((r) => states.length === 0 || states.includes(r.label)).forEach((r) => {
      if (r.combo) c[r.combo] = (c[r.combo] ?? 0) + 1;
    });
    return c;
  }, [baseRows, states]);

  const hasFilter = states.length > 0 || combos.length > 0 || keyOnly || pocketOnly;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100">波段觀察</h2>
        <p className="text-sm text-slate-400 mt-1">
          5 天到 4 週的日線指標狀態與停損距離。只描述指標條件，不是買賣指示；波段部位與股利再投入部位分開看。
          {feed?.updatedAt && <span className="ml-1">指標更新日 {feed.updatedAt}（日線）</span>}
          {latestQuoteTime > 0 && (
            <span className="ml-1">
              現價為 Yahoo 即時報價，每分鐘更新，最新報價{' '}
              {new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(latestQuoteTime * 1000))}
              （台北）
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="市場分類">
        {MARKETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMarket(m)}
            aria-pressed={market === m}
            className={`px-4 py-1.5 rounded-full border text-sm cursor-pointer transition ${
              market === m
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {m}
            {feed && (
              <span className="ml-1.5 text-xs opacity-80">
                {m === '全部' ? feed.rows.length : feed.rows.filter((r) => r.market === m).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="標的類型">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`px-4 py-1.5 rounded-full border text-sm cursor-pointer transition ${
              kind === k
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {k}
            {feed && (
              <span className="ml-1.5 text-xs opacity-80">
                {k === '全部' ? feed.rows.length : feed.rows.filter((r) => kindOf(r.source) === k).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={manualRefresh}
          disabled={refreshing || !tickerList}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-emerald-500/60 bg-emerald-600/20 text-emerald-200 text-sm cursor-pointer hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '更新中…' : '更新報價'}
        </button>
        {refreshError && <span className="text-xs text-rose-300">報價更新失敗，仍顯示上一次的數字</span>}
      </div>

      <ReturnRangePicker days={rangeDays} onChange={setRangeDays} />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}。請確認「波段觀察」試算表仍為知道連結者可檢視。
        </div>
      )}
      {!feed && !error && <div className="text-sm text-slate-400">讀取波段觀察中…</div>}

      {feed && (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="狀態篩選">
            <span className="text-xs text-slate-400">狀態</span>
            {Object.entries(counts).map(([label, n]) => (
              <button
                key={label}
                type="button"
                onClick={() => setStates(toggle(states, label))}
                aria-pressed={states.includes(label)}
                className={`px-3 py-1 rounded-lg border text-sm cursor-pointer transition ${pillClass(label)} ${
                  states.includes(label) ? 'ring-2 ring-white/70' : states.length > 0 ? 'opacity-50' : ''
                }`}
              >
                {label} <b className="ml-1 tabular-nums">{n}</b>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="三週期組合篩選">
            <span className="text-xs text-slate-400">三週期組合</span>
            {Object.entries(comboCounts)
              .sort((a, b) => Number(KEY_COMBOS.includes(b[0])) - Number(KEY_COMBOS.includes(a[0])) || b[1] - a[1])
              .map(([c, n]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCombos(toggle(combos, c))}
                  aria-pressed={combos.includes(c)}
                  className={`px-3 py-1 rounded-lg border text-sm cursor-pointer transition ${
                    combos.includes(c)
                      ? 'bg-violet-600 border-violet-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  } ${KEY_COMBOS.includes(c) ? 'font-semibold' : ''}`}
                >
                  {c} <b className="ml-1 tabular-nums">{n}</b>
                </button>
              ))}
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="其他篩選">
            <button
              type="button"
              onClick={() => setKeyOnly(!keyOnly)}
              aria-pressed={keyOnly}
              className={`px-3 py-1 rounded-lg border text-sm cursor-pointer transition ${
                keyOnly ? 'bg-violet-600 border-violet-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              只看關鍵組合（共振偏多、共振偏空、長多短回檔、長空短反彈）
            </button>
            <button
              type="button"
              onClick={() => setPocketOnly(!pocketOnly)}
              aria-pressed={pocketOnly}
              className={`px-3 py-1 rounded-lg border text-sm cursor-pointer transition ${
                pocketOnly ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              只看口袋名單
            </button>
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setStates([]);
                  setCombos([]);
                  setKeyOnly(false);
                  setPocketOnly(false);
                }}
                className="px-3 py-1 rounded-lg border border-slate-600 text-sm text-slate-300 cursor-pointer hover:bg-slate-800"
              >
                清除篩選
              </button>
            )}
            <span className="text-xs text-slate-500 tabular-nums">符合 {rows.length} 檔</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full min-w-[820px] text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-800">
                  <th className="text-left font-medium px-3 py-2">標的</th>
                  <th className="text-left font-medium px-3 py-2">狀態</th>
                  <th className="text-right font-medium px-3 py-2">現價</th>
                  <th className="text-right font-medium px-3 py-2">RSI14</th>
                  <th className="text-right font-medium px-3 py-2">20 日線</th>
                  <th className="text-right font-medium px-3 py-2">52 週位置</th>
                  <th className="text-right font-medium px-3 py-2" title="近 30 日高低點的費波那契回檔或反彈位置，只描述位置，不是買賣指示">費波那契位置（30 日）</th>
                  <th className="text-left font-medium px-3 py-2" title="長期看半年線與 120 日報酬，中期看 60 日線與 MACD，短期只標註 20 日線位置與短線過熱或超跌；只描述條件，不是買賣指示">長 / 中 / 短期</th>
                  <th className="text-left font-medium px-3 py-2" title="三個週期的方向組合；組合變成共振偏多、共振偏空、長多短回檔、長空短反彈時才提醒">三週期組合</th>
                  <th className="text-right font-medium px-3 py-2">2×ATR 停損價</th>
                  <th className="text-right font-medium px-3 py-2">停損距離</th>
                  <th className="text-right font-medium px-3 py-2">近 {rangeDays} 天含息報酬</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-3 py-6 text-center text-slate-500">
                      此市場目前沒有觀察標的。
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.ticker} className="border-b border-slate-800/70 last:border-0">
                    <td className="px-3 py-2 text-slate-100 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setChartRow({ ticker: r.ticker, name: r.name })}
                        title="看即時價、布林通道與費波那契"
                        className="text-left cursor-pointer hover:text-emerald-300 underline decoration-dotted underline-offset-4"
                      >
                        {r.name}
                      </button>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {r.ticker} · {r.market}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span title={r.reason} className={`px-2.5 py-0.5 rounded-full border text-xs ${pillClass(r.label)}`}>
                        {r.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {live[r.ticker] ? (
                        <>
                          {live[r.ticker].price.toFixed(2)}
                          <div className={`text-[11px] ${live[r.ticker].changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {live[r.ticker].changePct >= 0 ? '+' : ''}
                            {live[r.ticker].changePct.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <span title="尚未取得即時報價，顯示日線收盤">{fmt(r.close, 2)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{fmt(r.rsi14, 1)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{fmt(r.sma20, 2)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {r.pos52wPct == null ? '-' : `${r.pos52wPct.toFixed(0)}%`}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 whitespace-nowrap">{r.fibLabel || '-'}</td>
                    <td className="px-3 py-2 text-left text-slate-300 whitespace-nowrap">
                      {r.longLevel ? `長${r.longLevel} / 中${r.midLevel}` : '-'}
                      {r.shortTag && <div className="text-xs text-slate-500">{r.shortTag}</div>}
                    </td>
                    <td className="px-3 py-2 text-left text-slate-300 whitespace-nowrap">
                      {r.combo || '-'}
                      {r.fib3 && <div className="text-xs text-slate-500">{r.fib3}</div>}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{fmt(r.stopPrice, 2)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {(() => {
                        const px = live[r.ticker]?.price;
                        if (px != null && r.stopPrice != null) return `${(((r.stopPrice - px) / px) * 100).toFixed(1)}%`;
                        return r.stopDistancePct == null ? '-' : `-${r.stopDistancePct.toFixed(1)}%`;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(() => {
                        const pr = history[r.ticker] ? periodReturn(history[r.ticker], rangeDays) : null;
                        if (!pr) return <span className="text-slate-500" title="日線未涵蓋此區間或尚未載入">-</span>;
                        return (
                          <>
                            <span className={pr.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {pr.total >= 0 ? '+' : ''}
                              {pr.total.toFixed(2)}%
                            </span>
                            <div className="text-[11px] text-slate-500" title="不含息報酬與配息貢獻">
                              價 {pr.price >= 0 ? '+' : ''}
                              {pr.price.toFixed(2)}% · 息 {pr.dividendEffect >= 0 ? '+' : ''}
                              {pr.dividendEffect.toFixed(2)}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {chartRow && <StockChartModal ticker={chartRow.ticker} name={chartRow.name} rangeDays={rangeDays} onRangeChange={setRangeDays} onClose={() => setChartRow(null)} />}
    </div>
  );
};
