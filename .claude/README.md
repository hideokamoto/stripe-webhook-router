# Claude Code Settings

このディレクトリには、Claude Code on the webでの動作を制御する設定ファイルが含まれています。

## 📋 ファイル構成

- `settings.json` - プロジェクト共通の設定（Git管理対象）
- `settings.local.json` - 個人用の設定（Gitignore対象）
- `settings.local.json.template` - ローカル設定のテンプレート

## 🎯 現在の設定内容

### SessionStart Hook
セッション開始時に以下を実行：
- pnpm installで依存関係をインストール

### PreToolUse Hook (Bash)
`git commit`コマンド実行前に以下を自動実行：
1. **Lint** - `pnpm lint`
2. **Typecheck** - `pnpm typecheck`
3. **Test** - `pnpm test`

これにより、Claude Codeがgit commitを実行する前に必ずチェックが実行され、コミット前の抜け漏れを防ぎます。チェックが失敗した場合、コミットは実行されません。

## 🔧 カスタマイズ方法

個人的な設定を追加したい場合：

```bash
cp settings.local.json.template settings.local.json
```

`settings.local.json`を編集して、独自のhooksを追加できます。

## 📚 参考リンク

- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks-guide)
- [Settings.json Schema](https://json.schemastore.org/claude-code-settings.json)

## ⚠️ 注意事項

- `settings.json` はチーム全体で共有される設定です
- `settings.local.json` は個人用設定で、Gitには含まれません
- Hooks内のコマンドは同期的に実行されます（長時間かかるコマンドは避けてください）
