import { getAccessToken } from './googleAuth';

// Drive: Project_財商工程/app_feed/notes.json（由 Claude 排程從 Investment_Tracker 匯出，唯讀）
export const RESEARCH_FEED_FILE_ID = '1vFRbXNWkYRjfdcpN0eG0mjlRdL7EhMB1';

export interface ResearchFeedNote {
  path: string;
  type: string | null;
  title: string | null;
  updated: string | null;
  frontmatter: Record<string, string>;
  markdown: string;
}

export interface ResearchFeed {
  schema: number;
  source: string;
  commit: string;
  generated_at: string;
  notes: ResearchFeedNote[];
}

/** 讀取 Drive 上的研究筆記 feed（僅 GET，不寫入） */
export async function fetchResearchFeed(): Promise<ResearchFeed> {
  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${RESEARCH_FEED_FILE_ID}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    throw new Error(`讀取研究筆記失敗 (${res.status})`);
  }
  return res.json();
}
