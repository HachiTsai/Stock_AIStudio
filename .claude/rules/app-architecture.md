# Stock_AIStudio 架構與資料流規範

`Stock_AIStudio` 為個人投資追蹤、股利現金流模型模擬與 AI 智慧情報分析之全端 Web 應用程式。

---

## 1. 系統架構總覽

本系統採用 前端 React SPA + 後端 Express 代理伺服器架構：

- **前端（Client）**：
  - **核心技術**：React 19、TypeScript、Vite、Tailwind CSS v4
  - **圖表與動效**：Three.js（3D 視覺化圖表）、Lucide React 圖示庫
  - **模組職責**：
    - `src/components/OverviewTab.tsx`：資產總覽、持股現況與關鍵績效指標
    - `src/components/DividendsTab.tsx`：歷史股利與收益分析
    - `src/components/DividendPlanner.tsx`：年股利 50 萬目標缺口試算與股息再投入模擬
    - `src/components/IntelligenceTab.tsx`：市場情報與 AI 分析觀點彙整
    - `src/components/Dynamic3DChart.tsx`：Three.js 3D 資產配置動態圖表
    - `src/components/ConstituentsPanel.tsx`：ETF 成分股持股比重分析
    - `src/components/LatestQuoteModal.tsx`：即時股價走勢與技術快照
    - `src/services/`：負責處理 Google Drive Sheets 資料讀取與市場情報匯流

- **後端（Server）**：
  - **核心技術**：Express (`server.ts`)、TypeScript、`@google/genai` (Gemini API SDK)
  - **服務職責**：
    - 代理與封裝 Gemini API 調用，保護 `GEMINI_API_KEY` 不在前端外洩
    - 整合 Vite 開發伺服器中間件，提供開發與生產環境 API 路由
    - 監聽埠號：3000

---

## 2. 資料流與邊界規範

1. **真實資料來源（Google Drive Sheet）**：
   - 即時讀取 `Investment_Tracker_Core` 試算表作為唯一的資產與交易數據源。
   - 所有資料在客戶端進行記憶體狀態快取，**絕對不回寫 Core 試算表**。
2. **AI 分析串接（Gemini API）**：
   - 伺服器端調用 Gemini API 模型進行市場情報總結與趨勢判讀。
   - 當未設定 `GEMINI_API_KEY` 時，系統應能平滑退回「純規則量化解析模式」，避免整站崩潰。
