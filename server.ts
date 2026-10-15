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
