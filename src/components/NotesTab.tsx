import React, { useState } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Tag, 
  Calendar, 
  History, 
  FileText, 
  ShieldCheck, 
  Copy, 
  Check,
  Search,
  Plus,
  CloudUpload,
  Cloud
} from 'lucide-react';
import { ArchNote } from '../types/portfolio';
import { CONTROLLED_VOCABULARY } from '../data/initialData';
import { ResearchFeedPanel } from './ResearchFeedPanel';
import { 
  saveIntelligenceMarkdownToDrive,
  DEFAULT_SHARED_FOLDER_ID,
  DEFAULT_SHARED_FOLDER_URL,
  DEFAULT_SHARED_FOLDER_NAME
} from '../services/driveIntelligenceService';
import { getAccessToken, googleSignIn } from '../services/googleAuth';

interface NotesTabProps {
  notes: ArchNote[];
  onUpdateNote: (note: ArchNote) => void;
  onAddNote: (note: ArchNote) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes, onUpdateNote, onAddNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Explicit User Confirmation Modal for saving Note to Google Drive (Mandatory per Workspace guidelines)
  const [driveModal, setDriveModal] = useState<{
    isOpen: boolean;
    fileName: string;
    folderPath: string;
    folderUrl: string;
    markdownContent: string;
    isSaving: boolean;
  }>({
    isOpen: false,
    fileName: '',
    folderPath: DEFAULT_SHARED_FOLDER_NAME,
    folderUrl: DEFAULT_SHARED_FOLDER_URL,
    markdownContent: '',
    isSaving: false,
  });

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5500);
  };

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const filteredNotes = notes.filter((n) => {
    const matchSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchDomain = filterDomain === 'ALL' || n.domain === filterDomain;
    return matchSearch && matchDomain;
  });

  const generateMarkdownExport = (note: ArchNote) => {
    return `---
type: ${note.type}
title: ${note.title}
domain: ${note.domain}
status: ${note.status}
version: ${note.version}
created: ${note.created}
updated: ${note.updated}
tags: [${note.tags.join(', ')}]
review: ${note.review || ''}
tickers: [${(note.tickers || []).join(', ')}]
aliases: [${(note.aliases || []).join(', ')}]
sources: [${(note.sources || []).join(', ')}]
---

## 摘要

${note.summary}

## 規則

${note.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## 理由

### 事實（${note.created} 持股快照）

${note.reasons.facts.map((f) => `- ${f}`).join('\n')}

### 判斷

${note.reasons.judgments.map((j) => `- ${j}`).join('\n')}

## 適用範圍與例外

${note.scopeAndExceptions.map((s) => `- ${s}`).join('\n')}

## 變更紀錄

${note.changelog
  .map(
    (c) => `### v${c.version}（${c.date}）\n\n- 變更：${c.changes}\n- 原因：${c.reason}`
  )
  .join('\n\n')}
