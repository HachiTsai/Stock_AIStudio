import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Helper to initialize Gemini client on server side
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('伺服器未設定 GEMINI_API_KEY，請使用「純規則量化解析模式」或確認環境設定。');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Endpoint 0: Public Free Market Quote (Yahoo Finance / Google Finance, No OAuth/Auth required!)
  app.get('/api/market-quote', async (req, res) => {
    try {
      const ticker = (req.query.ticker as string) || '00882';
      const symbol = ticker.includes('.') ? ticker : `${ticker}.TW`;

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`市場行情伺服器回應異常 (${response.status})`);
      }

      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        throw new Error('未取得該標的之即時報價');
      }

      const price = Number(meta.regularMarketPrice.toFixed(2));
      const previousClose = meta.chartPreviousClose || meta.previousClose || price;
      const change = Number((price - previousClose).toFixed(2));
      const changePct = previousClose > 0 ? Number(((change / previousClose) * 100).toFixed(2)) : 0;
      // 以報價實際時間（台北時區）為準，沒有時才用現在時間
      const quoteTime = typeof meta.regularMarketTime === 'number' ? new Date(meta.regularMarketTime * 1000) : new Date();
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(quoteTime);
      const timeStr = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(quoteTime);

      res.json({
        ticker,
        symbol,
        price,
        previousClose,
        change,
        changePct,
        currency: meta.currency || 'TWD',
        date: dateStr,
        time: timeStr,
        source: 'Yahoo Finance (公開免費市場報價)',
      });
    } catch (error: any) {
      console.error('Market quote error:', error);
      res.status(500).json({ error: error.message || '抓取公開行情失敗' });
    }
  });

  // Endpoint 0b: Batch ETF quotes (server-side cache to avoid Yahoo rate limits; .TW then .TWO fallback)
  const QUOTE_CACHE_TTL_MS = 60_000;
  const quoteCache = new Map<string, { at: number; data: any }>();
  const YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  const fetchOneQuote = async (id: string) => {
    const cached = quoteCache.get(id);
    if (cached && Date.now() - cached.at < QUOTE_CACHE_TTL_MS) return cached.data;
    for (const suffix of ['.TW', '.TWO']) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(id + suffix)}?interval=1d&range=1d`,
          { headers: YAHOO_HEADERS }
        );
        if (!r.ok) continue;
        const meta = (await r.json())?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number') continue;
        const price = Number(meta.regularMarketPrice.toFixed(2));
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const data = {
          id,
          price,
          previousClose: prev,
          change: Number((price - prev).toFixed(2)),
          changePct: prev > 0 ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0,
          time: typeof meta.regularMarketTime === 'number' ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
          symbol: id + suffix,
        };
        quoteCache.set(id, { at: Date.now(), data });
        return data;
      } catch {
        // try next suffix
      }
    }
    return null;
  };

  // Endpoint 0a: 單檔日線（約 1 年）＋即時價，給「波段觀察」點開的技術圖表用。
  // 代號用波段觀察的格式：TPE:2356、HKG:1919、TYO:7203、NASDAQ:AAPL。
  const toYahooSymbols = (ticker: string): string[] => {
    const [ex, raw] = ticker.includes(':') ? ticker.split(':') : ['TPE', ticker];
    const code = (raw || '').trim();
    if (ex === 'HKG') return [`${code.padStart(4, '0')}.HK`];
    if (ex === 'TYO') return [`${code}.T`];
    if (ex === 'TPE') return [`${code}.TW`, `${code}.TWO`];
    return [code];
  };
  const chartCache = new Map<string, { at: number; data: any }>();

  // Endpoint 0a-2: 波段觀察表格用的批次即時價（每檔快取 60 秒，避免打爆 Yahoo）。
  const liveCache = new Map<string, { at: number; data: any }>();
  const fetchLive = async (ticker: string) => {
    const cached = liveCache.get(ticker);
    if (cached && Date.now() - cached.at < QUOTE_CACHE_TTL_MS) return cached.data;
    for (const symbol of toYahooSymbols(ticker)) {
      try {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
          { headers: YAHOO_HEADERS }
        );
        if (!r.ok) continue;
        const result = (await r.json())?.chart?.result?.[0];
        const meta = result?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number') continue;
        const closes: number[] = (result.indicators?.quote?.[0]?.close || []).filter((x: unknown) => typeof x === 'number');
        const previousClose = closes.length >= 2 ? closes[closes.length - 2] : meta.regularMarketPrice;
        const data = {
          price: meta.regularMarketPrice,
          previousClose,
          changePct: previousClose > 0 ? ((meta.regularMarketPrice - previousClose) / previousClose) * 100 : 0,
          quoteTime: typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : null,
        };
        liveCache.set(ticker, { at: Date.now(), data });
        return data;
      } catch {
        // 試下一個後綴
      }
    }
    return null;
  };

  app.get('/api/swing-quotes', async (req, res) => {
    const tickers = String(req.query.tickers || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^[A-Za-z]{2,6}:[A-Za-z0-9.\-]{1,12}$/.test(t))
      .slice(0, 60);
    if (tickers.length === 0) {
      res.status(400).json({ error: '需要 tickers，例如 TPE:2356,HKG:1919' });
      return;
    }
    const entries = await Promise.all(tickers.map(async (t) => [t, await fetchLive(t)] as const));
    res.json({ quotes: Object.fromEntries(entries.filter(([, v]) => v)), source: 'Yahoo Finance (公開免費市場報價)' });
  });

  app.get('/api/stock-chart', async (req, res) => {
    try {
      const ticker = String(req.query.ticker || '').trim();
      if (!/^[A-Za-z]{2,6}:[A-Za-z0-9.\-]{1,12}$/.test(ticker)) {
        res.status(400).json({ error: '代號格式需為 交易所:代號，例如 TPE:2356' });
        return;
      }
      const cached = chartCache.get(ticker);
      if (cached && Date.now() - cached.at < QUOTE_CACHE_TTL_MS) {
        res.json(cached.data);
        return;
      }
      for (const symbol of toYahooSymbols(ticker)) {
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
          { headers: YAHOO_HEADERS }
        );
        if (!r.ok) continue;
        const result = (await r.json())?.chart?.result?.[0];
        const q = result?.indicators?.quote?.[0];
        if (!result || !q || typeof result.meta?.regularMarketPrice !== 'number') continue;
        const bars: { t: number; o: number; h: number; l: number; c: number; v: number }[] = [];
        (result.timestamp || []).forEach((t: number, i: number) => {
          const [o, h, l, c, v] = [q.open[i], q.high[i], q.low[i], q.close[i], q.volume[i]];
          if ([o, h, l, c, v].every((x) => typeof x === 'number')) bars.push({ t, o, h, l, c, v });
        });
        const meta = result.meta;
        const data = {
          ticker,
          symbol,
          currency: meta.currency || '',
          price: meta.regularMarketPrice,
          // range=1y 時 chartPreviousClose 是一年前的收盤，不能拿來算今日漲跌；最後一根日線即最新交易日
          previousClose: bars.length >= 2 ? bars[bars.length - 2].c : meta.regularMarketPrice,
          quoteTime: typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : null,
          bars,
          source: 'Yahoo Finance (公開免費市場報價)',
        };
        chartCache.set(ticker, { at: Date.now(), data });
        res.json(data);
        return;
      }
      res.status(404).json({ error: '查不到該標的的日線與報價' });
    } catch (error: any) {
      console.error('Stock chart error:', error);
      res.status(500).json({ error: error.message || '抓取日線失敗' });
    }
  });

  app.get('/api/etf-quotes', async (req, res) => {
    const ids = String(req.query.tickers || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[0-9A-Z]{4,7}$/.test(s))
      .slice(0, 60);
    const quotes: Record<string, any> = {};
    const queue = [...ids];
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift()!;
        const q = await fetchOneQuote(id);
        if (q) quotes[id] = q;
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    res.json({ quotes, fetchedAt: new Date().toISOString(), requested: ids.length, resolved: Object.keys(quotes).length });
  });

  // Endpoint 1: Fetch webpage text from a URL (bypasses browser CORS for rule-based or AI extraction)
  app.post('/api/intelligence/fetch-url', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: '請提供有效的網址 (URL)' });
        return;
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentTrackerBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `無法讀取網址 (${response.status})` });
        return;
      }

      const html = await response.text();
      // Extract title and strip HTML tags cleanly
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : url;

      const cleanText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000);

      res.json({ title, text: cleanText, url });
    } catch (error: any) {
      console.error('URL fetch error:', error);
      res.status(500).json({ error: error.message || '抓取網址內容失敗' });
    }
  });

  // Endpoint 2: Optional AI Smart Extraction (using gemini-3.8-flash)
  app.post('/api/intelligence/ai-extract', async (req, res) => {
    try {
      const { rawText, sourceUrl, ticker = '00882' } = req.body;
      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        res.status(400).json({ error: '請提供要分析的文字內容' });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `你是一位嚴謹的量化財商工程分析師。請分析以下關於標的「${ticker}」（或高股息投資組合）的原始情報或數據，嚴格執行「去情緒化、事實與觀點剝離」：
