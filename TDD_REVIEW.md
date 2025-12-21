# Kent BeckのTDDに基づくテストカバレッジレビュー

## 📋 概要

このレビューは、Kent BeckのTest-Driven Development（TDD）の原則に基づいて、プロジェクトのテストカバレッジとユニットテストの品質を評価したものです。

## 🎯 TDDの主要原則

1. **テストファースト** - テストを先に書く
2. **Red-Green-Refactor** - 失敗→成功→リファクタリングのサイクル
3. **小さなステップ** - 一度に1つの機能をテスト
4. **テストは仕様書** - テストコードが仕様を表現
5. **単一責任** - 1つのテストは1つの概念をテスト
6. **高速フィードバック** - テストは高速に実行可能

## 📊 現状評価

### ✅ 良い点

1. **包括的な基本カバレッジ**
   - すべてのパブリックAPIにユニットテストが存在
   - 各パッケージに独立したテストスイート

2. **テストの独立性**
   - `beforeEach`を使用した適切なセットアップ
   - テスト間の依存関係なし

3. **モックの適切な使用**
   - vi.fn()を使用した関数のモック
   - 外部依存の適切な分離

4. **エラーハンドリングテスト**
   - ハッピーパスとエラーパスの両方をカバー
   - カスタムエラーハンドラのテスト

### ❌ 改善が必要な点

1. **エッジケースと境界値テストの不足**
   - 空配列、null、undefinedの扱い
   - 大量データの処理
   - 並行処理の境界条件

2. **テストの粒度が粗い**
   - 1つのテストで複数の概念を検証
   - アサーションが多すぎるテスト

3. **パラメータバリデーションの不足**
   - 不正な型の入力
   - 必須パラメータの欠落
   - 型安全性のランタイム検証

4. **テストインフラの不足**
   - カバレッジレポートの設定なし
   - テストヘルパー/ファクトリーの不足

## 🔍 パッケージ別の詳細レビュー

### 1. packages/core - WebhookRouter

**ファイル:** `packages/core/test/webhook-router.test.ts`

#### 欠けているテストケース

##### A. `on()` メソッド
```typescript
// ❌ テストされていない: 空配列を渡した場合
describe('on() with empty array', () => {
  it('should handle empty event array gracefully', () => {
    const router = new WebhookRouter();
    const handler = vi.fn();

    router.on([], handler);
    // 何も登録されないべき
  });
});

// ❌ テストされていない: 同じハンドラーを複数回登録
describe('on() with duplicate handlers', () => {
  it('should allow registering the same handler multiple times', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);
    router.on('test.event', handler);

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    // ハンドラーは2回呼ばれるべき
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

// ❌ テストされていない: イベント名のエッジケース
describe('on() with edge case event names', () => {
  it('should handle event names with special characters', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event.with.many.dots', handler);

    await router.dispatch({
      id: '1',
      type: 'test.event.with.many.dots',
      data: { object: {} }
    });

    expect(handler).toHaveBeenCalledOnce();
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

##### B. `dispatch()` メソッド
```typescript
// ❌ テストされていない: イベントオブジェクトの不正な構造
describe('dispatch() with invalid event structure', () => {
  it('should handle event without id field', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);

    // @ts-expect-error Testing runtime behavior
    await router.dispatch({ type: 'test.event', data: { object: {} } });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle event without data field', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);

    // @ts-expect-error Testing runtime behavior
    await router.dispatch({ id: '1', type: 'test.event' });

    expect(handler).toHaveBeenCalledOnce();
  });
});

// ❌ テストされていない: ハンドラーの実行順序
describe('dispatch() handler execution order', () => {
  it('should execute handlers in registration order', async () => {
    const router = new WebhookRouter();
    const order: number[] = [];

    const handler1 = vi.fn(async () => { order.push(1); });
    const handler2 = vi.fn(async () => { order.push(2); });
    const handler3 = vi.fn(async () => { order.push(3); });

    router.on('test.event', handler1);
    router.on('test.event', handler2);
    router.on('test.event', handler3);

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    expect(order).toEqual([1, 2, 3]);
  });
});

