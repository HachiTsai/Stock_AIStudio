import { getAccessToken } from './googleAuth';
import { DEFAULT_CORE_SPREADSHEET_ID } from './sheetsService';
import { DriveFileSummary, IntelligenceSignal, SignalSourceType } from '../types/portfolio';

// Hardcoded safety lock: NEVER allow any write/mutation to Investment_Tracker_Core
const PROTECTED_READONLY_IDS = new Set([DEFAULT_CORE_SPREADSHEET_ID]);

function assertNotProtectedCore(fileId?: string) {
  if (fileId && PROTECTED_READONLY_IDS.has(fileId.trim())) {
    throw new Error('安全防護攔截：Investment_Tracker_Core 為絕對唯讀資料庫，嚴禁任何寫入操作！');
  }
}

/**
 * List recent Docs, Sheets, Slides, and Markdown files from Google Drive (Read-only)
 */
export async function listDriveResearchFiles(searchQuery: string = ''): Promise<DriveFileSummary[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  let q = "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.google-apps.presentation' or mimeType = 'text/markdown' or mimeType = 'text/plain')";
  if (searchQuery.trim()) {
    const escaped = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${escaped}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    throw new Error(`讀取 Google Drive 檔案列表失敗 (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Read text content from a Google Doc, Sheet, Slide, or Markdown file (Read-only)
 */
export async function readDriveFileText(file: DriveFileSummary): Promise<{
  text: string;
  sourceType: SignalSourceType;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  // 1. Google Docs
  if (file.mimeType === 'application/vnd.google-apps.document') {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${file.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`讀取 Google Doc 失敗 (${res.status})`);
    const doc = await res.json();
    const lines: string[] = [];
    const content = doc.body?.content || [];
    for (const elem of content) {
      if (elem.paragraph?.elements) {
        const paraText = elem.paragraph.elements
          .map((e: any) => e.textRun?.content || '')
          .join('');
        if (paraText.trim()) lines.push(paraText.trim());
      } else if (elem.table?.tableRows) {
        for (const row of elem.table.tableRows) {
          const rowCells = (row.tableCells || []).map((cell: any) =>
            (cell.content || [])
              .map((c: any) =>
                (c.paragraph?.elements || []).map((pe: any) => pe.textRun?.content || '').join('')
              )
              .join(' ')
              .trim()
          );
          lines.push(rowCells.join(' | '));
        }
      }
    }
    return { text: lines.join('\n'), sourceType: 'drive_doc' };
  }

  // 2. Google Slides
  if (file.mimeType === 'application/vnd.google-apps.presentation') {
    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${file.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`讀取 Google Slides 簡報失敗 (${res.status})`);
    const pres = await res.json();
    const slideTexts: string[] = [];
    (pres.slides || []).forEach((slide: any, idx: number) => {
      const pageLines: string[] = [];
      (slide.pageElements || []).forEach((el: any) => {
        const textElements = el.shape?.text?.textElements || [];
        const shapeText = textElements
          .map((te: any) => te.textRun?.content || '')
          .join('')
          .trim();
        if (shapeText) pageLines.push(shapeText);
      });
      if (pageLines.length > 0) {
        slideTexts.push(`[投影片 ${idx + 1}] ${pageLines.join(' / ')}`);
      }
    });
    return { text: slideTexts.join('\n'), sourceType: 'drive_slide' };
  }

  // 3. Google Sheets
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    // First get metadata to find first sheet title
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!metaRes.ok) throw new Error(`讀取 Google Sheet 結構失敗 (${metaRes.status})`);
    const meta = await metaRes.json();
    const firstSheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1';

    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${encodeURIComponent(
        `${firstSheetTitle}!A1:M40`
      )}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!valRes.ok) throw new Error(`讀取試算表內容失敗 (${valRes.status})`);
    const valData = await valRes.json();
    const rows: string[][] = valData.values || [];
    const text = rows.map((r) => r.join(' | ')).join('\n');
    return { text, sourceType: 'drive_sheet' };
  }

  // 4. Plain text / Markdown file
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`讀取檔案內容失敗 (${res.status})`);
  const text = await res.text();
  return { text, sourceType: 'drive_doc' };
}

/**
/**
 * Find or create nested folders in Google Drive by path, e.g. "Project_財商工程/情報與趨勢"
 */
export async function getOrCreateFolderPath(folderPath: string, token: string): Promise<string | null> {
  const parts = folderPath.split('/').map((p) => p.trim()).filter(Boolean);
  let parentId: string | null = null;

  for (const part of parts) {
    let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${part.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          parentId = data.files[0].id;
          continue;
        }
      }

      // If folder doesn't exist, create it
      const createBody: any = {
        name: part,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) {
        createBody.parents = [parentId];
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      });

      if (createRes.ok) {
        const newFolder = await createRes.json();
        parentId = newFolder.id;
      } else {
        return parentId;
      }
    } catch (err) {
      console.warn('Folder resolution error:', err);
      return parentId;
    }
  }

  return parentId;
}

/**
 * Save an IntelligenceSignal or Trend Synthesis Report as a new Markdown file in Google Drive
 * Automatically organizes into target folder (defaults to Project_財商工程/情報與趨勢)
 */
export async function saveIntelligenceMarkdownToDrive({
  fileName,
  markdownContent,
  folderPath = 'Project_財商工程/情報與趨勢',
}: {
  fileName: string;
  markdownContent: string;
  folderPath?: string;
}): Promise<{ id: string; name: string; webViewLink?: string; targetFolder?: string }> {
  assertNotProtectedCore(fileName);

  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  let parentFolderId: string | null = null;
  if (folderPath && folderPath.trim()) {
    parentFolderId = await getOrCreateFolderPath(folderPath.trim(), token);
  }

  const metadata: any = {
    name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
    mimeType: 'text/markdown',
    description: '由 Investment Tracker 財商工程大本營產出之客觀趨勢情報筆記',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
    markdownContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`儲存至 Google Drive 失敗 (${res.status}): ${errText}`);
  }

  const result = await res.json();
  return { ...result, targetFolder: folderPath };
}

/**
 * Format a single IntelligenceSignal or full Trend Report into CLAUDE.md compliant Markdown
 */
export function formatSignalAsNoteMarkdown(signal: IntelligenceSignal): string {
  const dimLabel =
    signal.dimension === 'dividend_sustainability'
      ? '配息續航力'
      : signal.dimension === 'valuation_margin'
      ? '估值安全邊際'
      : '稅費與匯率摩擦';

  const dirLabel =
    signal.direction === 'bullish'
      ? '正向支撐 (+)'
      : signal.direction === 'bearish'
      ? '潛在風險 (-)'
      : '中性事實 (0)';

  return `---
type: trends
title: ${signal.title}
domain: 股利
status: 生效
version: 1
created: ${signal.date}
updated: ${signal.date}
tags: [${signal.tags.join(', ')}]
tickers: [${signal.ticker}]
sources: [${signal.sourceUrl || signal.sourceType}]
---

# ${signal.title}

## 結論摘要

- **影響維度**：${dimLabel}
- **客觀方向**：${dirLabel}（權重 ${signal.weight}/5）
- **對每股年配息邊際影響推估**：${signal.impliedDividendShift >= 0 ? `+${signal.impliedDividendShift.toFixed(2)}` : signal.impliedDividendShift.toFixed(2)} TWD / 股
- **客觀推論**：${signal.objectiveReasoning}

## 萃取硬數據（Hard Data）

${signal.hardFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 量化指標

${
  signal.extractedMetrics.length > 0
    ? signal.extractedMetrics.map((m) => `- **${m.label}**：\`${m.value}\``).join('\n')
    : '- 無特定數值指標'
}

## 原始情報與來源紀錄

- **來源管道**：\`${signal.sourceType}\`${signal.sourceUrl ? `（${signal.sourceUrl}）` : ''}
- **解析方式**：\`${signal.extractionMethod === 'ai_assisted' ? 'AI 輔助去情緒化萃取' : '純規則量化引擎'}\`

> ${signal.rawContent.replace(/\n/g, '\n> ')}
`;
}
