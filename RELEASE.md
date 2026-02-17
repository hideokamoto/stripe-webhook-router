# リリースガイド

Tayori のモノレポは **Changesets** を使った自動リリースフローを採用しています。

## リリースフロー概要

```
開発
  ↓
pnpm changeset で変更内容を記述
  ↓
PR を merge
  ↓
changesets/action が自動で "Version Packages" PR を作成
  ↓
"Version Packages" PR を merge
  ↓
CI が自動で npm に publish
```

---

## ステップバイステップ

### 1. PR 作成時

変更をコードに加えた後、以下を実行します：

```bash
pnpm changeset
```

対話形式で以下を指定します：

- **どのパッケージが変更されたか** - パッケージを選択（複数選択可能）
- **バージョン種別** - `patch`, `minor`, `major` から選択
- **変更内容の説明** - CHANGELOG に記載される内容

すると `.changeset/*.md` ファイルが生成されます。例：

```markdown
# .changeset/pink-dogs-look.md

---
"@tayori/core": minor
"@tayori/stripe": patch
---

Added support for custom error handlers in event routing
```

このファイルも一緒に `git add` して PR に含めてください。

```bash
git add .
git commit -m "feat: add custom error handlers"
git push
```

### 2. main へのマージ後（自動）

main ブランチに PR が merge されると、GitHub Actions が自動的に以下を行います：

1. **"Version Packages" PR の作成/更新** - 未消化の `.changeset/*.md` ファイルをスキャン
2. **バージョン番号の更新** - `package.json` を更新
3. **CHANGELOG の生成** - 各パッケージの `CHANGELOG.md` を自動生成

この PR が作成されたら、内容を確認してマージしてください。

### 3. Version PR のマージ（自動 publish）

"Version Packages" PR を main に merge すると、GitHub Actions が自動的に以下を実行します：

```bash
pnpm build          # すべてのパッケージをビルド
changeset publish   # npm registry に publish
```

publish が完了すると、タグが自動作成されます。

---

## ローカルでの手動リリース

CI 環境以外でリリースしたい場合（テスト目的など）：

### バージョン更新とビルド

```bash
# package.json とCHANGELOG.md を更新
pnpm changeset:version

# 確認して commit
git diff
git add .
git commit -m "chore: version packages"
```

### NPM への Publish

```bash
# ビルド → publish
pnpm changeset:publish
```

**注意**: ローカルから publish する場合、npm の認証が必要です。

```bash
npm adduser
# または
npm login
```

---

## 必要な GitHub Secrets

npm へ publish するには以下の Secret が必要です：

| Secret 名 | 説明 |
|-----------|------|
| `NPM_TOKEN` | npmjs.com の Access Token（publish 権限が必要） |

GitHub リポジトリの **Settings > Secrets and variables > Actions** から追加してください。

**Access Token の作成方法:**

1. https://www.npmjs.com/settings/~/tokens にアクセス
2. "Generate New Token" → "Granular Access Token"
3. Expiration: 適切な期間（推奨: 1年以上）
4. Permissions:
   - Publish packages
   - Access public packages
5. Select packages: 対象のパッケージを選択（`@tayori/*` など）

---

## トラブルシューティング

### "Version Packages" PR が作成されない

- `.changeset/*.md` ファイルが commit されていないか確認
- ファイルが存在する場合、GitHub Actions の実行ログを確認

### Publish が失敗する

- `NPM_TOKEN` が有効か確認
- Token の権限が sufficient か確認（publish 権限が必要）
- `pnpm build` が通っているか確認

### 特定のパッケージだけ publish したくない

`.changeset/config.json` の `ignore` 配列にパッケージ名を追加してください：

```json
{
  "ignore": ["@tayori/internal-only"]
}
```

---

## 参考リンク

- [Changesets - Getting Started](https://github.com/changesets/changesets/blob/main/docs/intro-to-changesets.md)
- [Changesets GitHub Action](https://github.com/changesets/action)
- [pnpm Monorepo](https://pnpm.io/workspaces)
