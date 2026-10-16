import React, { useEffect, useState } from 'react';
import { fetchConstituentsFeed, ConstituentsFeed } from '../services/constituentsFeedService';

/** 00882 成分股股利表（讀 Drive 成分股股利資料庫資料夾的 Sheet） */
export const ConstituentsPanel: React.FC = () => {
  const [feed, setFeed] = useState<ConstituentsFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConstituentsFeed()
      .then((f) => !cancelled && setFeed(f))
      .catch((e) => !cancelled && setError(e?.message || '讀取成分股股利資料庫失敗'));
    return () => {
      cancelled = true;
    };
  }, []);

  const s = feed?.summary ?? {};
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-100">成分股股利表（自下而上）</h3>
        {feed && <span className="text-xs text-slate-400 font-mono">更新 {s.asOf}｜持股資料日 {s.holdingsAsOf}</span>}
      </div>
      {error && <p className="text-sm text-amber-400">{error}。請確認 Portfolio_00882 下的「成分股股利資料庫」資料夾為公開連結。</p>}
      {!feed && !error && <p className="text-sm text-slate-400">讀取中…</p>}
      {feed && (
        <>
          <p className="text-sm text-slate-300">
            每單位年配息能力（毛額推估）：<span className="font-mono text-emerald-400">{s.lfyUnitTwd}～{s.ttmUnitTwd}</span> TWD，
            {feed.rows.length} 檔成分股，已公告 2026 中期股息 {s.has26} 檔。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-2">代號</th>
                  <th className="p-2">名稱</th>
                  <th className="p-2 text-right">權重%</th>
                  <th className="p-2 text-right">股息TTM</th>
                  <th className="p-2 text-right">股息LFY</th>
                  <th className="p-2 text-right">變化%</th>
                  <th className="p-2 text-right">殖利率%</th>
                  <th className="p-2">2026 中期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 tabular-nums">
                {feed.rows.map((r) => (
                  <tr key={r.code}>
                    <td className="p-2 font-mono">{r.code}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right">{r.weightPct.toFixed(2)}</td>
                    <td className="p-2 text-right">{r.divTtmHkd.toFixed(3)}</td>
                    <td className="p-2 text-right">{r.divLfyHkd.toFixed(3)}</td>
                    <td className={`p-2 text-right ${r.chgPct < 0 ? 'text-rose-400' : r.chgPct > 0 ? 'text-emerald-400' : ''}`}>
                      {r.chgPct.toFixed(1)}
                    </td>
                    <td className="p-2 text-right">{r.yieldTtmPct.toFixed(2)}</td>
                    <td className="p-2">{r.interim2026}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">資料來源：富途牛牛（股息 TTM／LFY，港幣）、中信投信持股；每月底更新。</p>
        </>
      )}
    </div>
  );
};
