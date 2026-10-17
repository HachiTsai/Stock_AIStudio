# Python 執行環境規範

本專案雖然主體為 TypeScript Web 應用程式，但專案內建之輔助工具、Git 提交流程腳本與品質測試工具皆以 Python 撰寫。

---

## 1. 執行環境選擇

- **本機環境（macOS / Antigravity）**：
  - 統一使用 Conda 環境 **`ai-it-go`**（Python 3.14，直譯器路徑：`/opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/python`）。
  - 執行任何 Python 腳本、測試（`pytest`）或 linter 時，優先指定該環境直譯器執行。
- **環境維持原則**：
  - 本專案的所有 Python 操作皆維持在 `ai-it-go` 環境中執行，避免跨環境造成套件版本衝突。

---

## 2. 專案內 Python 工具與測試

- **提交流程（`fin-commit`）**：
  - 核心腳本：`.claude/skills/fin-commit/scripts/committer.py`
  - 測試執行：

    ```bash
    /opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/pytest -q .claude/skills/fin-commit/tests
    ```

- **Markdown 語法檢查（`markdown-linter`）**：
  - 核心腳本：`.claude/skills/markdown-linter/scripts/mdlint.py`
  - 測試執行：

    ```bash
    /opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/pytest -q .claude/skills/markdown-linter/tests
    ```

- **全技能快速驗證**：

  ```bash
  /opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/pytest -q .claude/skills
  ```
