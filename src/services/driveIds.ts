// Drive／Sheet ID 不放進 git：由後端 /api/drive-ids 提供（伺服器環境變數 DRIVE_IDS，AI Studio Secrets 設定）。
// 只回傳 APP 唯讀會用到的鍵；沒設時回空物件，各服務顯示「資料來源未設定」或退回內建備援。
export type DriveIdKey =
  | 'INTEL_SHEET_ID'
  | 'DIV_00882_SHEET_ID'
  | 'HOLDINGS_SHEET_ID'
  | 'TX_DETAIL_SHEET_ID'
  | 'SWING_SHEET_ID'
  | 'MARKET_ETF_SHEET_ID';

let cache: Promise<Record<string, string>> | null = null;

function loadDriveIds(): Promise<Record<string, string>> {
  if (!cache) {
    cache = fetch('/api/drive-ids')
      .then((res) => (res.ok ? res.json() : { ids: {} }))
      .then((data) => (data && typeof data.ids === 'object' && data.ids ? (data.ids as Record<string, string>) : {}))
      .catch(() => ({}));
  }
  return cache;
}

/** 取得 ID；沒設定時丟錯（訊息只含鍵名）。 */
export async function driveId(key: DriveIdKey): Promise<string> {
  const id = (await loadDriveIds())[key];
  if (!id) throw new Error(`資料來源未設定（伺服器缺少 DRIVE_IDS 的 ${key}）`);
  return id;
}

/** gviz CSV 網址；query 例如 `gid=0` 或 `sheet=分頁名稱`（分頁名稱請先 encodeURIComponent）。 */
export async function sheetCsvUrl(key: DriveIdKey, query: string): Promise<string> {
  return `https://docs.google.com/spreadsheets/d/${await driveId(key)}/gviz/tq?tqx=out:csv&${query}`;
}

/** 試算表的檢視網址；沒設定時回 null。 */
export async function sheetEditUrl(key: DriveIdKey): Promise<string | null> {
  try {
    return `https://docs.google.com/spreadsheets/d/${await driveId(key)}/edit`;
  } catch {
    return null;
  }
}
