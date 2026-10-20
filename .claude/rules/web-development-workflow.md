# Web 開發工作流與品質檢查規範

本專案的前端與伺服器均以 TypeScript 編寫，任何變更必須維持嚴格的型別安全性與程式碼品質。

---

## 1. 常用指令

- **安裝依賴**：

  ```bash
  npm install
  # 或使用 bun（若本地環境已安裝）
  bun install
  ```

- **啟動本地開發伺服器**（預設埠 3000）：

  ```bash
  npm run dev
  # 等同於 tsx server.ts
  ```

- **型別檢查與語法驗證**：

  ```bash
  npm run lint
  # 等同於 tsc --noEmit
  ```

- **一行指令截圖**（建置並拍 5 個分頁與主要彈窗，手機／手機橫向／平板／電腦；`--tab`、`--viewport`、`--out` 可限縮）：

  ```bash
  npm run screenshot -- --tab swing --out screenshots
  ```

- **專案打包與生產建置**：

  ```bash
  npm run build
  # 執行 tsc 驗證並透過 Vite 輸出 dist/
  ```

---

## 2. 開發鐵律

1. **型別檢查零錯誤**：
   - 提交任何程式碼前，必須在終端執行 `npm run lint`（`tsc --noEmit`），確認完全無型別錯誤。
2. **敏感變數隔離**：
   - 嚴禁將 `GEMINI_API_KEY` 或 Firebase 私鑰等硬編碼（hardcode）於前端原始碼中。
   - 所有外部金鑰一律由環境變數注入並透過後端 `server.ts` 處理。
3. **組件單一職責**：
   - UI 呈現與 API 資料取得分離：資料獲取邏輯集中於 `src/services/`，UI 元件專注於呈現與使用者互動。
