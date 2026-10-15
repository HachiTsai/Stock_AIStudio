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

export const DEFAULT_SHARED_FOLDER_ID = '1OkXyIl0huNSeYEOU1lDM0sfYNxG1gFpq';
export const DEFAULT_SHARED_FOLDER_URL = 'https://drive.google.com/drive/folders/1OkXyIl0huNSeYEOU1lDM0sfYNxG1gFpq?usp=sharing';
export const DEFAULT_SHARED_FOLDER_NAME = '共用情報資料夾 (Project_財商工程/情報與趨勢)';

/**
 * List recent Docs, Sheets, Slides, and Markdown files from the shared Google Drive folder (Read-only)
 * Shared folder URL: https://drive.google.com/drive/folders/1OkXyIl0huNSeYEOU1lDM0sfYNxG1gFpq?usp=sharing
 */
export async function listDriveResearchFiles(
  searchQuery: string = '',
  folderId: string = DEFAULT_SHARED_FOLDER_ID
): Promise<DriveFileSummary[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  // Query all non-trashed files directly in the designated shared folder
  // Note: We do NOT use 'fileExtension' because it is not a valid parameter in Drive API v3 q strings and causes HTTP 400.
  // By querying all non-folder items in the folder, all Docs, Sheets, Slides, .md files (even if uploaded as application/octet-stream or text/plain) are safely captured.
  let q = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;

  if (searchQuery.trim()) {
    const escaped = searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${escaped}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=100&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    const errText = await res.text();
    console.error(`Google Drive API error (${res.status}):`, errText);
    throw new Error(`讀取 Google Drive 共用資料夾檔案失敗 (${res.status})`);
  }

  const data = await res.json();
  const directFiles: DriveFileSummary[] = data.files || [];

  // Also query immediate subfolders to see if user has categorized notes in subdirectories
  let subfolderFiles: DriveFileSummary[] = [];
  try {
    const sfQuery = `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
    const sfRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        sfQuery
      )}&pageSize=20&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (sfRes.ok) {
      const sfData = await sfRes.json();
      const subfolders = sfData.files || [];
      if (subfolders.length > 0) {
        const subfolderPromises = subfolders.map(async (sf: any) => {
          try {
            let childQ = `'${sf.id}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
            if (searchQuery.trim()) {
              const escaped = searchQuery.trim().replace(/'/g, "\\'");
              childQ += ` and name contains '${escaped}'`;
            }
            const childRes = await fetch(
              `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
                childQ
              )}&pageSize=50&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (childRes.ok) {
              const childData = await childRes.json();
              return (childData.files || []).map((f: any) => ({
                ...f,
                name: `${sf.name} / ${f.name}`,
              }));
            }
          } catch (e) {
            console.warn('Subfolder search error:', e);
          }
          return [];
        });
        const subResults = await Promise.all(subfolderPromises);
        subfolderFiles = subResults.flat();
      }
    }
  } catch (e) {
    console.warn('Subfolder search error:', e);
  }

  // Combine and deduplicate
  const seenIds = new Set<string>();
  const combined: DriveFileSummary[] = [];
  for (const f of [...directFiles, ...subfolderFiles]) {
    if (!f.id || seenIds.has(f.id)) continue;
    seenIds.add(f.id);
    combined.push(f);
  }

  return combined;
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

  // 4. Plain text / Markdown file (.md)
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`讀取檔案內容失敗 (${res.status})`);
  const text = await res.text();
  const isMd =
    file.name.toLowerCase().endsWith('.md') ||
    file.name.toLowerCase().endsWith('.markdown') ||
    file.name.toLowerCase().endsWith('.txt') ||
    file.mimeType.includes('markdown') ||
    file.mimeType.includes('plain');
  return { text, sourceType: isMd ? 'drive_md' : 'drive_doc' };
}

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
 * Save an IntelligenceSignal or Trend Synthesis Report as a new Markdown file in the shared Google Drive folder
 * Shared folder URL: https://drive.google.com/drive/folders/1OkXyIl0huNSeYEOU1lDM0sfYNxG1gFpq?usp=sharing
 */
export async function saveIntelligenceMarkdownToDrive({
  fileName,
  markdownContent,
  folderId = DEFAULT_SHARED_FOLDER_ID,
}: {
  fileName: string;
  markdownContent: string;
  folderId?: string;
}): Promise<{ id: string; name: string; webViewLink?: string; targetFolder?: string }> {
  assertNotProtectedCore(fileName);

  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  const metadata: any = {
    name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
    mimeType: 'text/markdown',
    description: '由 Investment Tracker 財商工程產出之客觀趨勢情報筆記',
    parents: [folderId],
  };

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
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true',
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
    throw new Error(`儲存至 Google Drive 共用資料夾失敗 (${res.status}): ${errText}`);
  }

  const result = await res.json();
  return { ...result, targetFolder: DEFAULT_SHARED_FOLDER_NAME };
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
