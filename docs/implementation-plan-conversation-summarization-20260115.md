# Implementation Plan: Conversation Summarization Feature

**Date**: 2026-01-15
**Feature**: AI-powered conversation summarization before saving to Obsidian
**Status**: Planning Phase

---

## 1. 目的・背景

### 背景
- 現在、長い会話内容をそのままObsidianに保存しようとすると、URIの長さ制限により保存できない問題がある
- ユーザーは長い会話を簡潔にまとめてから保存したいというニーズがある

### 目的
- AIを使って会話内容を自動的に要約する機能を提供
- 要約結果をプレビューで確認してから保存できる仕組みを実装
- キーワードリンク機能と統合し、重要なキーワードにObsidianリンクを自動付与

---

## 2. 影響範囲

### 新規ファイル
- `/src/app/api/summarize/route.ts` - 要約APIエンドポイント（新規作成）

### 変更対象ファイル
- `/src/types/api.ts` - 型定義追加
- `/src/components/ObsidianSaveButton.tsx` - 要約機能統合

### 依存関係
- Anthropic Claude API（既存のAPI keyを再利用）
- 既存のキーワード抽出API (`/api/extract-keywords`)
- 既存のプレビューモーダル (`ObsidianPreviewModal`)

---

## 3. 実装手順

### Phase 1: 型定義の追加

**ファイル**: `/src/types/api.ts`

**追加内容**:
```typescript
// Summarize API
export interface SummarizeRequest {
  content: string;
  maxLength?: number; // デフォルト: 1000文字
}

export interface SummarizeResponse {
  summary: string;
  originalLength: number;
  summaryLength: number;
}
```

**実装理由**:
- APIの入出力を明確に型定義
- `maxLength`をオプションにすることで柔軟性を確保
- メタデータ（元の長さ、要約後の長さ）を返すことでUI側で判断可能に

---

### Phase 2: 要約APIエンドポイントの実装

**ファイル**: `/src/app/api/summarize/route.ts`

**実装内容**:

1. **システムプロンプトの設計**:
```typescript
const SUMMARIZE_SYSTEM_PROMPT = `あなたはビジネスアイデアの会話を要約する専門家です。
以下のルールに従って会話を要約してください。

【要約のルール】
1. 重要なビジネスアイデアのポイントを抽出
2. 議論された課題と解決策を明確にまとめる
3. アクションアイテムがあれば箇条書きで列挙
4. 重要なキーワードには[[キーワード]]の形式でObsidianリンクを付ける
5. 指定された最大文字数以内に収める（デフォルト1000文字）
6. 会話の流れを時系列で整理

【出力フォーマット】
## 概要
（全体の要約を2-3文で）

## 主要なポイント
- ポイント1
- ポイント2
- ポイント3

## 課題と解決策
- 課題: XXX → 解決策: YYY

## アクションアイテム
- [ ] タスク1
- [ ] タスク2

## キーワード
[[キーワード1]] [[キーワード2]] [[キーワード3]]
`;
```

2. **エラーハンドリング**:
- API key未設定時のエラー処理
- リクエストバリデーション
- Claude API呼び出し失敗時のフォールバック

3. **デモモード対応**:
- 環境変数`DEMO_MODE`が`true`の場合、モックレスポンスを返す
- 既存の`/api/claude/route.ts`と同様の実装パターン

**実装コード概要**:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SummarizeRequest, SummarizeResponse, ErrorResponse } from '@/types/api';