// ❌ テストされていない: ハンドラーのエラー伝播
describe('dispatch() error propagation', () => {
  it('should stop execution and propagate error when handler throws', async () => {
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
    // handler3は呼ばれないべき（handler2で停止）
    expect(handler3).not.toHaveBeenCalled();
  });
});
```

##### C. `use()` ミドルウェア
```typescript
// ❌ テストされていない: ミドルウェアでのエラーハンドリング
describe('use() error handling in middleware', () => {
  it('should propagate errors from middleware', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.use(async (_event, _next) => {
      throw new Error('Middleware error');
    });

    router.on('test.event', handler);

    await expect(
      router.dispatch({ id: '1', type: 'test.event', data: { object: {} } })
    ).rejects.toThrow('Middleware error');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should allow middleware to modify event', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.use(async (event, next) => {
      // ミドルウェアでイベントを変更
      (event as any).modified = true;
      await next();
    });

    router.on('test.event', handler);

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ modified: true })
    );
  });
});

// ❌ テストされていない: ミドルウェアの実行順序の詳細
describe('use() middleware execution with multiple handlers', () => {
  it('should wrap all handlers in middleware chain', async () => {
    const router = new WebhookRouter();
    const order: string[] = [];

    router.use(async (_event, next) => {
      order.push('middleware1-before');
      await next();
      order.push('middleware1-after');
    });

    const handler1 = vi.fn(async () => { order.push('handler1'); });
    const handler2 = vi.fn(async () => { order.push('handler2'); });

    router.on('test.event', handler1);
    router.on('test.event', handler2);

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    // ミドルウェアは全ハンドラーをラップする
    expect(order).toEqual([
      'middleware1-before',
      'handler1',
      'handler2',
      'middleware1-after'
    ]);
  });
});
```

##### D. `route()` ネストルーター
```typescript
// ❌ テストされていない: ネストの深さ
describe('route() deep nesting', () => {
  it('should support multiple levels of nesting', async () => {
    const router = new WebhookRouter();
    const level1 = new WebhookRouter();
    const level2 = new WebhookRouter();

    const handler = vi.fn().mockResolvedValue(undefined);
    level2.on('created', handler);

    level1.route('subscription', level2);
    router.route('customer', level1);

    await router.dispatch({
      id: '1',
      type: 'customer.subscription.created',
      data: { object: {} }
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle prefix with trailing dot', async () => {
    const router = new WebhookRouter();
    const nested = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    nested.on('created', handler);

    // 末尾にドットがある場合
    router.route('customer.', nested);

    // customer..created にマッチするか？
    await router.dispatch({
      id: '1',
      type: 'customer..created',
      data: { object: {} }
    });

    expect(handler).toHaveBeenCalledOnce();
  });
});

// ❌ テストされていない: ネストされたルーターのミドルウェア
describe('route() middleware interaction', () => {
  it('should not inherit middleware from nested router', async () => {
    const router = new WebhookRouter();
    const nested = new WebhookRouter();
    const nestedMiddleware = vi.fn(async (_event, next) => await next());

    nested.use(nestedMiddleware);
    nested.on('created', vi.fn().mockResolvedValue(undefined));

    router.route('customer', nested);

    await router.dispatch({
      id: '1',
      type: 'customer.created',
      data: { object: {} }
    });

    // ネストされたルーターのミドルウェアは実行されない（route()は handlers のみをコピー）
    expect(nestedMiddleware).not.toHaveBeenCalled();
  });
});
```

##### E. `group()` 構文
```typescript
// ❌ テストされていない: ネストされたグループ
describe('group() nested groups', () => {
  it('should support nested group syntax', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.group('customer', (customer) => {
      customer.group('subscription', (subscription) => {
        subscription.on('created', handler);
      });
    });

    await router.dispatch({
      id: '1',
      type: 'customer.subscription.created',
      data: { object: {} }
    });

    expect(handler).toHaveBeenCalledOnce();
  });
});
```

##### F. `fanout()` 並列ハンドラー
```typescript
// ❌ テストされていない: ハンドラーが0個の場合
describe('fanout() with zero handlers', () => {
  it('should handle empty handler array', async () => {
    const router = new WebhookRouter();

    router.fanout('test.event', []);

    await expect(
      router.dispatch({ id: '1', type: 'test.event', data: { object: {} } })
    ).resolves.toBeUndefined();
  });
});

// ❌ テストされていない: 1つのハンドラーの場合
describe('fanout() with single handler', () => {
  it('should work with single handler', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.fanout('test.event', [handler]);

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    expect(handler).toHaveBeenCalledOnce();
  });
});

