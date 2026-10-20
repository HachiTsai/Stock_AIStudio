import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { bollinger, fibonacci, periodReturn, type Bar } from '../utils/swingIndicators';
import { ReturnRangePicker } from './ReturnRangePicker';
import { useDialogZoom } from './DialogZoom';

interface ChartData {
  ticker: string;
  symbol: string;
  currency: string;
  price: number;
  previousClose: number;
  quoteTime: number | null;
  bars: Bar[];
  source: string;
}

interface Props {
  ticker: string;
  name: string;
  rangeDays: number;
  onRangeChange: (days: number) => void;
  onClose: () => void;
}

const W = 760;
const H = 360;
const PAD = { l: 8, r: 64, t: 12, b: 22 };
const SHOW = 90; // 圖上顯示最近 90 根日線
const LOOKBACKS = [5, 10, 15, 30, 45, 60, 90, 120];

const fmtTime = (sec: number | null) =>
  sec
    ? new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(sec * 1000))
    : '-';

export const StockChartModal: React.FC<Props> = ({ ticker, name, rangeDays, onRangeChange, onClose }) => {
  const dz = useDialogZoom();
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookback, setLookback] = useState(60);
  const [showBoll, setShowBoll] = useState(true);
  const [showFib, setShowFib] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock-chart?ticker=${encodeURIComponent(ticker)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `錯誤 (${r.status})`);
        if (!cancelled) setData(j);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const calc = useMemo(() => {
    if (!data || data.bars.length < 25) return null;
    const bars = data.bars;
    const boll = bollinger(bars.map((b) => b.c));
    const fib = fibonacci(bars, lookback);
    const start = Math.max(0, bars.length - SHOW);
    const view = bars.slice(start);
    const bview = boll.slice(start);
    const prices = [
      ...view.flatMap((b) => [b.h, b.l]),
      ...(showBoll ? bview.flatMap((p) => (p ? [p.upper, p.lower] : [])) : []),
      ...(showFib && fib ? fib.levels.map((l) => l.price) : []),
      data.price,
    ];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;
    const y = (p: number) => PAD.t + ((max - p) / span) * (H - PAD.t - PAD.b);
    const step = (W - PAD.l - PAD.r) / view.length;
    const x = (i: number) => PAD.l + step * (i + 0.5);
    const last = bars.length - 1;
    return { bars, boll, fib, view, bview, y, x, step, min, max, lastBoll: boll[last], start };
  }, [data, lookback, showBoll, showFib]);

  const line = (pick: (p: NonNullable<ReturnType<typeof bollinger>[number]>) => number) => {
    if (!calc) return '';
    return calc.bview
      .map((p, i) => (p ? `${i === 0 || !calc.bview[i - 1] ? 'M' : 'L'}${calc.x(i).toFixed(1)},${calc.y(pick(p)).toFixed(1)}` : ''))
      .join('');
  };

  const ret = useMemo(
    () => (data ? periodReturn({ t: data.bars.map((b) => b.t), c: data.bars.map((b) => b.c), a: data.bars.map((b) => b.a) }, rangeDays) : null),
    [data, rangeDays],
  );

  const change = data ? data.price - data.previousClose : 0;
  const changePct = data && data.previousClose > 0 ? (change / data.previousClose) * 100 : 0;
  const up = change >= 0;
  const bandPos =
    calc?.lastBoll && data
      ? ((data.price - calc.lastBoll.lower) / (calc.lastBoll.upper - calc.lastBoll.lower)) * 100
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} 技術圖表`}
    >
      {dz.controls}
      <div
        {...dz.panelProps}
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{name}</h3>
            <div className="text-xs text-slate-500 font-mono">{ticker}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        {!data && !error && <div className="mt-4 text-sm text-slate-400">讀取即時報價與日線中…</div>}

        {data && (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-3xl font-bold tabular-nums text-slate-100">{data.price.toFixed(2)}</span>
              <span className={`text-sm tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {up ? '+' : ''}
                {change.toFixed(2)}（{up ? '+' : ''}
                {changePct.toFixed(2)}%）
              </span>
              <span className="text-xs text-slate-500">
                {data.currency} · 報價時間 {fmtTime(data.quoteTime)}（台北）· {data.source}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <ReturnRangePicker days={rangeDays} onChange={onRangeChange} />
              <div className="mt-2 text-sm tabular-nums">
                {ret ? (
                  <>
                    <span className="text-slate-400">近 {rangeDays} 天含息報酬 </span>
                    <b className={ret.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {ret.total >= 0 ? '+' : ''}
                      {ret.total.toFixed(2)}%
                    </b>
                    <span className="text-slate-400">
                      {' '}
                      ＝ 價差 {ret.price >= 0 ? '+' : ''}
                      {ret.price.toFixed(2)}% ＋ 配息 {ret.dividendEffect >= 0 ? '+' : ''}
                      {ret.dividendEffect.toFixed(2)} 個百分點（自 {new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(ret.fromTime * 1000))} 起）
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">日線未涵蓋近 {rangeDays} 天，無法計算。</span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={showBoll} onChange={(e) => setShowBoll(e.target.checked)} /> 布林通道（20, 2）
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" checked={showFib} onChange={(e) => setShowFib(e.target.checked)} /> 費波那契回檔
              </label>
              {showFib && (
                <span className="flex flex-wrap items-center gap-1 ml-1">
                  <span className="text-slate-500">取近</span>
                  {LOOKBACKS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={lookback === n}
                      onClick={() => setLookback(n)}
                      className={`px-2 py-0.5 rounded border cursor-pointer ${
                        lookback === n ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {n} 日
                    </button>
                  ))}
                </span>
              )}
            </div>

            {!calc && <div className="mt-4 text-sm text-slate-400">日線不足 25 根，無法計算指標。</div>}
            {calc && (
              <>
                <div className="mt-2 overflow-x-auto">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px] h-auto" role="img" aria-label="日線、布林通道與費波那契回檔">
                    {showFib &&
                      calc.fib?.levels.map((l) => (
                        <g key={l.ratio}>
                          <line x1={PAD.l} x2={W - PAD.r} y1={calc.y(l.price)} y2={calc.y(l.price)} stroke="#a78bfa" strokeOpacity="0.45" strokeDasharray="4 3" />
                          <text x={W - PAD.r + 4} y={calc.y(l.price) + 3} fontSize="10" fill="#c4b5fd">
                            {(l.ratio * 100).toFixed(1)}% {l.price.toFixed(2)}
                          </text>
                        </g>
                      ))}
                    {showBoll && (
                      <>
                        <path d={line((p) => p.upper)} fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                        <path d={line((p) => p.lower)} fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                        <path d={line((p) => p.mid)} fill="none" stroke="#f59e0b" strokeWidth="1.2" />
                      </>
                    )}
                    {calc.view.map((b, i) => {
                      const col = b.c >= b.o ? '#34d399' : '#fb7185';
                      const bw = Math.max(1.5, calc.step * 0.6);
                      return (
                        <g key={b.t}>
                          <line x1={calc.x(i)} x2={calc.x(i)} y1={calc.y(b.h)} y2={calc.y(b.l)} stroke={col} />
                          <rect x={calc.x(i) - bw / 2} y={calc.y(Math.max(b.o, b.c))} width={bw} height={Math.max(1, Math.abs(calc.y(b.o) - calc.y(b.c)))} fill={col} />
                        </g>
                      );
                    })}
                    <line x1={PAD.l} x2={W - PAD.r} y1={calc.y(data.price)} y2={calc.y(data.price)} stroke="#e2e8f0" strokeWidth="0.8" />
                    <rect x={PAD.l} y={calc.y(data.price) - 15} width="46" height="14" rx="3" fill="#e2e8f0" />
                    <text x={PAD.l + 4} y={calc.y(data.price) - 4.5} fontSize="11" fontWeight="700" fill="#0f172a">
                      {data.price.toFixed(2)}
                    </text>
                  </svg>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  <span><i className="inline-block w-3 h-0.5 bg-sky-400 align-middle" /> 上下軌</span>
                  <span><i className="inline-block w-3 h-0.5 bg-amber-400 align-middle" /> 20 日均線</span>
                  <span><i className="inline-block w-3 h-0.5 bg-violet-400 align-middle" /> 費波那契</span>
                  <span>日 K 最近 {calc.view.length} 根，盤中時最後一根尚未收完</span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  {showBoll && calc.lastBoll && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-xs text-slate-400 mb-1">布林通道（以最後一根日線計算）</div>
                      <div className="tabular-nums text-slate-300">
                        上軌 {calc.lastBoll.upper.toFixed(2)} · 中線 {calc.lastBoll.mid.toFixed(2)} · 下軌 {calc.lastBoll.lower.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        即時價位於通道 {bandPos?.toFixed(0)}%（0% 為下軌，100% 為上軌）；頻寬{' '}
                        {(((calc.lastBoll.upper - calc.lastBoll.lower) / calc.lastBoll.mid) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {showFib && calc.fib && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="text-xs text-slate-400 mb-1">
                        費波那契（近 {lookback} 日，{calc.fib.direction === 'up' ? '先低後高，自高點量回檔' : '先高後低，自低點量反彈'}）
                      </div>
                      <div className="tabular-nums text-slate-300">
                        高 {calc.fib.high.toFixed(2)} · 低 {calc.fib.low.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {(() => {
                          const lv = [...calc.fib.levels].sort((a, b) => a.price - b.price);
                          const below = [...lv].reverse().find((l) => l.price <= data.price);
                          const above = lv.find((l) => l.price > data.price);
                          return `即時價位於 ${below ? `${(below.ratio * 100).toFixed(1)}%（${below.price.toFixed(2)}）` : '最低檔之下'} 與 ${above ? `${(above.ratio * 100).toFixed(1)}%（${above.price.toFixed(2)}）` : '最高檔之上'} 之間`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  指標只描述價格相對位置，不是買賣指示。Yahoo 公開報價可能延遲數分鐘，實際成交請以券商報價為準。
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
