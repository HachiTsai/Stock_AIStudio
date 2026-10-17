# Git 結構化提交流程規範

本專案的所有 Git 提交與推送操作一律透過 `.claude/skills/fin-commit/scripts/committer.py` 執行，遵循 [`.claude/skills/fin-commit/SKILL.md`](../skills/fin-commit/SKILL.md) 規格：

---

## 1. 標準提交步驟

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

## 2. 禁止事項

- **嚴禁使用未經驗證的提交**：禁止使用簡易的 `git commit -m` 傳遞隨意訊息，一律使用 `--message-file`。
- **嚴禁提交敏感資訊**：禁止提交 `.env`、API 金鑰（如 Gemini API Key）、Google 憑證等。
- **禁止破壞性指令**：未經使用者明確同意，禁止執行 `git reset --hard`、`git rebase` 或 `git push --force`。