export async function POST(req: NextRequest) {
  try {
    const isDemoMode = !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === 'true';
    const body: SummarizeRequest = await req.json();

    // バリデーション
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    const maxLength = body.maxLength || 1000;
    const originalLength = body.content.length;

    if (isDemoMode) {
      // デモレスポンス
      const demoSummary = `## 概要
ビジネスアイデアについての対話を行いました。

## 主要なポイント
- [[ターゲット市場]]の明確化
- [[競合優位性]]の検討
- [[収益モデル]]の設計

## アクションアイテム
- [ ] [[MVP]]の作成
- [ ] 市場調査の実施`;

      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        summary: demoSummary,
        originalLength,
        summaryLength: demoSummary.length,
      } as SummarizeResponse);
    }

    // Claude API呼び出し
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Sonnetモデルを使用（コスト最適化）
      max_tokens: 2048,
      temperature: 0.3, // ✅ 一貫性のある要約生成
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `以下の会話を${maxLength}文字以内に要約してください：\n\n${body.content}`,
        },
      ],
    });

    const summary = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return NextResponse.json({
      summary,
      originalLength,
      summaryLength: summary.length,
    } as SummarizeResponse);

  } catch (error) {
    console.error('Summarize API Error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize content' } as ErrorResponse,
      { status: 500 }
    );
  }
}
```

**注意点**:
- Claude Sonnetモデルを使用（要約タスクには十分な性能、Opusよりコスト効率が良い）
- `max_tokens: 2048`で要約が1000文字程度になるよう調整
- エラー時は既存の`/api/claude/route.ts`と同じパターンでハンドリング

---

### Phase 3: ObsidianSaveButton.tsx の修正

**ファイル**: `/src/components/ObsidianSaveButton.tsx`

**変更内容**:

1. **状態管理の追加**:
```typescript
const [showSummarizeOption, setShowSummarizeOption] = useState(false);
const [isSummarizing, setIsSummarizing] = useState(false);
const [summarizedContent, setSummarizedContent] = useState<string | null>(null);
```

2. **要約処理関数の追加**:
```typescript
const handleSummarize = async () => {
  setIsSummarizing(true);
  setMessage({ text: '会話を要約中...', type: null });

  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        maxLength: 1000,
      } satisfies SummarizeRequest),
    });

    if (!response.ok) {
      throw new Error('要約に失敗しました');
    }

    const data: SummarizeResponse = await response.json();
    
    // ✅ 重要: キーワード抽出APIは呼ばない（要約時に既にリンク付き）
    setProcessedContent(data.summary);
    setSaveType('obsidian'); // または 'download'
    setIsPreviewOpen(true);
    setMessage(null);

  } catch (error) {
    // ✅ 改善: エラー時のフォールバックオプション表示
    setMessage({
      text: error instanceof Error ? error.message : '要約に失敗しました',
      type: 'error',
    });
    // エラー時は要約なしでダウンロードを提案
    setShowSummarizeOption(false);
    setShowOptions(true); // オプションメニューを開く
  } finally {
    setIsSummarizing(false);
  }
};
```

3. **UI変更**:

**変更箇所1**: 長いコンテンツの検出と要約提案（改善版）
```typescript
// ✅ 改善: 実際のURI長に基づく判定
const checkIfContentNeedssSummarization = (content: string): boolean => {
  const date = new Date().toISOString().split('T')[0];
  const fullFileName = `${fileName}-${date}.md`;
  const testResult = generateObsidianUri(vault, fullFileName, content);
  
  // URI生成時に切り詰められた場合、要約が必要
  return testResult.truncated;
};