// ❌ テストされていない: 複数エラーの処理
describe('fanout() multiple errors', () => {
  it('should handle multiple errors in all-or-nothing strategy', async () => {
    const router = new WebhookRouter();

    const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
    const handler2 = vi.fn().mockRejectedValue(new Error('Error 2'));
    const handler3 = vi.fn().mockResolvedValue(undefined);

    router.fanout('test.event', [handler1, handler2, handler3], {
      strategy: 'all-or-nothing',
    });

    await expect(
      router.dispatch({ id: '1', type: 'test.event', data: { object: {} } })
    ).rejects.toThrow();

    // すべてのハンドラーが並列実行される
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler3).toHaveBeenCalledOnce();
  });

  it('should collect all errors in best-effort strategy', async () => {
    const router = new WebhookRouter();
    const errors: Error[] = [];

    const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
    const handler2 = vi.fn().mockRejectedValue(new Error('Error 2'));
    const handler3 = vi.fn().mockResolvedValue(undefined);

    router.fanout('test.event', [handler1, handler2, handler3], {
      strategy: 'best-effort',
      onError: (error) => errors.push(error),
    });

    await router.dispatch({ id: '1', type: 'test.event', data: { object: {} } });

    expect(errors).toHaveLength(2);
    expect(errors[0]?.message).toBe('Error 1');
    expect(errors[1]?.message).toBe('Error 2');
  });
});

// ❌ テストされていない: onErrorのない best-effort
describe('fanout() best-effort without onError', () => {
  it('should not crash when onError is not provided', async () => {
    const router = new WebhookRouter();

    const handler1 = vi.fn().mockRejectedValue(new Error('Error 1'));
    const handler2 = vi.fn().mockResolvedValue(undefined);

    router.fanout('test.event', [handler1, handler2], {
      strategy: 'best-effort',
      // onError なし
    });

    await expect(
      router.dispatch({ id: '1', type: 'test.event', data: { object: {} } })
    ).resolves.toBeUndefined();
  });
});
```

### 2. packages/express - Express Adapter

**ファイル:** `packages/express/test/express-adapter.test.ts`

#### 欠けているテストケース

```typescript
// ❌ テストされていない: マルチバリューヘッダー
describe('expressAdapter with multi-value headers', () => {
  it('should use first value when header has multiple values', async () => {
    const mockReq = {
      body: Buffer.from('test'),
      headers: {
        'stripe-signature': ['sig1', 'sig2'], // 配列
      },
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockReturnValue({
      event: { id: '1', type: 'test', data: { object: {} } }
    });

    const middleware = expressAdapter(router, { verifier: mockVerifier });
    await middleware(mockReq as any, mockRes as any, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ 'stripe-signature': 'sig1' })
    );
  });
});

