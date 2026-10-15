import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Calculator, 
  CheckCircle2, 
  TrendingUp, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Coins, 
  Percent, 
  Layers, 
  Sliders, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Holding, ArchNote } from '../types/portfolio';
import { 
  formatTWD, 
  formatShares, 
  simulateDividendGrowth, 
  estimateTimeToGoal 
} from '../utils/calculations';
import { Dynamic3DChart } from './Dynamic3DChart';
import { usePrivacy } from '../context/PrivacyContext';

interface TargetModelTabProps {
  holdings: Holding[];
  archNote: ArchNote;
  externalScenario?: { dividendPerShare: number; label: string } | null;
  onClearExternalScenario?: () => void;
}

export const TargetModelTab: React.FC<TargetModelTabProps> = ({
  holdings,
  archNote,
  externalScenario,
  onClearExternalScenario,
}) => {
  const { isPrivacyMaskActive, maskTWD, maskPct } = usePrivacy();
  const mainHolding = holdings[0] || null;

  // Actual base values from portfolio
  const actualShares = mainHolding ? mainHolding.shares : 300000;
  const actualPrice = mainHolding ? mainHolding.currentPrice : 14.84;
  const actualDivPerShare = mainHolding ? mainHolding.annualDividendPerShare : 1.00;

  // --- Dynamic Model State ---
  const [targetAnnualDividend, setTargetAnnualDividend] = useState<number>(500000);
  const [useActualShares, setUseActualShares] = useState<boolean>(true);
  const [customShares, setCustomShares] = useState<number>(actualShares);
  const [customDivPerShare, setCustomDivPerShare] = useState<number>(
    externalScenario ? externalScenario.dividendPerShare : actualDivPerShare
  );
  const [customPrice, setCustomPrice] = useState<number>(actualPrice);
  const [lumpSumTwd, setLumpSumTwd] = useState<number>(0);
  const [lumpSumMonth, setLumpSumMonth] = useState<number>(0);
  const [reinvestRatioPct, setReinvestRatioPct] = useState<number>(100);
  const [taxRatePct, setTaxRatePct] = useState<number>(0.72); // 0.72% observed effective NHI deduction
  const [divGrowthRatePct, setDivGrowthRatePct] = useState<number>(0);
  const [customYears, setCustomYears] = useState<number>(10);

  useEffect(() => {
    if (externalScenario) {
      setCustomDivPerShare(externalScenario.dividendPerShare);
    }
  }, [externalScenario]);

  useEffect(() => {
    setCustomPrice(actualPrice);
  }, [actualPrice]);

  // Active shares used in calculations
  const activeShares = useActualShares ? actualShares : customShares;

  // Dynamic calculations
  const dynamicYieldPct = customPrice > 0 ? (customDivPerShare / customPrice) * 100 : 0;
  const grossAnnualDividend = activeShares * customDivPerShare;
  const netAnnualDividend = grossAnnualDividend * (1 - taxRatePct / 100);
  const dynamicProgressPct = targetAnnualDividend > 0 ? (netAnnualDividend / targetAnnualDividend) * 100 : 0;
  const dynamicGap = Math.max(0, targetAnnualDividend - netAnnualDividend);
  
  // Required additional capital = Gap ÷ Yield
  const dynamicRequiredCapital = dynamicYieldPct > 0 ? (dynamicGap / (dynamicYieldPct / 100)) : 0;
  const lotsNeeded = customPrice > 0 ? Math.round(dynamicRequiredCapital / (customPrice * 1000)) : 0;

  // Estimated Time-to-Goal
  const timeToGoal = estimateTimeToGoal({
    initialShares: activeShares,
    currentPrice: customPrice,
    dividendPerShare: customDivPerShare,
    lumpSumTwd,
    lumpSumMonth,
    targetDividend: targetAnnualDividend,
    reinvestRatioPct,
    taxRatePct,
  });

  // Dynamic simulation projection
  const simulation = simulateDividendGrowth({
    initialShares: activeShares,
    currentPrice: customPrice,
    dividendPerShare: customDivPerShare,
    lumpSumTwd,
    lumpSumMonth,
    dividendGrowthRatePct: divGrowthRatePct,
    reinvestRatioPct,
    taxRatePct,
    targetDividend: targetAnnualDividend,
    years: customYears,
  });

  // Reset to SSOT actual defaults
  const handleResetToDefaults = () => {
    setTargetAnnualDividend(500000);
    setUseActualShares(true);
    setCustomShares(actualShares);
    setCustomDivPerShare(actualDivPerShare);
    setCustomPrice(actualPrice);
    setLumpSumTwd(0);
    setLumpSumMonth(0);
    setReinvestRatioPct(100);
    setTaxRatePct(0.72);
    setDivGrowthRatePct(0);
    setCustomYears(10);
    if (onClearExternalScenario) onClearExternalScenario();
  };

  // Target preset chips
  const targetPresets = [
    { label: '36 萬 (月領 3 萬)', val: 360000 },
    { label: '50 萬 (核心目標)', val: 500000 },
    { label: '60 萬 (月領 5 萬)', val: 600000 },
    { label: '80 萬 (自由里程碑)', val: 800000 },
    { label: '100 萬 (百萬股利)', val: 1000000 },
    { label: '120 萬 (月領 10 萬)', val: 1200000 },
  ];

  // Sensitivity scenarios
  const priceScenarios = [13.0, 14.0, 14.84, 15.5, 16.5];
  const divScenarios = [0.80, 0.90, 1.00, 1.10, 1.20];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Banner if loaded from Objective Intelligence Hub */}
      {externalScenario && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              已從【客觀趨勢情報中心】套用參數：<strong>{externalScenario.label}</strong>（預期每股年配息已設為{' '}
              <strong className="font-mono">{externalScenario.dividendPerShare.toFixed(2)} TWD</strong>，3D 曲面與達標年數已即時連動更新！）
            </span>
          </div>
          {onClearExternalScenario && (
            <button
              onClick={onClearExternalScenario}
              className="text-emerald-400 hover:text-emerald-200 ml-4 font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Top Banner & Reset */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>可調式動態試算模型 ｜ SSOT 股利目標模型</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">股利目標動態模擬與敏感度模型</h1>
            <p className="text-sm text-slate-400 mt-1">
              可任意微調目標、持股數、除息水準、股價與再投入比例，即時獲取達成率、資金缺口與達標時程。
            </p>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer self-start sm:self-auto"
            title="一鍵還原為 SSOT 原始真實設定 (50萬目標、300張、14.84現價)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>重設為現況基準</span>
          </button>
        </div>

        {/* Dynamic Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Column 1: Target Goal & Holding Shares */}
          <div className="space-y-5 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>目標每年股利實收</span>
                </label>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatTWD(targetAnnualDividend)} TWD
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="1500000"
                step="20000"
                value={targetAnnualDividend}
                onChange={(e) => setTargetAnnualDividend(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {targetPresets.map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setTargetAnnualDividend(p.val)}
                    className={`text-[11px] px-2 py-0.5 rounded transition cursor-pointer ${
                      targetAnnualDividend === p.val
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Holding Shares Control */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>持股股數 (張數)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUseActualShares(!useActualShares)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition cursor-pointer ${
                      useActualShares
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {useActualShares ? (isPrivacyMaskActive ? '鎖定現況 ••• 張' : '鎖定現況 300 張') : '自訂股數'}
                  </button>
                  <span className="font-mono text-sm font-bold text-slate-200">
                    {isPrivacyMaskActive ? '••• 張' : `${(activeShares / 1000).toFixed(0)} 張`}
                  </span>
                </div>
              </div>
              {!useActualShares && (
                <div className="space-y-1">
                  <input
                    type="range"
                    min="50000"
                    max="800000"
                    step="10000"
                    value={customShares}
                    onChange={(e) => setCustomShares(Number(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>50 張</span>
                    <span>300 張</span>
                    <span>800 張</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Dividend & Stock Price */}
          <div className="space-y-5 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            {/* Dividend per Share */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>預期每股年配息</span>
                </label>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {customDivPerShare.toFixed(2)} TWD / 股
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="2.00"
                step="0.05"
                value={customDivPerShare}
                onChange={(e) => setCustomDivPerShare(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0.50 (保守)</span>
                <span className="text-amber-400 font-semibold">1.00 (現行基準)</span>
                <span>2.00 (樂觀)</span>
              </div>
            </div>

            {/* Target Price */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  <span>現價 / 買進單價</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    殖利率 {dynamicYieldPct.toFixed(2)}%
                  </span>
                  <span className="font-mono text-sm font-bold text-teal-300">
                    {customPrice.toFixed(2)} TWD
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="11.00"
                max="20.00"
                step="0.10"
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>11.00</span>
                <span className="text-teal-400 font-semibold">14.84 (現行收盤)</span>
                <span>20.00</span>
              </div>
            </div>
          </div>

          {/* Column 3: Reinvestment & One-time Capital */}
          <div className="space-y-5 bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            {/* One-time extra capital */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span>一次性額外加碼</span>
                </label>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {formatTWD(lumpSumTwd)} TWD
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3000000"
                step="100000"
                value={lumpSumTwd}
                onChange={(e) => setLumpSumTwd(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0 (不加碼)</span>
                <span>150 萬</span>
                <span>300 萬</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">投入時點</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <input
                    type="number"
                    min={0}
                    max={119}
                    step={1}
                    value={lumpSumMonth}
                    onChange={(e) => setLumpSumMonth(Math.min(119, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
                    className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-right"
                  />
                  <span className="text-slate-400">個月後{lumpSumMonth === 0 ? '（現在）' : ''}</span>
                </div>
              </div>
            </div>

            {/* Reinvest Ratio & Tax Options */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">股息再投入比率</span>
                <span className="font-mono font-bold text-teal-300">{reinvestRatioPct}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '0% 領出', val: 0 },
                  { label: '50% 半再投', val: 50 },
                  { label: '100% 全再投', val: 100 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setReinvestRatioPct(item.val)}
                    className={`py-1 rounded text-xs transition cursor-pointer ${
                      reinvestRatioPct === item.val
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* NHI tax rate toggle */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                <span>二代健保扣繳估算：</span>
                <div className="flex gap-1">
                  {[
                    { label: '0%', val: 0 },
                    { label: '0.72% (7月實務)', val: 0.72 },
                    { label: '2.11% (最高)', val: 2.11 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      onClick={() => setTaxRatePct(t.val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                        taxRatePct === t.val
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800/60 text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Calculation Live Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic Annual Dividend */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>動態推估年股利實收</span>
            <span className="font-mono text-[11px] text-teal-400">
              配息 {customDivPerShare.toFixed(2)}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {maskTWD(netAnnualDividend)} <span className="text-xs text-slate-500 font-normal">TWD</span>
          </div>
          <div className="text-[11px] text-slate-400">
            總額 {maskTWD(grossAnnualDividend)}（扣健保 {maskTWD(grossAnnualDividend - netAnnualDividend)}）
          </div>
        </div>

        {/* Dynamic Progress % */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>目標達成率</span>
            <span className="font-mono text-[11px] text-emerald-400 font-bold">
              {dynamicProgressPct >= 100 ? '已達標！' : `差 ${maskPct(100 - dynamicProgressPct, false)}`}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1">
            {maskPct(dynamicProgressPct, false)}
            <span className="text-xs text-slate-500 font-normal">
              / {formatTWD(targetAnnualDividend)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(dynamicProgressPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Dynamic Gap & Required Capital */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>每年目標缺口 / 需補本金</span>
            <span className="font-mono text-[11px] text-amber-400">
              殖利率 {dynamicYieldPct.toFixed(2)}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {maskTWD(dynamicGap)} <span className="text-xs text-slate-500 font-normal">TWD/年</span>
          </div>
          <div className="text-[11px] text-slate-400">
            需加碼約 <strong className="text-slate-200 font-mono">{maskTWD(dynamicRequiredCapital)}</strong> TWD（約 {isPrivacyMaskActive ? '•••' : lotsNeeded} 張）
          </div>
        </div>

        {/* Estimated Time to Goal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>複利達標預估時間</span>
            <Clock className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-teal-300">
            {timeToGoal.reachable ? (
              timeToGoal.years === 0 && timeToGoal.months === 0 ? (
                '目前已達標！'
              ) : (
                `約 ${timeToGoal.years} 年 ${timeToGoal.months} 個月`
              )
            ) : (
              '> 30 年'
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {reinvestRatioPct > 0 ? `股息 ${reinvestRatioPct}% 再投` : '無再投入'} ＋ {lumpSumTwd > 0 ? `一次性加碼 ${formatTWD(lumpSumTwd)}（${lumpSumMonth === 0 ? '現在' : `${lumpSumMonth} 個月後`}）` : '無額外加碼'}
          </div>
        </div>
      </div>

      {/* 3D Dynamic Curve & Surface Visualizer */}
      <Dynamic3DChart
        targetAnnualDividend={targetAnnualDividend}
        currentShares={activeShares}
        currentPrice={customPrice}
        currentDivPerShare={customDivPerShare}
        lumpSumTwd={lumpSumTwd}
        lumpSumMonth={lumpSumMonth}
        reinvestRatioPct={reinvestRatioPct}
        taxRatePct={taxRatePct}
      />

      {/* Sensitivity Analysis Matrix (股價 vs 配息情境) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>股利敏感度情境分析矩陣（Sensitivity Matrix）</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              橫軸為每股年配息、縱軸為買進股價；點擊任一情境儲存格可即時套用模擬參數
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            持股基準：{isPrivacyMaskActive ? '•••' : (activeShares / 1000).toFixed(0)} 張 ｜ 目標：{formatTWD(targetAnnualDividend)} TWD
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-center text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 text-left">股價 \ 年配息</th>
                {divScenarios.map((div) => (
                  <th key={div} className="py-3 px-3">
                    <span className="text-amber-400 font-bold">{div.toFixed(2)} TWD</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      年推估 {maskTWD(activeShares * div)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {priceScenarios.map((price) => (
                <tr key={price} className="hover:bg-slate-800/30 transition font-mono">
                  <td className="py-3.5 px-3 text-left font-bold text-teal-300 bg-slate-950/40">
                    {price.toFixed(2)} TWD
                  </td>
                  {divScenarios.map((div) => {
                    const y = (div / price) * 100;
                    const annualNet = activeShares * div * (1 - taxRatePct / 100);
                    const gap = Math.max(0, targetAnnualDividend - annualNet);
                    const reqCap = y > 0 ? gap / (y / 100) : 0;
                    const lots = Math.round(reqCap / (price * 1000));
                    const isCurrent =
                      Math.abs(price - customPrice) < 0.15 &&
                      Math.abs(div - customDivPerShare) < 0.04;

                    return (
                      <td
                        key={div}
                        onClick={() => {
                          setCustomPrice(price);
                          setCustomDivPerShare(div);
                        }}
                        className={`py-2 px-2 transition cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-500/20 border-2 border-emerald-500 font-bold'
                            : 'hover:bg-slate-800/60'
                        }`}
                        title="點擊套用此情境"
                      >
                        <div className="font-bold text-slate-200">{y.toFixed(2)}%</div>
                        <div className="text-[10px] text-slate-400">
                          {gap === 0 ? (
                            <span className="text-emerald-400 font-bold">達標</span>
                          ) : (
                            isPrivacyMaskActive ? '缺 ••• 張' : `缺 ${lots} 張`
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic 10-Year Compounding Projection Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-400" />
              <span>動態逐年複利飛輪增長表</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              以當前設定（{lumpSumTwd > 0 ? `${lumpSumMonth === 0 ? '現在' : `${lumpSumMonth} 個月後`}一次性加碼 ${formatTWD(lumpSumTwd)} TWD` : '無額外加碼'} ＋ 股息 {reinvestRatioPct}% 再投入）推估之歷年複利軌跡
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">配息年成長率：</span>
            <select
              value={divGrowthRatePct}
              onChange={(e) => setDivGrowthRatePct(Number(e.target.value))}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200"
            >
              <option value="-5">-5% (保守衰退)</option>
              <option value="0">0% (持平)</option>
              <option value="3">+3% (抗通膨)</option>
              <option value="5">+5% (穩定成長)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">年度</th>
                <th className="py-3 px-4">年初張數</th>
                <th className="py-3 px-4">一次性加碼張數</th>
                <th className="py-3 px-4">股息再買回張數</th>
                <th className="py-3 px-4">年末總張數 (股數)</th>
                <th className="py-3 px-4">當年度實收股利</th>
                <th className="py-3 px-4">年末預估市值</th>
                <th className="py-3 px-4">目標達成狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {simulation.map((row) => (
                <tr
                  key={row.year}
                  className={`hover:bg-slate-800/40 transition font-mono ${
                    row.isGoalReached ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-200">第 {row.year} 年</td>
                  <td className="py-3 px-4">{isPrivacyMaskActive ? '••• 張' : `${(row.startShares / 1000).toFixed(1)} 張`}</td>
                  <td className="py-3 px-4 text-teal-400">
                    {isPrivacyMaskActive ? '+•• 張' : `+${(row.newSharesFromCash / 1000).toFixed(1)} 張`}
                  </td>
                  <td className="py-3 px-4 text-emerald-400">
                    {isPrivacyMaskActive ? '+•• 張' : `+${(row.newSharesFromReinvest / 1000).toFixed(1)} 張`}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-100">
                    {isPrivacyMaskActive ? '••• 張 (•••••• 股)' : `${(row.endShares / 1000).toFixed(1)} 張 (${row.endShares.toLocaleString()} 股)`}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400">
                    {maskTWD(row.annualDividend)} TWD
                  </td>
                  <td className="py-3 px-4">{maskTWD(row.endMarketValue)} TWD</td>
                  <td className="py-3 px-4">
                    {row.isGoalReached ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans text-[11px] font-bold border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>已達成 {formatTWD(targetAnnualDividend)}！</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans text-[11px]">
                        進度 {maskPct(row.progressPct, false)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules breakdown (1-9) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">財商工程架構原則（規則 1 ～ 9 條文對照）</h2>
            <p className="text-xs text-slate-400">
              動態模型的計算公式嚴格遵循 architecture/股利目標模型.md 所載之量化定義
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {archNote.rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-start space-x-3 hover:border-slate-700 transition"
            >
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{rule}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