const handlePrepareContent = async (type: 'obsidian' | 'download') => {
  if (!content.trim()) {
    setMessage({
      text: type === 'obsidian' ? '保存する内容がありません' : 'ダウンロードする内容がありません',
      type: 'error'
    });
    return;
  }

  // ✅ Obsidian保存の場合のみ要約チェック
  if (type === 'obsidian') {
    const needsSummarization = checkIfContentNeedssSummarization(content);
    
    if (needsSummarization) {
      // 要約確認ダイアログを表示
      setShowSummarizeOption(true);
      setMessage({
        text: `コンテンツが長すぎてObsidianに直接保存できません（${content.length}文字）`,
        type: 'warning',
      });
      return;
    }
  }

  // ✅ 既存の処理（キーワード抽出 → プレビュー）
  setIsSaving(true);
  setSaveType(type);
  setMessage({ text: 'キーワードを抽出中...', type: null });

  try {
    const processed = await processWithKeywordLinks(content);
    setProcessedContent(processed);
    setIsPreviewOpen(true);
    setMessage(null);
  } catch (err) {
    setMessage({
      text: err instanceof Error ? err.message : 'キーワード処理に失敗しました',
      type: 'error',
    });
  } finally {
    setIsSaving(false);
  }
};
```

**変更箇所2**: オプションメニューに「要約して保存」ボタンを追加
```typescript
<AnimatePresence>
  {showOptions && (
    <motion.div>
      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        {/* 新規追加: 要約ボタン */}
        <button
          onClick={handleSummarize}
          disabled={isEmpty || isSummarizing}
          className={`
            w-full px-4 py-2 rounded-md font-medium text-sm
            transition-colors
            ${isEmpty || isSummarizing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
            }
          `}
        >
          {isSummarizing ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              要約中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              AIで要約して保存
            </span>
          )}
        </button>

        {/* 既存のダウンロードボタン */}
        <button onClick={handleDownloadMarkdown} ...>
          ...
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**変更箇所3**: 要約確認ダイアログ（長いコンテンツ検出時）
```typescript
<AnimatePresence>
  {showSummarizeOption && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3"
    >
      <p className="text-sm text-yellow-800 font-medium">
        コンテンツが長いため、Obsidianに直接保存できない可能性があります。
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSummarize}
          disabled={isSummarizing}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          要約して保存
        </button>
        <button
          onClick={handleDownloadMarkdown}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          ダウンロード
        </button>
        <button
          onClick={() => setShowSummarizeOption(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          キャンセル
        </button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**統合フロー**:
1. ユーザーが「Obsidianに保存」ボタンをクリック
2. コンテンツの長さをチェック（3000文字以上）
3. 長い場合:
   - 要約提案ダイアログを表示
   - 「要約して保存」 → `/api/summarize`呼び出し → プレビュー表示
   - 「ダウンロード」 → 既存のダウンロード処理
4. 短い場合:
   - 既存の処理（キーワード抽出 → プレビュー表示）

---

## 4. リスク・懸念事項

### リスク1: API呼び出しの二重化
- **問題**: 要約API + キーワード抽出APIの2回呼び出し
- **影響**: レスポンス時間の増加、コスト増加
- **対策**:
  - ✅ **要約APIのシステムプロンプトにキーワードリンク生成を統合**
  - ✅ 要約後は`processWithKeywordLinks`を呼ばない
  - ✅ 通常の保存フローでのみキーワード抽出APIを使用

### リスク2: 要約品質の一貫性
- **問題**: 毎回異なる要約結果になる可能性
- **影響**: ユーザー体験の低下
- **対策**:
  - ✅ 明確なシステムプロンプトと出力フォーマット指定
  - ✅ **CRITICAL**: `temperature: 0.3`を必ずClaude API呼び出しに追加
  - ✅ 具体的な実装箇所: `client.messages.create({ temperature: 0.3, ... })`

### リスク3: 長すぎる要約
- **問題**: 1000文字制限を超える要約が生成される
- **影響**: URI長制限に引っかかる
- **対策**:
  - ✅ システムプロンプトで「**絶対に${maxLength}文字以内**」と強調
  - ✅ API応答で`summary.length > maxLength`の場合、警告フラグを返す
  - ✅ フロントエンド側で警告時は「要約が長すぎます。ダウンロードしてください」と表示
  - ✅ **NEW**: 超過時の自動リトライ機能（最大2回まで、より短い制限で再試行）

### リスク4: 既存機能への影響
- **問題**: `ObsidianSaveButton.tsx`の複雑化
- **影響**: バグの混入、保守性の低下
- **対策**:
  - ✅ 既存の`handlePrepareContent`ロジックは変更せず、新しい分岐を追加
  - ✅ 要約機能はオプショナルな機能として実装
  - ✅ 既存のテストケースがパスすることを確認

### リスク5: 要約失敗時のユーザー体験（NEW）
- **問題**: 要約APIが失敗した場合、ユーザーは保存できなくなる
- **影響**: フラストレーション、データ損失の可能性
- **対策**:
  - ✅ **フォールバックフロー実装**:
    1. 要約失敗時、エラーメッセージとともに3つの選択肢を提示
    2. 「元のまま保存（ダウンロード）」
    3. 「再試行」
    4. 「キャンセル」
  - ✅ エラー状態でも常に保存パスが存在することを保証

---

## 5. テスト計画

### ユニットテスト
- [ ] `/api/summarize`エンドポイントのテスト
  - [ ] 正常系: 有効なコンテンツでの要約
  - [ ] 異常系: 空コンテンツ
  - [ ] 異常系: APIキー未設定
  - [ ] デモモードの動作確認

### 統合テスト
- [ ] ObsidianSaveButtonの要約機能テスト
  - [ ] 短いコンテンツ（3000文字未満）→ 要約提案なし
  - [ ] 長いコンテンツ（3000文字以上）→ 要約提案表示
  - [ ] 要約実行 → プレビュー表示
  - [ ] プレビューから保存 → Obsidian URI生成
  - [ ] キャンセル動作

### E2Eテスト
- [ ] 実際の会話履歴を使った要約テスト
  - [ ] 5000文字の会話 → 1000文字以内の要約
  - [ ] キーワードリンクの正しい生成
  - [ ] Obsidianでの表示確認

### パフォーマンステスト
- [ ] API応答時間の計測（目標: 5秒以内）
- [ ] 10,000文字のコンテンツでのテスト

---

## 6. ロールバック手順

### 問題発生時の切り戻し手順

1. **要約APIに問題がある場合**:
   ```bash
   # route.tsを削除
   rm src/app/api/summarize/route.ts
   ```

2. **ObsidianSaveButtonに問題がある場合**:
   ```bash
   # Gitで以前のバージョンに戻す
   git checkout HEAD~1 src/components/ObsidianSaveButton.tsx
   ```

3. **型定義に問題がある場合**:
   ```bash
   # api.tsから追加した型を削除
   # SummarizeRequest, SummarizeResponse の定義を削除
   ```

### ロールバック後の確認項目
- [ ] 既存の保存機能が正常動作
- [ ] ビルドエラーがない
- [ ] TypeScriptの型エラーがない

---

## 7. 実装スケジュール

### Phase 1: 型定義（5分）
- `types/api.ts`への型追加

### Phase 2: 要約API実装（30分）
- `/api/summarize/route.ts`の作成
- システムプロンプトの調整
- エラーハンドリング
- デモモード実装

### Phase 3: UI統合（45分）
- `ObsidianSaveButton.tsx`の修正
- 要約ボタンの追加
- フロー制御の実装
- スタイリング調整

### Phase 4: テスト（30分）
- 動作確認
- エッジケーステスト
- パフォーマンス確認

**合計**: 約110分（2時間弱）

---

## 8. 成功基準

- [ ] 3000文字以上のコンテンツで要約提案が表示される
- [ ] 要約APIが5秒以内に応答する
- [ ] 要約結果が1000文字以内に収まる
- [ ] 要約内容にObsidianリンク（[[キーワード]]）が含まれる
- [ ] プレビューモーダルで要約結果を確認できる
- [ ] 既存の保存機能に影響がない
- [ ] デモモードで正常動作する
- [ ] エラーハンドリングが適切に機能する

---

## 9. 追加検討事項

### 将来的な拡張可能性

1. **カスタマイズ可能な要約スタイル**:
   - 箇条書き中心 vs 段落形式
   - 技術詳細重視 vs ビジネス視点重視

2. **要約履歴の保存**:
   - 同じ会話の複数バージョンの要約を保存
   - バージョン比較機能

3. **要約長の動的調整**:
   - ユーザーがスライダーで要約の長さを指定可能

4. **マルチ言語対応**:
   - 日本語以外の会話の要約対応

---

## 10. 依存ライブラリ

既存のライブラリを使用、新規追加なし:
- `@anthropic-ai/sdk` - 既存
- `framer-motion` - 既存
- `next` - 既存

---

## 11. 環境変数

新規追加なし、既存のものを使用:
- `ANTHROPIC_API_KEY` - 既存
- `DEMO_MODE` - 既存（オプション）

---

## レビューチェックリスト

この計画書を以下の観点でレビューすること:

- [x] 要件の漏れはないか → **要件充足確認済み**
- [x] 影響範囲は正確に特定されているか → **3ファイルのみ、既存機能への影響最小化**
- [x] 手順に曖昧な箇所はないか → **各Phaseで具体的なコード例を提示**
- [x] エッジケースは考慮されているか → **長すぎる要約、API失敗などを考慮**
- [x] 既存コードとの整合性は取れているか → **既存パターンを踏襲**
- [x] エラーハンドリングは適切か → **try-catchとユーザーフィードバック + フォールバック**
- [x] テストケースは十分か → **ユニット・統合・E2E・パフォーマンステスト**

## Think Harder レビュー結果（Opus実施済み）

### 主要な改善点

1. **✅ Temperature パラメータ追加** - `temperature: 0.3`を明示的に追加
2. **✅ キーワード抽出の二重呼び出し防止** - 要約時はキーワード抽出APIを呼ばない
3. **✅ URI長の動的チェック** - 3000文字の固定値ではなく、実際のURI生成結果で判定
4. **✅ エラー時のフォールバック強化** - 要約失敗時も保存パスを提供
5. **✅ 要約長超過時のリトライ** - 自動で短い制限で再試行

### 実装上の注意点

**CRITICAL**:
- `handleSummarize`内で`processWithKeywordLinks`を呼ばないこと
- `temperature: 0.3`を忘れずに設定すること
- URI長チェックは`generateObsidianUri`の結果を使うこと
- エラー時は必ずダウンロードオプションを表示すること

---

**次のステップ**: Opusモデルによる「Think Harder」レビューを実施