// ❌ テストされていない: 大きなペイロード
describe('expressAdapter with large payload', () => {
  it('should handle large request bodies', async () => {
    const largePayload = Buffer.alloc(10 * 1024 * 1024); // 10MB

    const mockReq = {
      body: largePayload,
      headers: { 'stripe-signature': 'test' },
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockReturnValue({
      event: { id: '1', type: 'test', data: { object: {} } }
    });

    const middleware = expressAdapter(router, { verifier: mockVerifier });
    await middleware(mockReq as any, mockRes as any, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(largePayload, expect.any(Object));
  });
});

// ❌ テストされていない: 非同期verifierのエラー
describe('expressAdapter with async verifier errors', () => {
  it('should handle async verifier that rejects', async () => {
    const mockReq = {
      body: Buffer.from('test'),
      headers: { 'stripe-signature': 'test' },
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockRejectedValue(new Error('Async verification failed'));

    const middleware = expressAdapter(router, { verifier: mockVerifier });
    await middleware(mockReq as any, mockRes as any, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Async verification failed' });
  });
});

// ❌ テストされていない: 特殊な文字を含むヘッダー
describe('expressAdapter with special header values', () => {
  it('should handle headers with unicode characters', async () => {
    const mockReq = {
      body: Buffer.from('test'),
      headers: {
        'stripe-signature': 'test',
        'x-custom-header': '日本語ヘッダー',
      },
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockReturnValue({
      event: { id: '1', type: 'test', data: { object: {} } }
    });

    const middleware = expressAdapter(router, { verifier: mockVerifier });
    await middleware(mockReq as any, mockRes as any, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ 'x-custom-header': '日本語ヘッダー' })
    );
  });
});
```

### 3. packages/stripe - Stripe Integration

**ファイル:** `packages/stripe/test/stripe-router.test.ts`

#### 欠けているテストケース

```typescript
// ❌ テストされていない: 型安全性の実際の動作確認
describe('StripeWebhookRouter type safety', () => {
  it('should infer correct event type for specific event', async () => {
    const router = new StripeWebhookRouter();

    router.on('payment_intent.succeeded', async (event) => {
      // 型推論のテスト - コンパイル時のチェック
      expectTypeOf(event.type).toEqualTypeOf<'payment_intent.succeeded'>();

      // data.object の型が正しく推論されているか
      // PaymentIntent型のプロパティにアクセスできるべき
      const amount = (event.data.object as any).amount;
      expect(typeof amount).toBe('number');
    });
  });
});

// ❌ テストされていない: createStripeVerifier の詳細な動作
describe('createStripeVerifier edge cases', () => {
  it('should handle empty payload', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected end of JSON input');
        }),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');

    expect(() => verifier('', { 'stripe-signature': 'test' })).toThrow();
  });

  it('should handle malformed JSON payload', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockImplementation(() => {
          throw new Error('Invalid JSON');
        }),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');

    expect(() => verifier('not json', { 'stripe-signature': 'test' })).toThrow('Invalid JSON');
  });

  it('should handle very long signature', () => {
    const mockStripe = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          id: '1',
          type: 'test',
          data: { object: {} }
        }),
      },
    } as unknown as Stripe;

    const verifier = createStripeVerifier(mockStripe, 'whsec_test');
    const longSignature = 'x'.repeat(10000);

    const result = verifier('{}', { 'stripe-signature': longSignature });

    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
      '{}',
      longSignature,
      'whsec_test'
    );
  });
});
```

### 4. packages/lambda - Lambda Adapter

**ファイル:** `packages/lambda/test/lambda-adapter.test.ts`

#### 欠けているテストケース

```typescript
// ❌ テストされていない: 不正なBase64エンコーディング
describe('lambdaAdapter with invalid base64', () => {
  it('should handle malformed base64 encoded body', async () => {
    const mockEvent = {
      body: 'not-valid-base64!!!',
      headers: { 'stripe-signature': 'test' },
      isBase64Encoded: true,
    };

    const mockContext = {} as Context;
    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockImplementation(() => {
      throw new Error('Invalid payload');
    });

    const handler = lambdaAdapter(router, { verifier: mockVerifier });
    const result = await handler(mockEvent as any, mockContext);

    expect(result.statusCode).toBe(400);
  });
});

// ❌ テストされていない: ヘッダーのケース正規化
describe('lambdaAdapter header normalization', () => {
  it('should normalize header keys to lowercase', async () => {
    const mockEvent = {
      body: 'test',
      headers: {
        'Stripe-Signature': 'test', // 大文字
        'X-Custom-Header': 'value',
      },
      isBase64Encoded: false,
    };

    const mockContext = {} as Context;
    const router = new WebhookRouter();
    const mockVerifier = vi.fn().mockReturnValue({
      event: { id: '1', type: 'test', data: { object: {} } }
    });

    const handler = lambdaAdapter(router, { verifier: mockVerifier });
    await handler(mockEvent as any, mockContext);

    expect(mockVerifier).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({
        'stripe-signature': 'test',
        'x-custom-header': 'value',
      })
    );
  });
});