`;
  };

  const handleCopyMarkdown = (note: ArchNote) => {
    const md = generateMarkdownExport(note);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDriveModal = (note: ArchNote) => {
    const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 24);
    const fileName = `架構筆記_${note.created}_${safeTitle}.md`;
    const markdownContent = generateMarkdownExport(note);

    setDriveModal({
      isOpen: true,
      fileName,
      folderPath: DEFAULT_SHARED_FOLDER_NAME,
      folderUrl: DEFAULT_SHARED_FOLDER_URL,
      markdownContent,
      isSaving: false,
    });
  };

  const handleExecuteDriveSave = async () => {
    setDriveModal((prev) => ({ ...prev, isSaving: true }));
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) {
          setDriveModal((prev) => ({ ...prev, isSaving: false }));
          return;
        }
      }

      const saved = await saveIntelligenceMarkdownToDrive({
        fileName: driveModal.fileName,
        markdownContent: driveModal.markdownContent,
        folderId: DEFAULT_SHARED_FOLDER_ID,
      });

      setDriveModal({
        isOpen: false,
        fileName: '',
        folderPath: DEFAULT_SHARED_FOLDER_NAME,
        folderUrl: DEFAULT_SHARED_FOLDER_URL,
        markdownContent: '',
        isSaving: false,
      });
      showNotice(
        'success',
        `☁️ 已成功將架構筆記存入 Google Drive 共用資料夾：${saved.name}！`
      );
    } catch (err: any) {
      setDriveModal((prev) => ({ ...prev, isSaving: false }));
      showNotice('error', err.message || '儲存筆記至 Google Drive 失敗');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <ResearchFeedPanel />

      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>tool-note-writer 標準架構庫</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">財商工程架構筆記庫</h1>
            <p className="text-sm text-slate-400 mt-1">
              架構（architecture/）、投資研究（research/）、趨勢覺察（trends/）與投資日誌（journal/）
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              受控詞彙：8 大 domain ｜ 18 tags
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜尋筆記標題、規則或標籤..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">全部領域 (Domain)</option>
            {CONTROLLED_VOCABULARY.domain.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Grid: Note selector left + Reader/Viewer right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Note List */}
        <div className="lg:col-span-4 space-y-3">
          {filteredNotes.map((note) => {
            const isSelected = selectedNote?.id === note.id;
            return (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-teal-300">
                    {note.domain}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    v{note.version} ｜ {note.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm mb-1">{note.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {note.summary}
                </p>

                <div className="flex flex-wrap gap-1 mt-3">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Full Note Viewer */}
        {selectedNote && (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Note Meta Bar */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    type: {selectedNote.type}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                    domain: {selectedNote.domain}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold font-mono">
                    status: {selectedNote.status} (v{selectedNote.version})
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">{selectedNote.title}</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono pt-1">
                  <span>建立：{selectedNote.created}</span>
                  <span>最後修訂：{selectedNote.updated}</span>
                  {selectedNote.review && <span>定期回顧日：{selectedNote.review}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyMarkdown(selectedNote)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer shrink-0"
                  title="複製符合 Markdown Linter 規範之全文"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已複製 MD' : '複製 Markdown'}</span>
                </button>

                <button
                  onClick={() => handleOpenDriveModal(selectedNote)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/40 transition cursor-pointer shrink-0"
                  title="存入 Google Drive 預設目錄 (Project_財商工程/情報與趨勢)"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>存至 Google Drive</span>
                </button>
              </div>
            </div>

            {/* Tags & Tickers */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">標籤：</span>
              {selectedNote.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  #{t}
                </span>
              ))}
              {selectedNote.tickers && selectedNote.tickers.length > 0 && (
                <>
                  <span className="text-slate-500 ml-2">相關標的：</span>
                  {selectedNote.tickers.map((t) => (
                    <span key={t} className="font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                      {t}
                    </span>
                  ))}
                </>
              )}
            </div>

            {/* Standard Section 1: 摘要 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>## 摘要</span>
              </h3>
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                {selectedNote.summary}
              </div>
            </div>

            {/* Standard Section 2: 規則 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>## 規則</span>
              </h3>
              <div className="space-y-2">
                {selectedNote.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-start space-x-3 text-xs"
                  >
                    <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                      {idx + 1}
                    </span>
                    <span className="text-slate-300 leading-relaxed">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Section 3: 理由 (事實 vs 判斷) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>## 理由</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Facts */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-200 block border-b border-slate-800 pb-1.5">
                    事實／客觀數據（附來源與日期）
                  </span>
                  <ul className="space-y-2 text-slate-400 list-disc list-inside">
                    {selectedNote.reasons.facts.map((f, i) => (
                      <li key={i} className="leading-relaxed">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Judgments */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-200 block border-b border-slate-800 pb-1.5">
                    判斷／主觀推論（決策邏輯）
                  </span>
                  <ul className="space-y-2 text-slate-400 list-disc list-inside">
                    {selectedNote.reasons.judgments.map((j, i) => (
                      <li key={i} className="leading-relaxed">
                        {j}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Standard Section 4: 適用範圍與例外 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>## 適用範圍與例外</span>
              </h3>
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                {selectedNote.scopeAndExceptions.map((item, idx) => (
                  <p key={idx} className="leading-relaxed">
                    • {item}
                  </p>
                ))}
              </div>
            </div>

            {/* Standard Section 5: 變更紀錄 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <span>## 變更紀錄</span>
              </h3>
              <div className="space-y-3">
                {selectedNote.changelog.map((c) => (
                  <div
                    key={c.version}
                    className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="font-bold text-emerald-400">v{c.version}</span>
                      <span className="text-slate-500">（{c.date}）</span>
                    </div>
                    <p className="text-slate-300">
                      <strong>變更：</strong> {c.changes}
                    </p>
                    <p className="text-slate-400">
                      <strong>原因：</strong> {c.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Status Toast */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-in">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-slate-900 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900 border-rose-500/50 text-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-medium leading-relaxed">{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Modal for saving to Google Drive */}
      {driveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
              <CloudUpload className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">確認儲存筆記至 Google Drive 共用資料夾？</h3>
                <p className="text-xs text-slate-400">存入後即可在【客觀趨勢情報中心】選擇 Google Drive 檔案一鍵讀取帶入</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">目標雲端資料夾 (共用目錄)：</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-emerald-300 font-bold">{driveModal.folderPath}</span>
                    <a
                      href={driveModal.folderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:text-teal-300 underline text-[10px]"
                    >
                      開啟連結 ↗
                    </a>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">檔案名稱：</span>
                  <span className="text-slate-200">{driveModal.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">安全唯讀防護保證：</span>
                  <span className="text-teal-400 font-medium">絕對不觸碰、不修改 Investment_Tracker_Core 核心試算表！</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Markdown 檔案預覽 (前 200 字元)：</span>
                <pre className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto max-h-32">
                  {driveModal.markdownContent.slice(0, 220)}...
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDriveModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={driveModal.isSaving}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteDriveSave}
                disabled={driveModal.isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center space-x-2"
              >
                {driveModal.isSaving ? (
                  <>
                    <Cloud className="w-4 h-4 animate-spin" />
                    <span>正在儲存至 Google Drive...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    <span>確認儲存至 Drive 預設目錄</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
