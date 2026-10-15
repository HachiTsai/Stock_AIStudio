import React, { useState } from 'react';
import { CloudDownload, FileText, RefreshCw } from 'lucide-react';
import { googleSignIn } from '../services/googleAuth';
import { fetchResearchFeed, ResearchFeed } from '../services/researchFeedService';

const TYPE_LABEL: Record<string, string> = {
  arch: '架構',
  research: '研究',
  trend: '趨勢',
  journal: '日誌',
};

export const ResearchFeedPanel: React.FC = () => {
  const [feed, setFeed] = useState<ResearchFeed | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      let data: ResearchFeed;
      try {
        data = await fetchResearchFeed();
      } catch (e: any) {
        if (e?.message !== 'NEEDS_AUTH' && e?.message !== 'AUTH_EXPIRED') throw e;
        await googleSignIn();
        data = await fetchResearchFeed();
      }
      setFeed(data);
      setSelectedPath((prev) => prev || data.notes[0]?.path || '');
    } catch (e: any) {
      setError(e?.message || '讀取失敗');
    } finally {
      setLoading(false);
    }
  };

  const selected = feed?.notes.find((n) => n.path === selectedPath);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">REPO 研究筆記（Drive 同步）</h2>
          <p className="text-xs text-slate-400 mt-1">
            來源：Drive Project_財商工程/app_feed/notes.json（Investment_Tracker 匯出，唯讀）
            {feed && ` ｜ commit ${feed.commit.slice(0, 7)}｜${feed.generated_at.slice(0, 10)}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          {feed ? '重新讀取' : '從 Drive 讀取'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {feed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ul className="space-y-2">
            {feed.notes.map((n) => (
              <li key={n.path}>
                <button
                  onClick={() => setSelectedPath(n.path)}
                  className={`w-full text-left px-3 py-2 rounded-xl border text-xs ${
                    n.path === selectedPath
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{n.title || n.path}</span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    {TYPE_LABEL[n.type || ''] || n.type} ｜ 更新 {n.updated || '—'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[600px] overflow-auto">
            {selected ? (
              <pre className="whitespace-pre-wrap break-words text-xs text-slate-200 font-sans leading-relaxed">
                {selected.markdown.trim()}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">請選擇筆記</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
