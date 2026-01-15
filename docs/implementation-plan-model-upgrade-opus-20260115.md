# Implementation Plan: Claude Model Upgrade to Opus 4.5

**Date**: 2026-01-15  
**Author**: System (via CLAUDE.md workflow)  
**Status**: Draft - Pending Review

## 1. 目的・背景

### 目的
Claude Sonnet 4からClaude Opus 4.5へのモデルアップグレードを実施し、より高品質な会話体験を提供する。

### 背景
- 現在のモデル: `claude-sonnet-4-20250514`
- 新しいモデル: `claude-opus-4-5-20251101`
- Opus 4.5は最新のフロンティアモデルで、より深い推論と高品質な応答が期待できる

## 2. 影響範囲

### 変更対象ファイル

1. **`src/app/api/claude/route.ts`** (実装コード)
   - Line 81: デフォルトモデル名の変更
   - 影響を受けるシンボル: `POST` 関数内の `client.messages.create` 呼び出し

2. **`docs/implementation-plan-responsive-demo-mode-20260115.md`** (ドキュメント)
   - Line 289: 環境変数例の更新

### 影響を受けるコンポーネント
- Claude API呼び出し処理
- 環境変数設定（オプション）

### 影響を受けないコンポーネント
- フロントエンドUI
- デモモード機能
- セッション管理
- エラーハンドリング

## 3. 実装手順

### Step 1: コードの変更
```typescript
// Before
model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',

// After
model: process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101',
```

**実行方法**: `replace_content` ツールを使用
- file: `src/app/api/claude/route.ts`
- mode: `literal`
- needle: `'claude-sonnet-4-20250514'`
- repl: `'claude-opus-4-5-20251101'`

### Step 2: ドキュメントの更新
```markdown
// Before
CLAUDE_MODEL=claude-sonnet-4-20250514

// After
CLAUDE_MODEL=claude-opus-4-5-20251101
```

**実行方法**: `replace_content` ツールを使用
- file: `docs/implementation-plan-responsive-demo-mode-20260115.md`
- mode: `literal`
- needle: `claude-sonnet-4-20250514`
- repl: `claude-opus-4-5-20251101`

### Step 3: ビルド実行
```bash
cd /home/noritakasawada/project/20260115/business-idea-ai
npm run build
```

**検証ポイント**:
- ビルドエラーがないこと
- TypeScriptの型チェックが通ること

### Step 4: Git操作
```bash
git add .
git commit -m "feat: Claude Opus 4.5に変更

- モデルをclaude-sonnet-4からclaude-opus-4-5-20251101に変更
- より高品質な会話体験を提供

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

## 4. 依存関係

### 前提条件
- `@anthropic-ai/sdk` がOpus 4.5をサポートしていること（確認済み）
- API keyが有効であること

### 順序依存
1. コード変更 → ビルド → Git操作（順序固定）

## 5. リスク・懸念事項

### リスク分析

#### リスク1: モデル名のタイポ
- **影響度**: 高
- **対策**: リテラル文字列検索で完全一致を確認
- **検証**: ビルド時のTypeScript検証

#### リスク2: API料金の変動
- **影響度**: 中
- **対策**: Opusモデルは料金が高い可能性があるため、本番環境では環境変数でSonnetに戻すことも可能
- **注意**: デフォルト値の変更だが、`.env`で`CLAUDE_MODEL`を設定すれば上書き可能

#### リスク3: 既存の会話セッションへの影響
- **影響度**: 低
- **理由**: セッションIDは保持され、新規メッセージから新モデルが適用される
- **注意**: 同一セッション内でモデルが混在する可能性あり

#### リスク4: レスポンス速度の変化
- **影響度**: 中
- **対策**: Opusは処理時間が長い可能性。UI側でローディング表示が適切に機能するか確認

### エッジケース

1. **環境変数`CLAUDE_MODEL`が設定済みの場合**
   - 動作: 環境変数が優先されるため、コード変更の影響なし
   - 対策: 特になし（期待動作）

2. **デモモード時の動作**
   - 影響: なし（デモモードではAPIを呼び出さない）
   - 確認: 不要

## 6. テスト計画

### ビルドテスト
- [x] `npm run build` が成功すること
- [x] TypeScript型エラーがないこと
- [x] 警告がないこと

### 手動テスト（オプション - 本番環境確認時）
- [ ] API keyを設定してサーバー起動
- [ ] 実際にメッセージを送信し、Opus 4.5で応答が返ること
- [ ] エラーハンドリングが正常に機能すること

### 回帰テスト
- [ ] デモモードが正常に動作すること
- [ ] エラーケース（401, 429, 500）が適切に処理されること

## 7. ロールバック手順

### 問題発生時の対処

#### パターン1: ビルドエラー
```bash
git reset --hard HEAD~1
npm run build
```

#### パターン2: API呼び出しエラー（本番環境）
```bash
# 環境変数で即座に戻す
export CLAUDE_MODEL=claude-sonnet-4-20250514
# または.envファイルを編集
```

#### パターン3: Git push後の問題
```bash
git revert HEAD
git push
```

## 8. 完了条件

- [x] `route.ts` のモデル名が変更されている
- [x] ドキュメントのモデル名が変更されている
- [x] `npm run build` が成功している
- [x] Gitコミット・プッシュが完了している
- [ ] （オプション）実際のAPI呼び出しテストが成功している

## 9. 補足情報

### モデル仕様比較

| 項目 | Sonnet 4 | Opus 4.5 |
|------|----------|----------|
| モデルID | claude-sonnet-4-20250514 | claude-opus-4-5-20251101 |
| 推論能力 | 高 | 最高 |
| 応答速度 | 速い | やや遅い可能性 |
| コスト | 標準 | 高い |

### 注意事項
- この変更はデフォルト値の変更であり、環境変数で動的に制御可能
- 本番環境でコストが懸念される場合は`.env`で`CLAUDE_MODEL=claude-sonnet-4-20250514`を設定
