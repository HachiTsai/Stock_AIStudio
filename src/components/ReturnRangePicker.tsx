import React from 'react';
import { RETURN_PRESETS } from '../utils/swingIndicators';

interface Props {
  days: number;
  onChange: (days: number) => void;
}

const MIN_DAYS = 7;
const MAX_DAYS = 365;

/** 階段性含息報酬率的區間選擇：常用區間按鈕，加上 7～365 天的自由拖拉。 */
export const ReturnRangePicker: React.FC<Props> = ({ days, onChange }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
    <span className="text-slate-400">含息報酬區間</span>
    <div className="flex flex-wrap gap-1" role="group" aria-label="含息報酬區間">
      {RETURN_PRESETS.map((p) => (
        <button
          key={p.days}
          type="button"
          aria-pressed={days === p.days}
          onClick={() => onChange(p.days)}
          className={`px-2.5 py-1 rounded border cursor-pointer ${
            days === p.days ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
    <label className="flex items-center gap-2 text-slate-300">
      <input
        type="range"
        min={MIN_DAYS}
        max={MAX_DAYS}
        value={days}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="自訂區間天數"
        className="w-40 accent-emerald-500"
      />
      <span className="tabular-nums w-14">近 {days} 天</span>
    </label>
  </div>
);
