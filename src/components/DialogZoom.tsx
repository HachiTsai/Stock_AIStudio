import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const MIN = 0.7;
const MAX = 1.6;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));

/** 彈窗縮放：+ - 按鈕與雙指捏合。panelProps 展開到彈窗面板，controls 放在遮罩內。 */
export function useDialogZoom() {
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const panelProps = {
    style: { zoom, touchAction: 'pan-x pan-y' } as React.CSSProperties,
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { d: dist(e.touches), z: zoom };
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) setZoom(clamp((pinch.current.z * dist(e.touches)) / pinch.current.d));
    },
    onTouchEnd: () => {
      pinch.current = null;
    },
  };

  const controls = (
    <div
      className="fixed bottom-4 right-4 z-[60] flex items-center space-x-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1 shadow-lg"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="視窗縮放"
    >
      <button
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
        onClick={() => setZoom((z) => clamp(z - 0.1))}
        disabled={zoom <= MIN}
        aria-label="縮小視窗"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        className="px-1 text-xs font-mono text-slate-300 min-w-[2.75rem] cursor-pointer"
        onClick={() => setZoom(1)}
        title="還原 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer"
        onClick={() => setZoom((z) => clamp(z + 0.1))}
        disabled={zoom >= MAX}
        aria-label="放大視窗"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );

  return { panelProps, controls };
}