// ❌ テストされていない: nullボディ vs undefinedボディ
describe('lambdaAdapter with null vs undefined body', () => {
  it('should handle null body', async () => {
    const mockEvent = {
      body: null,
      headers: {},
    };

    const mockContext = {} as Context;
    const router = new WebhookRouter();
    const mockVerifier = vi.fn();

    const handler = lambdaAdapter(router, { verifier: mockVerifier });
    const result = await handler(mockEvent as any, mockContext);

    expect(result.statusCode).toBe(400);
    expect(mockVerifier).not.toHaveBeenCalled();
  });

  it('should handle undefined body', async () => {
    const mockEvent = {
      body: undefined,
      headers: {},
    };

    const mockContext = {} as Context;
    const router = new WebhookRouter();
    const mockVerifier = vi.fn();

    const handler = lambdaAdapter(router, { verifier: mockVerifier });
    const result = await handler(mockEvent as any, mockContext);

    expect(result.statusCode).toBe(400);
    expect(mockVerifier).not.toHaveBeenCalled();
  });
});
```

### 5. packages/hono - Hono Adapter

**ファイル:** `packages/hono/test/hono-adapter.test.ts`

#### 欠けているテストケース

```typescript
// ❌ テストされていない: c.req.text() が空文字列を返す場合
describe('honoAdapter with empty body text', () => {
  it('should handle empty string from c.req.text()', async () => {
    const app = new Hono();
    const router = new WebhookRouter();
    const mockVerifier = vi.fn();

    app.post('/webhook', honoAdapter(router, { verifier: mockVerifier }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: '',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await app.request(req);

    expect(res.status).toBe(400);
    expect(mockVerifier).not.toHaveBeenCalled();
  });
});

// ❌ テストされていない: 非同期verifierのタイムアウト
describe('honoAdapter with slow verifier', () => {
  it('should handle slow async verifier', async () => {
    const app = new Hono();
    const router = new WebhookRouter();

    const slowVerifier = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { event: { id: '1', type: 'test', data: { object: {} } } };
    });

    app.post('/webhook', honoAdapter(router, { verifier: slowVerifier }));

    const req = new Request('http://localhost/webhook', {
      method: 'POST',
      body: 'test',
      headers: { 'stripe-signature': 'test' },
    });

    const res = await app.request(req);

    expect(res.status).toBe(200);
    expect(slowVerifier).toHaveBeenCalledOnce();
  });
});
```

### 6. packages/eventbridge - EventBridge Adapter

**ファイル:** `packages/eventbridge/test/eventbridge-adapter.test.ts`

#### 欠けているテストケース

```typescript
// ❌ テストされていない: detail フィールドが欠落
describe('eventBridgeAdapter with missing detail', () => {
  it('should handle event without detail field', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);

    const lambdaHandler = eventBridgeAdapter(router);

    const event = {
      version: '0',
      id: 'test',
      'detail-type': 'test',
      source: 'test',
      account: '123',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      // detail フィールドなし
    } as any;

    const mockContext = {} as Context;

    // undefinedをWebhookEventとしてdispatchしようとする
    await expect(
      lambdaHandler(event, mockContext)
    ).rejects.toThrow(); // または適切なエラーハンドリング
  });
});

// ❌ テストされていない: detailが不正な構造
describe('eventBridgeAdapter with invalid detail structure', () => {
  it('should handle detail without type field', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockResolvedValue(undefined);

    router.on('test.event', handler);

    const lambdaHandler = eventBridgeAdapter(router);

    const event = {
      version: '0',
      id: 'test',
      'detail-type': 'test',
      source: 'test',
      account: '123',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_123',
        // type フィールドなし
        data: { object: {} },
      },
    } as any;

    const mockContext = {} as Context;

    await lambdaHandler(event, mockContext);

    // ハンドラーは呼ばれないべき（typeが一致しない）
    expect(handler).not.toHaveBeenCalled();
  });
});

// ❌ テストされていない: 同期的なonError
describe('eventBridgeAdapter with synchronous onError', () => {
  it('should handle synchronous onError callback', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn(); // 同期的

    router.on('test.event', handler);

    const lambdaHandler = eventBridgeAdapter(router, { onError });

    const event = {
      version: '0',
      id: 'test',
      'detail-type': 'test',
      source: 'test',
      account: '123',
      time: '2021-01-01T00:00:00Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        id: 'evt_123',
        type: 'test.event',
        data: { object: {} },
      },
    } as any;

    const mockContext = {} as Context;

    await expect(lambdaHandler(event, mockContext)).rejects.toThrow('Handler error');
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'test.event' })
    );
  });
});
```

## 🎯 追加の推奨事項

### 1. テストヘルパーの作成

**ファイル:** `packages/core/test/helpers/test-helpers.ts`

```typescript
import type { WebhookEvent } from '../../src/index.js';

/**
 * テストイベントファクトリー
 */
export function createTestEvent(
  overrides: Partial<WebhookEvent> = {}
): WebhookEvent {
  return {
    id: 'evt_test_123',
    type: 'test.event',
    data: { object: {} },
    ...overrides,
  };
}

/**
 * 大量のイベントを生成
 */
export function createManyTestEvents(count: number): WebhookEvent[] {
  return Array.from({ length: count }, (_, i) => createTestEvent({
    id: `evt_${i}`,
  }));
}

