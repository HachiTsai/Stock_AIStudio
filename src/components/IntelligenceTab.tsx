import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  Zap,
  Globe,
  FileText,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  CloudUpload,
  BookOpen,
  Search,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ExternalLink,
  X,
  Check,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  FileCode,
} from 'lucide-react';
import {
  IntelligenceSignal,
  SignalDimension,
  SignalDirection,
  SignalSourceType,
  DriveFileSummary,
  ArchNote,
} from '../types/portfolio';
import {
  extractSignalByRules,
  synthesizeObjectiveTrends,
} from '../utils/intelligenceEngine';
import {
  listDriveResearchFiles,
  readDriveFileText,
  saveIntelligenceMarkdownToDrive,
  formatSignalAsNoteMarkdown,
  DEFAULT_SHARED_FOLDER_ID,
  DEFAULT_SHARED_FOLDER_URL,
  DEFAULT_SHARED_FOLDER_NAME,
} from '../services/driveIntelligenceService';
import { googleSignIn, getAccessToken } from '../services/googleAuth';

interface IntelligenceTabProps {
  signals: IntelligenceSignal[];
  baseDividendPerShare: number;
  onAddSignal: (signal: IntelligenceSignal) => void;
  onUpdateSignal: (signal: IntelligenceSignal) => void;
  onDeleteSignal: (id: string) => void;
  onApplyScenarioToModel: (dividendPerShare: number, label: string) => void;
  onSaveToNotesLibrary: (note: ArchNote) => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
  signals,
  baseDividendPerShare,
  onAddSignal,
  onUpdateSignal,
  onDeleteSignal,
  onApplyScenarioToModel,
  onSaveToNotesLibrary,
}) => {
  // Input mode: 'paste' vs 'drive' vs 'local_md'
  const [inputMode, setInputMode] = useState<'paste' | 'drive' | 'local_md'>('paste');
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState<SignalSourceType>('app_paste');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Draft signal after extraction (for preview & user tweak before saving)
  const [draftSignal, setDraftSignal] = useState<Omit<IntelligenceSignal, 'id'> | null>(null);

  // Google Drive file browser state (exclusively connected to designated Shared Folder)
  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [driveFormatFilter, setDriveFormatFilter] = useState<'all' | 'md' | 'doc' | 'sheet' | 'slide'>('all');
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [readingFileId, setReadingFileId] = useState<string | null>(null);

  // Filter state for signal list
  const [filterDimension, setFilterDimension] = useState<SignalDimension | 'all'>('all');
  const [filterDirection, setFilterDirection] = useState<SignalDirection | 'all'>('all');

  // Explicit User Confirmation Modal for saving to Google Drive (Mandatory per Workspace guidelines)
  const [driveConfirmModal, setDriveConfirmModal] = useState<{
    isOpen: boolean;
    fileName: string;
    folderId: string;
    folderName: string;
    folderUrl: string;
    markdownContent: string;
    targetSignal?: IntelligenceSignal;
    isSaving: boolean;
  }>({
    isOpen: false,
    fileName: '',
    folderId: DEFAULT_SHARED_FOLDER_ID,
    folderName: DEFAULT_SHARED_FOLDER_NAME,
    folderUrl: DEFAULT_SHARED_FOLDER_URL,
    markdownContent: '',
    isSaving: false,
  });

  // Compute live objective trend synthesis
  const synthesis = synthesizeObjectiveTrends(signals, baseDividendPerShare);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5500);
  };

  // 1. Fetch URL content via backend proxy
  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setIsFetchingUrl(true);
    try {
      const res = await fetch('/api/intelligence/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取網址失敗');
      setRawText(`【${data.title}】\n${data.text}`);
      setSourceType('url_fetch');
      showNotice('success', `已成功抓取網址內容（${data.title.slice(0, 24)}...），可進行規則或 AI 解析！`);
    } catch (err: any) {
      showNotice('error', err.message || '抓取網址失敗，請直接貼上文字內容');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // 2A. Mode 1: Deterministic Rule-Based Extraction (Zero AI API)
  const handleRuleExtract = () => {
    if (!rawText.trim()) {
      showNotice('error', '請先貼上文字內容、抓取網址或從 Google Drive 讀取檔案');
      return;
    }
    const extracted = extractSignalByRules(rawText, sourceUrl, sourceType, '00882');
    setDraftSignal(extracted);
    showNotice('success', '⚡ 已透過「純規則量化引擎（免 AI API）」完成硬數據與維度拆解！');
  };

  // 2B. Mode 2: Server-Side Gemini Flash AI Extraction
  const handleAIExtract = async () => {
    if (!rawText.trim()) {
      showNotice('error', '請先貼上文字內容、抓取網址或從 Google Drive 讀取檔案');
      return;
    }
    setIsExtractingAI(true);
    try {
      const res = await fetch('/api/intelligence/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          sourceUrl,
          ticker: '00882',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 萃取失敗');

      const validDim: SignalDimension =
        data.dimension === 'valuation_margin' || data.dimension === 'friction_fx'
          ? data.dimension
          : 'dividend_sustainability';

      const validDir: SignalDirection =
        data.direction === 'bullish' || data.direction === 'bearish' ? data.direction : 'neutral';

      setDraftSignal({
        date: new Date().toISOString().split('T')[0],
        ticker: data.ticker || '00882',
        title: data.title || '客觀情報摘要',
        rawContent: rawText,
        sourceUrl: sourceUrl || undefined,
        sourceType,
        dimension: validDim,
        direction: validDir,
        weight: Math.max(1, Math.min(5, Number(data.weight) || 3)),
        hardFacts: Array.isArray(data.hardFacts) && data.hardFacts.length > 0 ? data.hardFacts : [rawText.slice(0, 80)],
        extractedMetrics: Array.isArray(data.extractedMetrics) ? data.extractedMetrics : [],
        impliedDividendShift: Number(data.impliedDividendShift) || 0,
        objectiveReasoning: data.objectiveReasoning || '依客觀數據推導之現金流影響。',
        tags: Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['AI萃取情報'],
        extractionMethod: 'ai_assisted',
        syncedToDrive: false,
      });
      showNotice('success', '✨ 已透過「AI 智慧去情緒化引擎」完成客觀數據萃取！');
    } catch (err: any) {
      // Fallback to rule engine if AI fails
      const fallback = extractSignalByRules(rawText, sourceUrl, sourceType, '00882');
      setDraftSignal(fallback);
      showNotice('error', `AI 呼叫異常（${err.message}），已自動切換為「純規則量化引擎」完成解析！`);
    } finally {
      setIsExtractingAI(false);
    }
  };

  // 3. Google Drive File Listing & Reading (Docs / Sheets / Slides / Markdown) from designated Shared Folder
  const handleLoadDriveFiles = async (queryOverride?: string) => {
    setIsLoadingDriveFiles(true);
    const query = queryOverride !== undefined ? queryOverride : driveSearchQuery;
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) return;
      }
      const files = await listDriveResearchFiles(query, DEFAULT_SHARED_FOLDER_ID);
      setDriveFiles(files);
      if (files.length === 0) {
        showNotice('success', '已連線共用資料夾，目前尚無相符檔案。您可將分析筆記或報告存入此資料夾！');
      }
    } catch (err: any) {
      showNotice('error', err.message || '讀取 Google Drive 共用資料夾檔案失敗');
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleReadDriveFile = async (file: DriveFileSummary) => {
    setReadingFileId(file.id);
    try {
      const { text, sourceType: detectedType } = await readDriveFileText(file);
      setRawText(`【來源檔案：${file.name}】\n${text}`);
      setSourceUrl(file.webViewLink || '');
      setSourceType(detectedType);
      
      // Run deterministic rule extraction with enhanced Markdown/YAML/CLAUDE.md structure support
      const extracted = extractSignalByRules(
        text,
        file.webViewLink || '',
        detectedType,
        '00882'
      );
      setDraftSignal(extracted);
      showNotice('success', `✨ 已從共用資料夾載入「${file.name}」並完成結構化解析！請檢視下方預覽後點擊「確認加入情報天平」。`);
    } catch (err: any) {
      showNotice('error', err.message || '讀取檔案內容失敗');
    } finally {
      setReadingFileId(null);
    }
  };

  // Local .md file picker & parser
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(`【本機 .md 檔案：${file.name}】\n${text}`);
      setSourceUrl('');
      setSourceType('local_md');
      
      const extracted = extractSignalByRules(text, '', 'local_md', '00882');
      setDraftSignal(extracted);
      showNotice('success', `✨ 已成功讀取本機「${file.name}」並完成結構化解析！請檢視下方卡片後點擊「確認加入情報天平」。`);
    } catch (err: any) {
      showNotice('error', err.message || '讀取本機 .md 檔案失敗');
    }
  };

  // 4. Save Draft Signal to Local State (and optionally open Drive confirmation)
  const handleConfirmDraft = (alsoPromptDriveSave: boolean = false) => {
    if (!draftSignal) return;
    const newSignal: IntelligenceSignal = {
      ...draftSignal,
      id: `sig-${Date.now()}`,
    };
    onAddSignal(newSignal);
    setDraftSignal(null);
    setRawText('');
    setSourceUrl('');

    if (alsoPromptDriveSave) {
      openDriveSaveConfirmation(newSignal);
    } else {
      showNotice('success', `已將「${newSignal.title}」加入情報中心並更新客觀趨勢天平！`);
    }
  };

  // 5. Open Explicit Confirmation Modal before saving to Google Drive
  const openDriveSaveConfirmation = (signal: IntelligenceSignal) => {
    const safeTitle = signal.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 22);
    const fileName = `財商情報_${signal.date}_${signal.ticker}_${safeTitle}.md`;
    const markdownContent = formatSignalAsNoteMarkdown(signal);

    setDriveConfirmModal({
      isOpen: true,
      fileName,
      folderId: DEFAULT_SHARED_FOLDER_ID,
      folderName: DEFAULT_SHARED_FOLDER_NAME,
      folderUrl: DEFAULT_SHARED_FOLDER_URL,
      markdownContent,
      targetSignal: signal,
      isSaving: false,
    });
  };

  const executeSaveToDrive = async () => {
    setDriveConfirmModal((prev) => ({ ...prev, isSaving: true }));
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) {
          setDriveConfirmModal((prev) => ({ ...prev, isSaving: false }));
          return;
        }
      }

      const savedFile = await saveIntelligenceMarkdownToDrive({
        fileName: driveConfirmModal.fileName,
        markdownContent: driveConfirmModal.markdownContent,
        folderId: driveConfirmModal.folderId,
      });

      if (driveConfirmModal.targetSignal) {
        onUpdateSignal({
          ...driveConfirmModal.targetSignal,
          syncedToDrive: true,
          driveFileId: savedFile.id,
        });
      }

      setDriveConfirmModal((prev) => ({
        ...prev,
        isOpen: false,
        fileName: '',
        markdownContent: '',
        isSaving: false,
      }));
      showNotice('success', `☁️ 已成功將情報儲存至 Google Drive 共用資料夾：${savedFile.name}！`);
      // Auto refresh file list
      handleLoadDriveFiles();
    } catch (err: any) {
      setDriveConfirmModal((prev) => ({ ...prev, isSaving: false }));
      showNotice('error', err.message || '儲存至 Google Drive 失敗');
    }
  };

  // Convert Signal to Architecture/Research Note in local library
  const handleConvertSignalToNote = (signal: IntelligenceSignal) => {
    const newNote: ArchNote = {
      id: `note-sig-${Date.now()}`,
      type: 'trends',
      title: signal.title,
      domain: '股利',
      status: '生效',
      version: 1,
      created: signal.date,
      updated: signal.date,
      tags: signal.tags,
      tickers: [signal.ticker],
      sources: [signal.sourceUrl || signal.sourceType],
      summary: `${signal.objectiveReasoning}（對每股年配息邊際影響推估：${
        signal.impliedDividendShift >= 0 ? `+${signal.impliedDividendShift}` : signal.impliedDividendShift
      } TWD）`,
      rules: signal.hardFacts,
      reasons: {
        facts: signal.hardFacts,
        judgments: [signal.objectiveReasoning],
      },
      scopeAndExceptions: ['本筆記由客觀趨勢情報中心自動結構化歸檔產生。'],
      changelog: [
        {
          version: 1,
          date: signal.date,
          changes: '由情報中心萃取建檔',
          reason: '累積客觀數據趨勢',
        },
      ],
    };
    onSaveToNotesLibrary(newNote);
    showNotice('success', `📝 已將「${signal.title}」轉存至【財商架構筆記庫】！`);
  };

  const filteredSignals = signals.filter((s) => {
    if (filterDimension !== 'all' && s.dimension !== filterDimension) return false;
    if (filterDirection !== 'all' && s.direction !== filterDirection) return false;
    return true;
  });

  const getDimensionBadge = (dim: SignalDimension) => {
    if (dim === 'dividend_sustainability') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          ① 配息續航力
        </span>
      );
    }
    if (dim === 'valuation_margin') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30">
          ② 估值與安全邊際
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
        ③ 稅費與匯率摩擦
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-lg animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="ml-4 font-bold opacity-75 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Objective Trend Radar & 3D Model Bridge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span>雙模混合量化情報引擎（純規則統計 ＋ AI 輔助萃取 ⇄ Google Drive）</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">客觀趨勢歸納與正反證據天平</h1>
            <p className="text-sm text-slate-400 mt-1">
              自動剝離主觀市場情緒，從累積的 {synthesis.totalSignals} 筆硬數據中歸納配息動能，並連動 3D 股利模型。
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-right">
            <span className="text-[11px] text-slate-400 block">當前數據歸納客觀共識</span>
            <span className="text-sm font-bold text-emerald-400">{synthesis.consensusVerdict}</span>
          </div>
        </div>

        {/* Bull vs Bear Tug-of-War Balance */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-emerald-400">
                正向支撐證據（{synthesis.bullCount} 筆 / 權重 {synthesis.bullWeight}）
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              正反證據權重比 {synthesis.bullRatioPct.toFixed(0)}% : {synthesis.bearRatioPct.toFixed(0)}%
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-400">
                潛在壓抑風險（{synthesis.bearCount} 筆 / 權重 {synthesis.bearWeight}）
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            </div>
          </div>

          <div className="w-full h-3.5 bg-rose-500/30 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-l-full transition-all duration-500"
              style={{ width: `${synthesis.bullRatioPct}%` }}
            />
          </div>

          {/* 3 Core Dimension Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">① 配息續航力維度</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.dividend_sustainability.count} 筆成分股分紅與財報數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-emerald-400">
                  {synthesis.dimStats.dividend_sustainability.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">② 估值與安全邊際</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.valuation_margin.count} 筆殖利率與淨值位階數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-teal-300">
                  {synthesis.dimStats.valuation_margin.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200">③ 稅費與匯率摩擦</div>
                <div className="text-[11px] text-slate-400">
                  累積 {synthesis.dimStats.friction_fx.count} 筆二代健保與匯率折算數據
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-base font-bold text-amber-300">
                  {synthesis.dimStats.friction_fx.netScore}
                </span>
                <span className="text-[10px] text-slate-500 block">/ 100 分</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Scenario Bridge to 3D Dividend Target Model */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 border border-emerald-500/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>客觀數據推導之 00882 年配息壓力測試區間（一鍵套入 3D 股利模型）</span>
            </div>
            <p className="text-xs text-slate-400">
              根據上方正反硬數據之邊際影響權重自動計算，點擊任一情境即可直接跳轉至【股利目標模型】檢視 3D 曲面與達標年數：
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.conservative,
                  `保守壓力情境 (${synthesis.scenarios.conservative.toFixed(2)} TWD)`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔴 保守壓力：{synthesis.scenarios.conservative.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.consensus,
                  `客觀共識基準 (${synthesis.scenarios.consensus.toFixed(2)} TWD)`
                )
              }
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🟢 客觀共識：{synthesis.scenarios.consensus.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onApplyScenarioToModel(
                  synthesis.scenarios.optimistic,
                  `樂觀支撐情境 (${synthesis.scenarios.optimistic.toFixed(2)} TWD)`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-teal-950/40 text-teal-300 border border-teal-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔵 樂觀支撐：{synthesis.scenarios.optimistic.toFixed(2)} 元</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Dual-Mode Input & Google Drive Reader Workbench */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>新增情報與數據萃取工作台（APP 快貼 ⇄ Google Drive 雙向同步）</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              支援直接貼上文字/網址，或從 Google Drive 讀取 Doc / Sheet / Slide；提供「免 AI 純規則引擎」與「AI 智慧萃取」雙模式。
            </p>
          </div>

          {/* Input Source Switcher */}
          <div className="flex flex-wrap p-1 rounded-xl bg-slate-950 border border-slate-800 self-start gap-1">
            <button
              onClick={() => setInputMode('paste')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                inputMode === 'paste'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>在 APP 貼上文字 / 網址</span>
            </button>
            <button
              onClick={() => {
                setInputMode('drive');
                if (driveFiles.length === 0) handleLoadDriveFiles();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                inputMode === 'drive'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>從共用 Google Drive 讀取</span>
            </button>
            <button
              onClick={() => setInputMode('local_md')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                inputMode === 'local_md'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>讀取本機 .md 檔案</span>
            </button>
          </div>
        </div>

        {/* Mode 1: Paste Text or URL */}
        {inputMode === 'paste' && (
          <div className="space-y-4">
            {/* Optional URL bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="選填：貼上財經新聞、公告或研究報告網址 (URL)，可自動抓取內文..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isFetchingUrl || !sourceUrl.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer shrink-0"
              >
                {isFetchingUrl ? '抓取網址中...' : '抓取網址內文'}
              </button>
            </div>

            {/* Raw Textarea */}
            <div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="在此貼上任何新聞段落、法說會摘要、ETF 淨值/可分配收益數據、匯率變動或您的觀察筆記...&#10;例如：「00882 成分股中國神華公告最新年度派息率達 75%，EPS 年增 4.5%，目前 ETF 折價 0.25%」"
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dual-Mode Extraction Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>支援雙模解析：預設「純規則引擎」零 API 成本，長文可選用「AI 智慧萃取」</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRuleExtract}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ 純規則量化解析 (免 AI API)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={isExtractingAI}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 text-teal-400 ${isExtractingAI ? 'animate-spin' : ''}`} />
                  <span>{isExtractingAI ? 'AI 萃取中...' : '✨ AI 智慧去情緒化萃取'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Read Local .md File */}
        {inputMode === 'local_md' && (
          <div className="p-8 rounded-2xl bg-slate-950/70 border-2 border-dashed border-purple-500/40 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100">選擇本機 Markdown (.md) 分析筆記</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                支援讀取電腦中的 <code className="text-purple-300 font-mono font-semibold">.md</code> 格式檔案。系統將直接在瀏覽器內進行結構化解析，自動提煉硬數據、量化指標與股利邊際影響推估！
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <label className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>點擊選擇 .md 檔案</span>
                <input
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  onChange={handleLocalFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Mode 3: Google Drive Shared Folder File Picker Panel */}
        {inputMode === 'drive' && (
          <div className="space-y-4">
            {/* Designated Shared Folder Connection Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950/90 rounded-xl border border-teal-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span>已連線共用情報資料夾</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                      專屬資料夾鎖定
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>資料夾 ID:</span>
                    <code className="text-teal-300 font-mono">{DEFAULT_SHARED_FOLDER_ID}</code>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <a
                  href={DEFAULT_SHARED_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-medium transition flex items-center gap-1.5"
                >
                  <span>開啟 Drive 共用資料夾</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => handleLoadDriveFiles()}
                  disabled={isLoadingDriveFiles}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                  <span>{isLoadingDriveFiles ? '載入中...' : '重新整理'}</span>
                </button>
              </div>
            </div>

            {/* Format Filter Bar (Includes dedicated .md format filter) */}
            {(() => {
              const mdCount = driveFiles.filter(
                (f) =>
                  f.name.toLowerCase().endsWith('.md') ||
                  f.name.toLowerCase().endsWith('.markdown') ||
                  f.mimeType.includes('markdown')
              ).length;
              const docCount = driveFiles.filter((f) => f.mimeType.includes('document')).length;
              const sheetCount = driveFiles.filter((f) => f.mimeType.includes('spreadsheet')).length;
              const slideCount = driveFiles.filter((f) => f.mimeType.includes('presentation')).length;

              return (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px] mr-1">檔案格式：</span>
                    <button
                      type="button"
                      onClick={() => setDriveFormatFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        driveFormatFilter === 'all'
                          ? 'bg-slate-800 text-white font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      全部 ({driveFiles.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDriveFormatFilter('md')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                        driveFormatFilter === 'md'
                          ? 'bg-purple-600 text-white font-bold shadow-sm'
                          : 'text-purple-300/80 hover:text-purple-200'
                      }`}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>📝 Markdown (.md) ({mdCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDriveFormatFilter('doc')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        driveFormatFilter === 'doc'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-blue-300/80 hover:text-blue-200'
                      }`}
                    >
                      📄 Google Docs ({docCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDriveFormatFilter('sheet')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        driveFormatFilter === 'sheet'
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : 'text-emerald-300/80 hover:text-emerald-200'
                      }`}
                    >
                      📊 Google Sheets ({sheetCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDriveFormatFilter('slide')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        driveFormatFilter === 'slide'
                          ? 'bg-amber-600 text-white font-bold shadow-sm'
                          : 'text-amber-300/80 hover:text-amber-200'
                      }`}
                    >
                      📑 Google Slides ({slideCount})
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    共用資料夾檔案清單
                  </span>
                </div>
              );
            })()}

            {/* Keyword Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={driveSearchQuery}
                onChange={(e) => setDriveSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadDriveFiles()}
                placeholder="搜尋共用資料夾內的檔案名稱關鍵字（支援 .md、Docs、Sheets、Slides）..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* File List Grid */}
            {(() => {
              const filtered = driveFiles.filter((f) => {
                const isMd =
                  f.name.toLowerCase().endsWith('.md') ||
                  f.name.toLowerCase().endsWith('.markdown') ||
                  f.mimeType.includes('markdown');
                const isDoc = f.mimeType.includes('document');
                const isSheet = f.mimeType.includes('spreadsheet');
                const isSlide = f.mimeType.includes('presentation');

                if (driveFormatFilter === 'md') return isMd;
                if (driveFormatFilter === 'doc') return isDoc;
                if (driveFormatFilter === 'sheet') return isSheet;
                if (driveFormatFilter === 'slide') return isSlide;
                return true;
              });

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filtered.length === 0 ? (
                    <div className="col-span-2 py-8 px-4 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2">
                      <p>
                        {isLoadingDriveFiles
                          ? '正在從共用資料夾載入檔案...'
                          : '此篩選分類下尚無檔案。您可以將 .md 筆記或報告上傳至共用資料夾，或於 APP 內點擊「儲存至 Google Drive」自動存入！'}
                      </p>
                      {!isLoadingDriveFiles && (
                        <div className="pt-2 flex justify-center gap-2">
                          <a
                            href={DEFAULT_SHARED_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-medium border border-slate-700 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>前往共用資料夾檢視</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleLoadDriveFiles()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>重新整理</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    filtered.map((f) => {
                      const isMd =
                        f.name.toLowerCase().endsWith('.md') ||
                        f.name.toLowerCase().endsWith('.markdown') ||
                        f.mimeType.includes('markdown');
                      const isDoc = f.mimeType.includes('document');
                      const isSheet = f.mimeType.includes('spreadsheet');
                      const isSlide = f.mimeType.includes('presentation');

                      return (
                        <div
                          key={f.id}
                          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isMd ? (
                                <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/60 font-mono text-[10px] font-bold">
                                  📝 Markdown (.md)
                                </span>
                              ) : isDoc ? (
                                <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/40 font-mono text-[10px]">
                                  📄 Google Doc
                                </span>
                              ) : isSheet ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 font-mono text-[10px]">
                                  📊 Google Sheet
                                </span>
                              ) : isSlide ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/40 font-mono text-[10px]">
                                  📑 Google Slides
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                                  檔案
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-200 truncate">{f.name}</span>
                            </div>
                            {f.modifiedTime && (
                              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                                更新時間：{f.modifiedTime.split('T')[0]}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleReadDriveFile(f)}
                            disabled={readingFileId === f.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium shrink-0 transition cursor-pointer flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{readingFileId === f.id ? '讀取解析中...' : '讀取並解析'}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Draft Preview & Customization Box (Appears after extraction) */}
        {draftSignal && (
          <div className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                  結構化預覽與微調
                </span>
                <span className="text-xs text-slate-400">
                  解析引擎：{draftSignal.extractionMethod === 'ai_assisted' ? '✨ AI 智慧去情緒化萃取' : '⚡ 純規則量化解析'}
                </span>
              </div>
              <button
                onClick={() => setDraftSignal(null)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                取消
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] text-slate-400">客觀事實標題</label>
                <input
                  type="text"
                  value={draftSignal.title}
                  onChange={(e) => setDraftSignal({ ...draftSignal, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">影響維度分類</label>
                <select
                  value={draftSignal.dimension}
                  onChange={(e) =>
                    setDraftSignal({ ...draftSignal, dimension: e.target.value as SignalDimension })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                >
                  <option value="dividend_sustainability">① 配息續航力 (分紅/EPS/平準金)</option>
                  <option value="valuation_margin">② 估值與安全邊際 (殖利率/淨值)</option>
                  <option value="friction_fx">③ 稅費與匯率摩擦 (健保/港幣匯率)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Direction */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">對未來股利影響方向</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bullish', label: '🟢 正向', color: 'bg-emerald-600 text-white' },
                    { id: 'neutral', label: '⚪ 中性', color: 'bg-slate-700 text-white' },
                    { id: 'bearish', label: '🔴 風險', color: 'bg-rose-600 text-white' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        setDraftSignal({ ...draftSignal, direction: d.id as SignalDirection })
                      }
                      className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        draftSignal.direction === d.id
                          ? d.color
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight 1-5 */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">
                  客觀證據權重：{draftSignal.weight} / 5
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={draftSignal.weight}
                  onChange={(e) => setDraftSignal({ ...draftSignal, weight: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer mt-2"
                />
              </div>

              {/* Implied Dividend Shift */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">
                  每股年配息邊際影響推估 (TWD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={draftSignal.impliedDividendShift}
                  onChange={(e) =>
                    setDraftSignal({
                      ...draftSignal,
                      impliedDividendShift: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-emerald-400"
                />
              </div>
            </div>

            {/* Extracted Hard Facts */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">萃取硬數據（Hard Data）</label>
              <ul className="space-y-1 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                {draftSignal.hardFacts.map((fact, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono">•</span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirm Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDraft(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                儲存至情報中心
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDraft(true)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>儲存並同步備份至 Google Drive</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Side-by-Side Bull vs Bear Evidence Ledger & Signal Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>結構化情報與硬數據資料庫（共 {filteredSignals.length} 筆）</span>
          </h2>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterDimension}
              onChange={(e) => setFilterDimension(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
            >
              <option value="all">所有維度</option>
              <option value="dividend_sustainability">① 配息續航力</option>
              <option value="valuation_margin">② 估值與安全邊際</option>
              <option value="friction_fx">③ 稅費與匯率摩擦</option>
            </select>

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300"
            >
              <option value="all">所有方向</option>
              <option value="bullish">🟢 正向支撐</option>
              <option value="bearish">🔴 潛在風險</option>
              <option value="neutral">⚪ 中性事實</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredSignals.map((sig) => (
            <div
              key={sig.id}
              className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 transition ${
                sig.direction === 'bullish'
                  ? 'border-emerald-500/25 hover:border-emerald-500/40'
                  : sig.direction === 'bearish'
                  ? 'border-rose-500/25 hover:border-rose-500/40'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  {sig.direction === 'bullish' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>正向支撐 (權重 {sig.weight}/5)</span>
                    </span>
                  ) : sig.direction === 'bearish' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>潛在風險 (權重 {sig.weight}/5)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                      <Minus className="w-3.5 h-3.5" />
                      <span>中性事實 (權重 {sig.weight}/5)</span>
                    </span>
                  )}

                  {getDimensionBadge(sig.dimension)}

                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {sig.ticker}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{sig.date}</span>
                </div>

                {/* Actions: Save to Drive / Convert to Note / Delete */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDriveSaveConfirmation(sig)}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      sig.syncedToDrive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="將此筆結構化情報存為 Google Drive 中的 Markdown 檔案"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{sig.syncedToDrive ? '已存 Drive (再次備份)' : '存入 Drive'}</span>
                  </button>

                  <button
                    onClick={() => handleConvertSignalToNote(sig)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
                    title="轉存為符合 CLAUDE.md 格式的財商架構筆記"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>轉存筆記庫</span>
                  </button>

                  <button
                    onClick={() => onDeleteSignal(sig.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    title="刪除此筆情報"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">{sig.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{sig.objectiveReasoning}</p>
              </div>

              {/* Extracted Hard Facts & Quantitative Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="lg:col-span-2 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    客觀事實與硬數據 (Hard Facts)
                  </div>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {sig.hardFacts.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-mono">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    關鍵量化指標 & 配息影響
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sig.extractedMetrics.map((m, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <span className="text-slate-400 text-[11px] block">{m.label}</span>
                        <span className="font-mono font-bold text-teal-300">{m.value}</span>
                      </div>
                    ))}
                    <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px] block">配息邊際影響</span>
                      <span
                        className={`font-mono font-bold ${
                          sig.impliedDividendShift > 0
                            ? 'text-emerald-400'
                            : sig.impliedDividendShift < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {sig.impliedDividendShift > 0
                          ? `+${sig.impliedDividendShift.toFixed(2)}`
                          : sig.impliedDividendShift.toFixed(2)}{' '}
                        TWD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explicit User Confirmation Modal for Google Drive Save (Mandatory per Workspace guidelines) */}
      {driveConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <CloudUpload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">確認儲存情報檔案至 Google Drive</h3>
              </div>
              <button
                onClick={() =>
                  setDriveConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                系統將在您的 Google Drive 共用資料夾建立以下獨立的新 Markdown 情報筆記檔案（不會觸碰或修改唯讀的{' '}
                <code className="text-emerald-400">Investment_Tracker_Core</code>）：
              </p>

              <div className="space-y-1">
                <label className="text-slate-400 block">📁 儲存目標共用資料夾：</label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono">
                  <div className="text-emerald-300 font-bold flex items-center justify-between">
                    <span>{driveConfirmModal.folderName}</span>
                    <a
                      href={driveConfirmModal.folderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:text-teal-300 underline text-[10px] flex items-center gap-1"
                    >
                      <span>開啟連結</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    ID: {driveConfirmModal.folderId}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">檔案名稱：</label>
                <input
                  type="text"
                  value={driveConfirmModal.fileName}
                  onChange={(e) =>
                    setDriveConfirmModal({ ...driveConfirmModal, fileName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">儲存內容預覽（YAML Frontmatter + 硬數據）：</label>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {driveConfirmModal.markdownContent}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setDriveConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={executeSaveToDrive}
                disabled={driveConfirmModal.isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{driveConfirmModal.isSaving ? '寫入雲端硬碟中...' : '確認建立並存入 Google Drive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
