# Stock_AIStudio 開發與環境規範

本專案為投資追蹤儀表板 Web 應用程式（前端 React 19 + 後端 Express + Vite + Gemini API + Three.js）。

專案以 **`.claude/`** 為唯一真實來源（Single Source of Truth），所有通用規則與技能皆採用 Claude 官方語法集中於 `.claude/rules/` 與 `.claude/skills/` 管理（Antigravity 則透過 `.agent/rules/AGENT.md` 自動載入）：

- **核心資料庫防護規範**：@[.claude/rules/core-database-protection.md](.claude/rules/core-database-protection.md)
- **應用程式架構規範**：@[.claude/rules/app-architecture.md](.claude/rules/app-architecture.md)
- **Web 開發工作流規範**：@[.claude/rules/web-development-workflow.md](.claude/rules/web-development-workflow.md)
- **Python 執行環境規範**：@[.claude/rules/python-environment.md](.claude/rules/python-environment.md)
- **Git 結構化提交流程規範**：@[.claude/rules/git-commit-workflow.md](.claude/rules/git-commit-workflow.md)
- **Markdown 格式檢查技能**：@[.claude/skills/markdown-linter/SKILL.md](.claude/skills/markdown-linter/SKILL.md)

---

## 開發、擴充與提交鐵律

1. **擴充規則與技能**：新增任何規則或技能時，請以 Claude 官方原生語法直接建立於 `.claude/rules/<rule-name>.md` 或 `.claude/skills/<skill-name>/`，並同步更新本檔與 `.agent/rules/AGENT.md` 的引用清單。
2. **⛔ 嚴禁修改 Investment_Tracker_Core**：試算表為唯讀資料來源，禁止任何寫入、修改欄位或公式之操作。
3. **驗證通過主動自動 Commit**：
   - 任何 TypeScript 變更必須先通過 `npm run lint`（`tsc --noEmit`）型別檢查；Python 變更必須於 Conda `ai-it-go` 環境通過 `pytest` 測試。
   - 使用者指示 commit 或任務完成時，Agent 必須主動調用 `.claude/skills/fin-commit` 技能完成全自動結構化提交與推送，不逐次詢問確認。
4. **分支與 PR 鐵律**：所有變更一律在分支上進行並向 `main` 發起 Pull Request，禁止直接 push 到 `main` 分支；CI 全綠後採 Merge Commit 合併。
5. **改畫面後先跑截圖腳本**：變更 `src/` 任何畫面後，先執行 `npm run screenshot -- --tab <分頁>` 確認手機、平板、電腦版面，再 commit；截圖慣例放 `/mnt/project-files/app-preview/`。
