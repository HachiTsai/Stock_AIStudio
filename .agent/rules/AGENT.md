# Antigravity 專案導引與 `.claude/` 單一真實來源規範

本檔案為 Antigravity 唯一入口規則，旨在將所有專案規則、技能（Skills）與設定統一收斂至 **`.claude/`** 目錄下管理，避免維護兩套重複檔案。

---

## 1. 單一真實來源（Single Source of Truth）鐵律

1. **所有實體設定一律集中於 `.claude/`**：
   - 模組化規則庫統一存放於 `.claude/rules/*.md`。
   - 技能與自動化腳本統一存放於 `.claude/skills/`（如 `fin-commit`、`markdown-linter`）。
2. **採用 Claude Code 官方語法編寫**：
   - 新增或修改任何 Rule、Skill（`SKILL.md`）或設定時，一律遵循 **Claude 官方原生語法與目錄結構**編寫於 `.claude/` 下。
   - 新增 `.claude/rules/<name>.md` 時，必須同步將引用加入根目錄 `CLAUDE.md` 與本檔案（`.agent/rules/AGENT.md`）第 2 節清單中。
3. **先驗證、後提交（Test & Lint Before Commit）**：
   - 任何前端與伺服器 TypeScript 變更，在提交前必須先通過 `npm run lint`（`tsc --noEmit`）驗證無誤。
   - 任何 Python 腳本或技能變更，必須使用 Conda 環境 `ai-it-go` 執行 `pytest` 測試。
   - 確認檢查通過後，才可透過 `.claude/skills/fin-commit/scripts/committer.py` 執行結構化 Commit 與 Push。

---

## 2. 專案規則與技能自動載入（指向 `.claude/`）

- **專案總覽入口**：@[CLAUDE.md](../../CLAUDE.md)
- **核心資料庫防護規範**：@[.claude/rules/core-database-protection.md](../../.claude/rules/core-database-protection.md)
- **應用程式架構規範**：@[.claude/rules/app-architecture.md](../../.claude/rules/app-architecture.md)
- **Web 開發工作流規範**：@[.claude/rules/web-development-workflow.md](../../.claude/rules/web-development-workflow.md)
- **Python 執行環境規範**：@[.claude/rules/python-environment.md](../../.claude/rules/python-environment.md)
- **Git 結構化提交流程規範**：@[.claude/rules/git-commit-workflow.md](../../.claude/rules/git-commit-workflow.md)
- **Git 提交流程 Skill**：@[.claude/skills/fin-commit/SKILL.md](../../.claude/skills/fin-commit/SKILL.md)
- **Markdown Linter Skill**：@[.claude/skills/markdown-linter/SKILL.md](../../.claude/skills/markdown-linter/SKILL.md)
