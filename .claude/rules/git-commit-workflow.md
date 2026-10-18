# Git 結構化提交流程規範

本專案的所有 Git 提交與推送操作一律透過 `.claude/skills/fin-commit/scripts/committer.py` 執行，遵循 [`.claude/skills/fin-commit/SKILL.md`](../skills/fin-commit/SKILL.md) 規格：

---

## 1. 分支與 PR 鐵律

1. **先開 PR 再合併 `main`**：
   - 所有變更（包括功能開發、UI 調整、文件與規範）都在指定的分支上 commit 並推送，向 `main` 發起 Pull Request。
   - PR 的 CI（`markdown-lint`、`skill-tests`、`app-build`）全綠後才可合併，失敗需立刻修正。
   - **禁止直接 push 到 `main` 分支**。
2. **合併方式一律採用 Merge Commit**：
   - 不使用 squash、不使用 rebase，保留分支上每個 commit 的完整訊息與歷程，便於以 `git log --grep` 追溯歷史決策。

---

## 2. Agent 自動提交流程原則（Auto-Commit with Skill）

- **主動調用技能**：當使用者指示「commit」、「提交」或當前階段任務完成時，Agent **必須主動調用 `fin-commit` 技能自動完成提交**，不得等待或反覆向使用者確認 commit message 細節。
- **自主判定與撰寫**：
  - 類別（Category）、Type 與 Scope 由 Agent 依 staged diff 與規格書自動判定。
  - Commit Message 內容由 Agent 自主依規格書 §4 模板草擬並寫入 `.git/COMMIT_MSG_TEMP`。
  - 僅當涉及交易/股利而缺少必要數字（股數、價格、金額、手續費）時才需向使用者詢問，其餘一律自主完成。
- **全自動端到端流程（模式 B：全自動持續交付制）**：
  1. 建立或切換至獨立分支（`git checkout -b <branch-name>`）。
  2. 執行前置驗證（`npm run lint`、`pytest`、`mdlint.py`、`npm run build`）。
  3. 透過 `committer.py` 暫存並提交至 `.git/COMMIT_MSG_TEMP`。
  4. 推送分支至遠端並透過 `gh pr create` 發起 Pull Request。
  5. 監看 GitHub Actions CI 狀態；確認全綠（All checks passed）後，Agent 自動以標準 Merge Commit（`gh pr merge <id> --merge --delete-branch`）合入 `main`。
  6. 切回 `main` 並執行 `git pull` 保持最新同步，一氣呵成回報閉環結果。

---

## 3. 標準提交步驟

1. **暫存與檢查**：

   ```bash
   python3 .claude/skills/fin-commit/scripts/committer.py --stage-list <paths...>
   # 或若暫存全目錄
   python3 .claude/skills/fin-commit/scripts/committer.py
   ```

   檢查 staged diff、敏感檔案（`.env`、`*.key`、憑證）與 Markdown 規範。

2. **草擬與提交**：
   依腳本輸出指引將符合規格的 Commit Message 寫入 `.git/COMMIT_MSG_TEMP`，再執行：

   ```bash
   python3 .claude/skills/fin-commit/scripts/committer.py --no-stage --message-file .git/COMMIT_MSG_TEMP
   ```

---

## 4. 安全防護與依賴防呆

- **敏感檔案攔截**：暫存區若包含 `.env*`、憑證私鑰、`credentials.json` 等檔案，腳本將自動中止並阻擋提交（可加 `--allow-sensitive` 解除）。
- **Python 依賴與規則同步攔截**：AST 自動分析暫存 Python 檔的 `import` 是否登記於 `pyproject.toml`，並驗證 `pyproject.toml` 與 `.claude/rules/python-environment.md` 是否 100% 同步（可加 `--allow-missing-deps` 略過）。

---

## 5. 禁止事項

- **嚴禁使用未經驗證的提交**：禁止使用簡易的 `git commit -m` 傳遞隨意訊息，一律使用 `--message-file`。
- **嚴禁直接 push 到 `main`**：一律由 PR 經 CI 驗證通過後合併。
- **嚴禁提交敏感資訊**：禁止提交 `.env`、API 金鑰（如 Gemini API Key）、Google 憑證等。
- **禁止破壞性指令**：未經使用者明確同意，禁止執行 `git reset --hard`、`git rebase` 或 `git push --force`。
