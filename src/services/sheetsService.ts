import { getAccessToken } from './googleAuth';

export const DEFAULT_CORE_SPREADSHEET_ID = '1QBEgUi-kTOuLgj2yGHmP-0g_ug-Sl_M21SN0g93b6xI';

export interface CoreSheetFetchResult {
  ticker: string;
  currentPrice: number;
  lastUpdated: string;
  shares?: number;
  marketYieldPct?: number;
  sourceRange: string;
}

/**
 * Fetch Current_Price from Investment_Tracker_Core's Portfolio tab
 * Strictly READ-ONLY per CLAUDE.md guidelines.
 */
export async function fetchCurrentPriceFromCoreSheet(
  spreadsheetId: string = DEFAULT_CORE_SPREADSHEET_ID,
  tickerToFind: string = '00882'
): Promise<CoreSheetFetchResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NEEDS_AUTH');
  }

  const range = 'Portfolio!A1:G10';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }
    if (response.status === 403) {
      throw new Error('PERMISSION_DENIED');
    }
    const errText = await response.text();
    throw new Error(`讀取試算表失敗 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    throw new Error('試算表 Portfolio 分頁無資料');
  }

  // Parse header row
  const headers = rows[0].map((h) => (h || '').trim().toLowerCase());
  let priceColIndex = headers.findIndex((h) => h.includes('current_price') || h.includes('price') || h.includes('現價') || h.includes('股價'));
  let dateColIndex = headers.findIndex((h) => h.includes('last_updated') || h.includes('updated') || h.includes('日期') || h.includes('時間'));
  let tickerColIndex = headers.findIndex((h) => h.includes('ticker') || h.includes('代號') || h.includes('標的'));

  // Fallbacks based on standard schema: Portfolio!A=Ticker, B=Name, C=Shares, D=Current_Price, E=Market_Yield_Pct, F=Last_Updated
  if (priceColIndex === -1) priceColIndex = 3; // Column D
  if (dateColIndex === -1) dateColIndex = 5;  // Column F
  if (tickerColIndex === -1) tickerColIndex = 0; // Column A

  // Find target row (starting from row 1)
  let targetRow: string[] | null = null;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowTicker = (row[tickerColIndex] || '').trim();
    if (rowTicker === tickerToFind || row.some((cell) => (cell || '').includes(tickerToFind))) {
      targetRow = row;
      break;
    }
  }

  // If specific row not found by ticker, fallback to row 1 (the first data row)
  if (!targetRow && rows.length > 1) {
    targetRow = rows[1];
  }

  if (!targetRow) {
    throw new Error(`在 Portfolio 分頁中找不到標的 ${tickerToFind} 的資料列`);
  }

  const rawPriceStr = targetRow[priceColIndex] || '';
  const parsedPrice = parseFloat(rawPriceStr.replace(/[^0-9.]/g, ''));

  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error(`從 Portfolio 欄位讀取到的股價無效: "${rawPriceStr}"`);
  }

  const rawDateStr = targetRow[dateColIndex] || '';
  // Convert 2026/10/01 or 2026-10-01
  const normalizedDate = rawDateStr.replace(/\//g, '-').trim() || new Date().toISOString().split('T')[0];

  return {
    ticker: targetRow[tickerColIndex] || tickerToFind,
    currentPrice: parsedPrice,
    lastUpdated: normalizedDate,
    sourceRange: `${data.range || range} (ID: ${spreadsheetId.slice(0, 8)}...)`,
  };
}
