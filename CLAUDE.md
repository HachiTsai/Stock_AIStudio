# Stock_AIStudio 開發與環境規範

本專案為投資追蹤儀表板 Web 應用程式（前端 React 19 + 後端 Express + Vite + Gemini API + Three.js）。

專案以 **`.claude/`** 為唯一真實來源（Single Source of Truth），所有通用規則與技能皆採用 Claude 官方語法集中於 `.claude/rules/` 與 `.claude/skills/` 管理（Antigravity 則透過 `.agent/rules/AGENT.md` 自動載入）：

- **核心資料庫防護規範**：@[.claude/rules/core-database-protection.md](.claude/rules/core-database-protection.md)
- **應用程式架構規範**：@[.claude/rules/app-architecture.md](.claude/rules/app-architecture.md)
- **Web 開發工作流規範**：@[.claude/rules/web-development-workflow.md](.claude/rules/web-development-workflow.md)
- **Python 執行環境規範**：@[.claude/rules/python-environment.md](.claude/rules/python-environment.md)
- **Git 結構化提交流程規範**：@[.claude/rules/git-commit-workflow.md](.claude/rules/git-commit-workflow.md)

---

## 開發、擴充與提交鐵律

1. **擴充規則與技能**：新增任何規則或技能時，請以 Claude 官方原生語法直接建立於 `.claude/rules/<rule-name>.md` 或 `.claude/skills/<skill-name>/`，並同步更新本檔與 `.agent/rules/AGENT.md` 的引用清單。
2. **⛔ 嚴禁修改 Investment_Tracker_Core**：試算表為唯讀資料來源，禁止任何寫入、修改欄位或公式之操作。
3. **驗證通過才可 Commit**：
   - 任何 TypeScript 變更必須先通過 `npm run lint`（`tsc --noEmit`）型別檢查。
   - 任何 Python 腳本或技能變更，必須使用 Conda 環境 `ai-it-go` 執行 `pytest` 測試通過。
   - 提交一律透過 `.claude/skills/fin-commit/scripts/committer.py` 執行結構化 Commit 與 Push。
