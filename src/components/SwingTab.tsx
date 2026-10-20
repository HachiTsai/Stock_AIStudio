import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { StockChartModal } from './StockChartModal';
import { ReturnRangePicker } from './ReturnRangePicker';
import { periodReturn, type PriceSeries } from '../utils/swingIndicators';
import { fetchSwingFeed, swingRank, type SwingFeed } from '../services/swingFeedService';

const MARKETS = ['全部', '台股', '港股', '美股', '日股'];

const pillClass = (label: string): string => {
  if (label.includes('過熱')) return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
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
/** 來源欄含「ETF 卡片」為 ETF，其餘（個股卡片、成分股）為個股。 */
const kindOf = (source: string) => (source.includes('ETF 卡片') ? 'ETF' : '個股');

export const SwingTab: React.FC = () => {
  const [feed, setFeed] = useState<SwingFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<string>('全部');
  const [kind, setKind] = useState<string>('全部');
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

  const rows = useMemo(
    () =>
      (feed?.rows ?? [])
        .filter((r) => market === '全部' || r.market === market)
        .filter((r) => kindOf(r.source) === kind || kind === '全部')
        .sort((a, b) => swingRank(a.label) - swingRank(b.label)),
    [feed, market, kind],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => {
      c[r.label] = (c[r.label] ?? 0) + 1;
    });
    return c;
  }, [rows]);

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
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([label, n]) => (
              <span key={label} className={`px-3 py-1 rounded-lg border text-sm ${pillClass(label)}`}>
                {label} <b className="ml-1 tabular-nums">{n}</b>
              </span>
            ))}
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
                  <th className="text-right font-medium px-3 py-2">2×ATR 停損價</th>
                  <th className="text-right font-medium px-3 py-2">停損距離</th>
                  <th className="text-right font-medium px-3 py-2">近 {rangeDays} 天含息報酬</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
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
