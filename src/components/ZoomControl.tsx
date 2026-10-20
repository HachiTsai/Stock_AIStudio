import React, { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { ZOOM_STEPS, applyZoom, loadZoom } from '../utils/uiZoom';

export const ZoomControl: React.FC = () => {
  const [pct, setPct] = useState<number>(loadZoom);

  useEffect(() => {
    applyZoom(pct);
  }, [pct]);

  const idx = ZOOM_STEPS.indexOf(pct as (typeof ZOOM_STEPS)[number]);
  const step = (d: number) => setPct(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + d))]);

  const btn =
    'p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer';
  return (
    <div className="flex items-center space-x-1" role="group" aria-label="畫面縮放">
      <button className={btn} onClick={() => step(-1)} disabled={idx <= 0} title="縮小" aria-label="縮小">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        className="px-1.5 text-xs font-mono text-slate-300 hover:text-white cursor-pointer min-w-[3rem]"
        onClick={() => setPct(100)}
        title="還原 100%"
      >
        {pct}%
      </button>
      <button className={btn} onClick={() => step(1)} disabled={idx >= ZOOM_STEPS.length - 1} title="放大" aria-label="放大">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
};