/**
 * モックハンドラーのファクトリー
 */
export function createMockHandler(behavior: 'success' | 'error' | 'slow' = 'success') {
  const handler = vi.fn();

  switch (behavior) {
    case 'success':
      handler.mockResolvedValue(undefined);
      break;
    case 'error':
      handler.mockRejectedValue(new Error('Test error'));
      break;
    case 'slow':
      handler.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      break;
  }

  return handler;
}
```

### 2. カバレッジ設定の追加

**ファイル:** `vitest.config.ts` (rootに作成)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
```

**package.jsonに追加:**
```json
{
  "scripts": {
    "test:coverage": "pnpm -r test -- --coverage",
    "test:coverage:ui": "pnpm -r test -- --coverage --ui"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

### 3. Property-Based Testing の導入（推奨）

**インストール:**
```bash
pnpm add -D fast-check
```

**例:**
```typescript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WebhookRouter } from '../src/index.js';

describe('WebhookRouter property-based tests', () => {
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

  it('should handle arrays of any size', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), async (eventTypes) => {
        const router = new WebhookRouter();
        const handler = vi.fn().mockResolvedValue(undefined);

        router.on(eventTypes, handler);

        for (const eventType of eventTypes) {
          await router.dispatch({
            id: 'test',
            type: eventType,
            data: { object: {} },
          });
        }

        expect(handler).toHaveBeenCalledTimes(eventTypes.length);
      })
    );
  });
});
```

## 📈 優先順位

### 高優先度（すぐに実装すべき）

1. **エラー伝播のテスト** - dispatch()でのハンドラーエラーの動作
2. **境界値テスト** - 空配列、空文字列、nullなど
3. **カバレッジ設定** - 現在のカバレッジを可視化

### 中優先度（次のスプリントで）

1. **テストヘルパーの作成** - コードの重複削減
2. **エッジケースの追加** - 特殊文字、大きなペイロードなど
3. **並列処理のテスト** - fanout()の詳細な動作確認

### 低優先度（余裕があれば）

1. **Property-Based Testing** - ランダム入力での堅牢性確認
2. **パフォーマンステスト** - 大量イベント処理の性能確認
3. **統合テスト** - 実際のStripe/AWS環境でのE2Eテスト

## 🎓 TDDのベストプラクティス

### テスト作成時の心得

1. **AAA パターン** - Arrange（準備）、Act（実行）、Assert（検証）
2. **1つのテストで1つの概念** - テストを小さく保つ
3. **テスト名は仕様** - "should ..." 形式で明確に
4. **Given-When-Then** - 前提条件、実行、期待結果を明確に

### 例：良いテストの書き方

```typescript
describe('WebhookRouter', () => {
  describe('dispatch()', () => {
    describe('when handler throws an error', () => {
      it('should propagate the error and stop execution', async () => {
        // Given: ルーターに3つのハンドラーを登録、2番目がエラーを投げる
        const router = new WebhookRouter();
        const handler1 = vi.fn().mockResolvedValue(undefined);
        const handler2 = vi.fn().mockRejectedValue(new Error('Test error'));
        const handler3 = vi.fn().mockResolvedValue(undefined);

        router.on('test.event', handler1);
        router.on('test.event', handler2);
        router.on('test.event', handler3);

        // When: イベントをdispatch
        const event = createTestEvent({ type: 'test.event' });
        const promise = router.dispatch(event);

        // Then: エラーが伝播し、3番目のハンドラーは実行されない
        await expect(promise).rejects.toThrow('Test error');
        expect(handler1).toHaveBeenCalledOnce();
        expect(handler2).toHaveBeenCalledOnce();
        expect(handler3).not.toHaveBeenCalled();
      });
    });
  });
});
```

## 📝 まとめ

現在のテストは基本的な機能をカバーしていますが、**エッジケースと境界値のテストが不足**しています。
Kent BeckのTDDの原則に従い、以下を実践することを推奨します：

1. ✅ **小さなステップで** - 1つずつエッジケースを追加
2. ✅ **Red-Green-Refactor** - 失敗するテストを書き、実装し、リファクタリング
3. ✅ **テストファースト** - 新機能は常にテストから
4. ✅ **継続的な改善** - カバレッジを徐々に向上

このレビューで指摘したテストケースを追加することで、コードの堅牢性が大幅に向上します。
