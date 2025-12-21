# TDD改善 実装ガイド

このガイドでは、Kent BeckのTDD原則に基づいたテストカバレッジ改善の実装手順を説明します。

## 📋 目次

1. [はじめに](#はじめに)
2. [セットアップ](#セットアップ)
3. [段階的な実装](#段階的な実装)
4. [テストの実行](#テストの実行)
5. [継続的な改善](#継続的な改善)

## はじめに

このプロジェクトのテストカバレッジを改善するために、以下のファイルが追加されました：

- `TDD_REVIEW.md` - 詳細なテストカバレッジレビュー
- `vitest.config.ts` - カバレッジ設定
- `packages/core/test/webhook-router.edge-cases.test.ts` - エッジケーステスト
- `packages/core/test/helpers/test-helpers.ts` - テストヘルパー
- `packages/express/test/express-adapter.edge-cases.test.ts` - Expressアダプターのエッジケース

## セットアップ

### 1. 依存関係のインストール

```bash
# カバレッジツールのインストール
pnpm add -D @vitest/coverage-v8 @vitest/ui

# (オプション) Property-Based Testingツール
pnpm add -D fast-check
```

### 2. package.json スクリプトの追加

ルートの `package.json` に以下を追加：

```json
{
  "scripts": {
    "test": "pnpm -r test",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --coverage --ui",
    "test:watch": "vitest",
    "test:edge-cases": "vitest run --testNamePattern='Edge Cases'"
  }
}
```

### 3. カバレッジの初回実行

```bash
# 現在のカバレッジを確認
pnpm test:coverage

# インタラクティブなUIで確認
pnpm test:coverage:ui
```

## 段階的な実装

### Phase 1: 高優先度（Week 1-2）

#### 1.1 エラー伝播のテスト

`packages/core/test/webhook-router.test.ts` に追加：

```typescript
describe('dispatch() error propagation', () => {
  it('should stop execution when handler throws', async () => {
    const router = new WebhookRouter();
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockRejectedValue(new Error('Test error'));
    const handler3 = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler1);
    router.on('test.event', handler2);
    router.on('test.event', handler3);

    await expect(
      router.dispatch({ id: '1', type: 'test.event', data: { object: {} } })
    ).rejects.toThrow('Test error');

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler3).not.toHaveBeenCalled();
  });
});
```

**チェックリスト:**
- [ ] テストを書く (Red)
- [ ] 実装を確認/修正 (Green)
- [ ] コードをリファクタリング (Refactor)
- [ ] カバレッジを確認

#### 1.2 境界値テスト

既存のテストファイルに追加：

```typescript
describe('on() with edge cases', () => {
  it('should handle empty array', () => {
    const router = new WebhookRouter();
    router.on([], vi.fn());
    // Should not throw
  });

  it('should handle empty string event name', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('', handler);
    await router.dispatch({ id: '1', type: '', data: { object: {} } });

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

**チェックリスト:**
- [ ] 空配列のテスト
- [ ] 空文字列のテスト
- [ ] null/undefinedのテスト
- [ ] カバレッジを確認

#### 1.3 カバレッジ可視化

```bash
# カバレッジレポートを生成
pnpm test:coverage

# HTMLレポートを開く
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**目標:**
- カバレッジベースラインの確立
- 未カバー領域の特定
- 優先順位の決定

### Phase 2: 中優先度（Week 3-4）

#### 2.1 テストヘルパーの導入

既存のテストを`test-helpers.ts`を使ってリファクタリング：

**Before:**
```typescript
const testEvent = {
  id: 'evt_123',
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_123' } },
};
```

**After:**
```typescript
import { createTestEvent } from './helpers/test-helpers.js';

const testEvent = createTestEvent({
  type: 'payment_intent.succeeded',
});
```

**チェックリスト:**
- [ ] `test-helpers.ts` をすべてのテストで使用
- [ ] 重複コードを削減
- [ ] テストの可読性を向上

#### 2.2 アダプターのエッジケーステスト

各アダプター（Express、Hono、Lambda、EventBridge）に対して：

```typescript
// packages/{adapter}/test/{adapter}-adapter.edge-cases.test.ts
describe('{Adapter} - Edge Cases', () => {
  // 大きなペイロード
  // 特殊文字
  // 並行リクエスト
  // エラーハンドリング
});
```

**チェックリスト:**
- [ ] Express アダプター
- [ ] Hono アダプター
- [ ] Lambda アダプター
- [ ] EventBridge アダプター

### Phase 3: 低優先度（Week 5+）

#### 3.1 Property-Based Testing

```typescript
import * as fc from 'fast-check';

describe('WebhookRouter property tests', () => {
  it('should handle any string as event type', () => {
    fc.assert(
      fc.property(fc.string(), async (eventType) => {
        const router = new WebhookRouter();
        const handler = vi.fn().mockResolvedValue(undefined);

        router.on(eventType, handler);
        await router.dispatch({
          id: 'test',
          type: eventType,
          data: { object: {} },
        });

        expect(handler).toHaveBeenCalledOnce();
      })
    );
  });
});
```

#### 3.2 パフォーマンステスト

```typescript
import { measureExecutionTime } from './helpers/test-helpers.js';

describe('Performance tests', () => {
  it('should handle 1000 events in under 1 second', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);

    const { duration } = await measureExecutionTime(async () => {
      for (let i = 0; i < 1000; i++) {
        await router.dispatch({
          id: `evt_${i}`,
          type: 'test.event',
          data: { object: {} },
        });
      }
    });

    expect(duration).toBeLessThan(1000);
  });
});
```

## テストの実行

### 基本的なコマンド

```bash
# すべてのテストを実行
pnpm test

# ウォッチモードで実行
pnpm test:watch

# カバレッジ付きで実行
pnpm test:coverage

# 特定のパッケージのみ
pnpm --filter @tayori/core test

# 特定のテストファイルのみ
pnpm vitest packages/core/test/webhook-router.edge-cases.test.ts

# エッジケースのみ
pnpm test:edge-cases
```

### カバレッジレポートの確認

```bash
# カバレッジレポートを生成して開く
pnpm test:coverage
open coverage/index.html

# または、UIモードで
pnpm test:coverage:ui
```

### CI/CDでの実行

`.github/workflows/test.yml` に追加：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Check coverage thresholds
        run: |
          if [ -f coverage/coverage-summary.json ]; then
            echo "Coverage thresholds met!"
          fi
```

## 継続的な改善

### 週次チェックリスト

- [ ] カバレッジレポートを確認
- [ ] 新しいエッジケースを追加
- [ ] テストヘルパーを拡張
- [ ] フレークテストを修正

### 月次レビュー

- [ ] カバレッジトレンドを分析
- [ ] テストスイートのパフォーマンスを確認
- [ ] テストの重複を削除
- [ ] ドキュメントを更新

### TDDベストプラクティスチェックリスト

新しい機能を追加する際：

- [ ] テストを先に書く（Red）
- [ ] 最小限の実装で通す（Green）
- [ ] リファクタリング（Refactor）
- [ ] エッジケースを考慮
- [ ] カバレッジを確認

### コードレビューチェックリスト

PRレビュー時：

- [ ] 新しいコードにテストがあるか
- [ ] エッジケースがカバーされているか
- [ ] テストが独立しているか
- [ ] テスト名が明確か
- [ ] カバレッジが低下していないか

## トラブルシューティング

### カバレッジが上がらない

```bash
# 詳細なカバレッジレポートを確認
pnpm test:coverage -- --reporter=verbose

# 特定のファイルのカバレッジを確認
pnpm vitest --coverage --reporter=verbose packages/core/src/index.ts
```

### テストが遅い

```typescript
// vi.useFakeTimers() を使用
import { vi } from 'vitest';

describe('slow tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle delays', async () => {
    const promise = someAsyncFunction();
    await vi.runAllTimersAsync();
    await promise;
  });
});
```

### テストがフレークする

```typescript
// リトライを追加
import { describe, it, expect } from 'vitest';

it('flaky test', { retry: 3 }, async () => {
  // テストコード
});
```

## 参考リンク

- [Kent Beck - Test-Driven Development: By Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Vitest Documentation](https://vitest.dev/)
- [Property-Based Testing with fast-check](https://github.com/dubzzz/fast-check)
- [TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

## まとめ

このガイドに従って段階的にテストを改善していくことで、コードの品質と信頼性が大幅に向上します。
Kent BeckのTDD原則を守りながら、継続的に改善していきましょう。

**次のステップ:**
1. `pnpm install` で依存関係をインストール
2. `pnpm test:coverage` で現在のカバレッジを確認
3. Phase 1 の高優先度タスクから開始
4. 毎週進捗を確認しながら進める

Happy Testing! 🧪
