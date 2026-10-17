# Python 執行環境與 `pyproject.toml` 規範

本專案核心為 TypeScript Full-Stack Web 應用程式（React 19 + Express + Vite + Tailwind），**主體應用程式相依套件全數由 `package.json`（Bun / npm）管理**。
專案內建之輔助工具、Git 提交流程腳本與品質測試工具皆以 Python 撰寫，其環境與測試工具配置由根目錄 `pyproject.toml` 管理。

---

## 1. 執行環境選擇

- **本機環境（macOS / Antigravity）**：
  - 統一使用 Conda 環境 **`ai-it-go`**（Python 3.14，直譯器路徑：`/opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/python`）。
  - 執行任何 Python 腳本、測試（`pytest`）或 linter 時，優先指定該環境直譯器執行：

    ```bash
    /opt/homebrew/Caskroom/miniforge/base/envs/ai-it-go/bin/python -m pytest -q .claude/skills
    ```

- **環境維持原則**：
  - 本專案的所有 Python 操作皆維持在 `ai-it-go` 環境中執行，避免跨環境造成套件版本衝突。

---

## 2. 依賴管理原則與單一來源

- **應用層依賴 vs. 工具層依賴**：
  - **應用程式主體（Web App / Frontend / Backend）**：相依套件**一律使用 `package.json`**（使用 `bun add` 或 `npm install` 管理），與 Python 無涉。
  - **輔助工具與測試（Python）**：統一以根目錄 **`pyproject.toml`** 為單一依賴來源。
- **禁止只安裝不記錄**：若專案的 Python 工具新增任何第三方套件時，**嚴禁**只執行 `pip install <pkg>` 或手動安裝而不更新設定檔。一律優先使用 **`uv add <pkg>`**（或手動登記於 `pyproject.toml`）。
- **工具腳本以標準函式庫為原則**：`.claude/skills/` 內的所有自動化工具，以使用 Python 標準函式庫為原則，避免額外的環境相依。
- **規則檔與設定檔必須完全一致**：下方第 3 節收錄了標準 `pyproject.toml` 完整內容。當透過 `uv add <pkg>` 或手動更新 `pyproject.toml` 時，**必須同步更新本檔案下方區塊**。`committer.py` 提交時會自動進行 AST 掃描與雙向比對攔截。

---

## 3. 標準 `pyproject.toml` 內容（須與專案根目錄保持一致）

```toml
[project]
name = "stock-aistudio"
version = "0.1.0"
description = "個人投資追蹤儀表板 Web 應用程式之本機 Python 輔助工具設定"
readme = "README.md"
requires-python = ">=3.14"
dependencies = [
    # 本機測試與品質工具（Web App 主體套件由 package.json 管理）
    "pytest>=8.0.0",
    "ruff>=0.17.0",
]

[tool.pytest.ini_options]
testpaths = [".claude/skills"]

[tool.ruff]
line-length = 120
target-version = "py314"

[tool.ruff.lint]
select = ["E", "F", "W"]
ignore = ["E501", "E741"]
```

---

## 4. 專案內 Python 工具與測試

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
