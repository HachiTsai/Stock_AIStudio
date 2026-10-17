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

## 2. 標準提交步驟

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

## 3. 安全防護與依賴防呆

- **敏感檔案攔截**：暫存區若包含 `.env*`、憑證私鑰、`credentials.json` 等檔案，腳本將自動中止並阻擋提交（可加 `--allow-sensitive` 解除）。
- **Python 依賴與規則同步攔截**：AST 自動分析暫存 Python 檔的 `import` 是否登記於 `pyproject.toml`，並驗證 `pyproject.toml` 與 `.claude/rules/python-environment.md` 是否 100% 同步（可加 `--allow-missing-deps` 略過）。

---

## 4. 禁止事項

- **嚴禁使用未經驗證的提交**：禁止使用簡易的 `git commit -m` 傳遞隨意訊息，一律使用 `--message-file`。
- **嚴禁直接 push 到 `main`**：一律由 PR 經 CI 驗證通過後合併。
- **嚴禁提交敏感資訊**：禁止提交 `.env`、API 金鑰（如 Gemini API Key）、Google 憑證等。
- **禁止破壞性指令**：未經使用者明確同意，禁止執行 `git reset --hard`、`git rebase` 或 `git push --force`。