1. 剔除所有主觀吹捧、恐慌形容詞或無根據預測，只保留客觀事實與硬數據（Hard Data）。
2. 將該情報歸類至三大核心維度之一：
   - dividend_sustainability（配息續航力：成分股獲利、派息率、分紅政策、可分配收益、資本平準金）
   - valuation_margin（估值與殖利率安全邊際：股價、淨值 NAV、折溢價、PB/PE、殖利率位階）
   - friction_fx（稅費與匯率摩擦：港幣/人民幣/台幣匯率、二代健保課稅結構、境內外所得佔比、費用率）
3. 客觀評估其對未來 1~3 年股利現金流的影響方向（bullish 正向支撐 / neutral 中性事實 / bearish 潛在風險）、影響權重（1~5 分），以及對每股年配息的推估微調幅度（impliedDividendShift，單位 TWD，範圍在 -0.15 到 +0.15 之間）。

原始來源網址：${sourceUrl || '無'}
原始內容：
${rawText.slice(0, 10000)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: '你只輸出符合結構化 Schema 的客觀財商數據 JSON，使用繁體中文，語氣冷靜、量化、精確。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: '去情緒化的客觀事實標題（25字以內）',
              },
              ticker: {
                type: Type.STRING,
                description: '關聯標的代號，預設 00882',
              },
              dimension: {
                type: Type.STRING,
                description: '必須為 dividend_sustainability, valuation_margin, 或 friction_fx 其中之一',
              },
              direction: {
                type: Type.STRING,
                description: '必須為 bullish, neutral, 或 bearish 其中之一',
              },
              weight: {
                type: Type.INTEGER,
                description: '影響權重 1 到 5',
              },
              hardFacts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 到 4 條從原文萃取出的純客觀事實與硬數據條列',
              },
              extractedMetrics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: '指標名稱，如 派息率、淨值、EPS年增率' },
                    value: { type: Type.STRING, description: '數值，如 6.74%、14.84、+5.2%' },
                  },
                  required: ['label', 'value'],
                },
                description: '萃取出的關鍵量化指標',
              },
              impliedDividendShift: {
                type: Type.NUMBER,
                description: '對每股年配息的客觀邊際影響估計（例如 +0.03, 0, -0.04）',
              },
              objectiveReasoning: {
                type: Type.STRING,
                description: '客觀因果推論說明（50字以內）',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 到 4 個分類標籤，如 成分股財報、匯率、分紅政策、估值',
              },
            },
            required: [
              'title',
              'ticker',
              'dimension',
              'direction',
              'weight',
              'hardFacts',
              'extractedMetrics',
              'impliedDividendShift',
              'objectiveReasoning',
              'tags',
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('模型未回傳有效結果');
      }

      const parsed = JSON.parse(text.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('AI Extract Error:', error);
      res.status(500).json({ error: error.message || 'AI 智慧萃取失敗' });
    }
  });

  // Vite middleware for development / static assets for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
