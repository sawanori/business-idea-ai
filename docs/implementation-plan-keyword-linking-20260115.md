# Implementation Plan: Obsidian Keyword Auto-Linking Feature

**Date:** 2026-01-15
**Feature:** AI-powered keyword detection and linking for Obsidian notes
**Status:** Planning Phase

## 目的・背景

### 課題
現在、Obsidianへの保存時に会話内容がそのまま保存されるため、重要なキーワード（ビジネス用語、固有名詞、概念など）が平文のままとなっている。Obsidianのリンク機能を活用するには、手動で`[[キーワード]]`形式に変換する必要があり、手間がかかる。

### 目的
会話内容を保存する際に、AIが自動的に重要なキーワードを検出し、`[[キーワード]]`形式のリンクを付与することで、Obsidianのナレッジベース構築を効率化する。

### 期待される効果
- Obsidianでの知識の繋がりが自動的に形成される
- 後からキーワードで検索・参照しやすくなる
- ビジネスアイデアに関連する概念の整理が容易になる

## 影響範囲

### 新規作成ファイル
1. `/home/noritakasawada/project/20260115/business-idea-ai/src/app/api/extract-keywords/route.ts`
   - Claude APIを使用したキーワード抽出エンドポイント
   - リクエスト/レスポンスの型定義

### 変更対象ファイル
1. `/home/noritakasawada/project/20260115/business-idea-ai/src/lib/obsidian.ts`
   - `processWithKeywordLinks()` 関数の追加
   - キーワードリンク処理のロジック

2. `/home/noritakasawada/project/20260115/business-idea-ai/src/components/ObsidianSaveButton.tsx`
   - 保存処理フローへのキーワード処理の統合
   - ローディング状態の管理

3. `/home/noritakasawada/project/20260115/business-idea-ai/src/types/api.ts`
   - 新しいAPIエンドポイント用の型定義追加

### 依存関係
- 既存の `@anthropic-ai/sdk` パッケージを使用（追加インストール不要）
- 既存の Claude API route (`/api/claude/route.ts`) の実装パターンを踏襲
- 環境変数 `ANTHROPIC_API_KEY` が必要（既存）

## 実装手順

### Step 1: 型定義の追加
**ファイル:** `/home/noritakasawada/project/20260115/business-idea-ai/src/types/api.ts`

**作業内容:**
```typescript
// 既存の型定義に追加
export interface ExtractKeywordsRequest {
  content: string;
}

export interface ExtractKeywordsResponse {
  processedContent: string;
  // keywords配列は将来の拡張用（現時点では未実装）
  // keywords?: string[];
}
```

**理由:** 型安全性の確保とAPIインターフェースの明確化
**Note:** keywords配列は現時点では実装しないため、オプショナルまたはコメントアウト

### Step 2: キーワード抽出APIエンドポイントの作成
**ファイル:** `/home/noritakasawada/project/20260115/business-idea-ai/src/app/api/extract-keywords/route.ts`

**作業内容:**
1. Claude APIクライアントの初期化（既存パターンを踏襲）
2. システムプロンプトの定義
3. POSTハンドラーの実装
4. エラーハンドリング

**システムプロンプト設計:**
```
あなたはビジネス文書の分析専門家です。
以下の会話内容から、Obsidianでリンクにすべき重要なキーワードを特定し、
それらを[[キーワード]]形式に変換してください。

【リンク対象のキーワード】
- ビジネス用語（SaaS、B2B、MVP、KPI、ROI、PLG など）
- 固有名詞（会社名、サービス名、人名など）
- 重要な概念（ビジネスモデル、収益モデル、ターゲット層、課題、価値提案など）
- アクションアイテム（タスク、TODO、施策など）
- 技術用語・フレームワーク名
- **日本語のキーワードも英語のキーワードも同様に処理してください**

【除外すべき単語】
- 一般的すぎる単語（「これ」「それ」「もの」「こと」「する」「ある」など）
- 助詞・助動詞・接続詞
- 1文字のみの単語
- 「です」「ます」などの丁寧語

【ルール】
1. 同じキーワードが複数回出現する場合、全てにリンクを付ける
2. 元の文章構造・改行・空行は厳密に維持する
3. 既に[[]]で囲まれているキーワードはそのまま維持する（重複しない）
4. リンクにするかどうか迷った場合は、リンクにする方を選ぶ
5. Markdown記法（#見出し、- リストなど）はそのまま維持する

【出力形式】
元の文章と同じ形式で、キーワードを[[]]で囲んだMarkdownのみを返してください。
説明や追加コメント、「以下の通りです」などの前置きは一切不要です。
処理後のMarkdownのみを出力してください。
```

**API仕様:**
- エンドポイント: `POST /api/extract-keywords`
- リクエスト: `{ content: string }`
- レスポンス: `{ processedContent: string }`
  - Note: `keywords` 配列は現時点では実装しない（将来の拡張用に型定義のみ残すか、型から削除）

**デモモード実装:**
デモモード時（`!process.env.ANTHROPIC_API_KEY` または `process.env.DEMO_MODE === 'true'`）は、
以下の正規表現ベースの簡易キーワード検出を実装:

```typescript
// デモモード用の簡易キーワードリンク処理
const demoKeywords = [
  'SaaS', 'B2B', 'B2C', 'MVP', 'KPI', 'ROI', 'PLG',
  'ビジネスモデル', '収益モデル', 'ターゲット層', '課題', '価値提案',
  '中小企業', '大企業', 'スタートアップ',
  '業務効率化', 'DX', 'デジタル化'
];

function processKeywordsInDemoMode(content: string): string {
  let processed = content;
  for (const keyword of demoKeywords) {
    // 既に[[]]で囲まれていないキーワードのみリンク化
    const regex = new RegExp(`(?<!\\[\\[)\\b(${keyword})\\b(?!\\]\\])`, 'g');
    processed = processed.replace(regex, '[[$1]]');
  }
  return processed;
}
```

**エラーハンドリング:**
- API Key未設定の場合: デモモードで処理
- Claude API呼び出し失敗: 500エラー
- 空のコンテンツ: 元のコンテンツをそのまま返す（400エラーは出さない）

**参考実装:** `/home/noritakasawada/project/20260115/business-idea-ai/src/app/api/claude/route.ts`

### Step 3: obsidian.ts にキーワード処理関数を追加
**ファイル:** `/home/noritakasawada/project/20260115/business-idea-ai/src/lib/obsidian.ts`

**作業内容:**
1. `processWithKeywordLinks()` 関数の実装
2. フェッチエラーハンドリング
3. 型安全性の確保

**実装:**
```typescript
/**
 * AIを使って会話内容から重要なキーワードを抽出し、[[リンク]]を付ける
 * @param content 元のMarkdown内容
 * @returns [[キーワード]]形式のリンクが付いたMarkdown
 */
export async function processWithKeywordLinks(content: string): Promise<string> {
  if (!content.trim()) {
    return content;
  }

  try {
    const response = await fetch('/api/extract-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      console.error('Failed to process keywords:', response.statusText);
      // エラー時は元のコンテンツをそのまま返す（フォールバック）
      return content;
    }

    const data = await response.json();
    return data.processedContent;
  } catch (error) {
    console.error('Error processing keywords:', error);
    // エラー時は元のコンテンツをそのまま返す（フォールバック）
    return content;
  }
}
```

**設計判断:**
- エラー時は元のコンテンツを返す（保存失敗よりも、リンクなしでの保存を優先）
- クライアントサイドからのフェッチなので、環境変数は使わない

### Step 4: ObsidianSaveButton.tsx の修正
**ファイル:** `/home/noritakasawada/project/20260115/business-idea-ai/src/components/ObsidianSaveButton.tsx`

**変更箇所:** `handleSaveToObsidian` 関数

**作業内容:**
1. インポートの追加: `processWithKeywordLinks`
2. 保存フロー内でキーワード処理を呼び出し
3. ローディング状態の管理（キーワード処理中も表示）
4. エラーハンドリング

**修正内容:**
```typescript
// インポート追加
import {
  generateObsidianUri,
  openObsidianUri,
  downloadAsMarkdown,
  getDefaultVaultName,
  processWithKeywordLinks  // 追加
} from '@/lib/obsidian';

// handleSaveToObsidian 内の処理を修正
const handleSaveToObsidian = async () => {
  if (!content.trim()) {
    setMessage({ text: '保存する内容がありません', type: 'error' });
    return;
  }

  if (!vault) {
    setMessage({ text: 'Vault名が設定されていません', type: 'error' });
    setShowOptions(true);
    return;
  }

  setIsSaving(true);
  setMessage({ text: 'キーワードを抽出中...', type: null });

  try {
    // ステップ1: キーワードリンク処理
    const processedContent = await processWithKeywordLinks(content);

    // ステップ2: Obsidian URI生成と保存
    const date = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}-${date}.md`;
    const result = generateObsidianUri(vault, fullFileName, processedContent);

    if (result.truncated) {
      setMessage({
        text: `内容が長すぎます（${result.originalLength}文字）。代わりにMarkdownファイルをダウンロードしてください。`,
        type: 'warning',
      });
      setShowOptions(true);
    } else {
      openObsidianUri(result.uri);
      setMessage({ text: 'Obsidianで開きました', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }
  } catch (err) {
    setMessage({
      text: err instanceof Error ? err.message : '保存に失敗しました',
      type: 'error',
    });
  } finally {
    setIsSaving(false);
  }
};
```

**注意点:**
- `processWithKeywordLinks` は非同期なので、`await` で待つ
- エラー時は既存のエラーハンドリングでキャッチされる
- `isSaving` 状態がキーワード処理中もtrueのまま

### Step 5: ダウンロード機能にもキーワード処理を追加
**ファイル:** `/home/noritakasawada/project/20260115/business-idea-ai/src/components/ObsidianSaveButton.tsx`

**変更箇所:** `handleDownloadMarkdown` 関数

**修正内容:**
```typescript
const handleDownloadMarkdown = async () => {
  if (!content.trim()) {
    setMessage({ text: 'ダウンロードする内容がありません', type: 'error' });
    return;
  }

  try {
    // キーワードリンク処理を追加
    const processedContent = await processWithKeywordLinks(content);

    const date = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}-${date}`;
    downloadAsMarkdown(fullFileName, processedContent);
    setMessage({ text: 'ダウンロードしました', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  } catch (err) {
    setMessage({
      text: err instanceof Error ? err.message : 'ダウンロードに失敗しました',
      type: 'error',
    });
  }
};
```

**理由:** ダウンロード経由での保存でも同様にキーワードリンクが必要

## レビューで発見された重要な問題点

### 1. デモモード対応の欠如 (CRITICAL)
**問題:** 既存の `/api/claude` エンドポイントにはデモモード機能があるが、計画に含まれていない
**影響:** API Key未設定環境でアプリが動作しない
**修正:**
- Step 2 のAPIエンドポイント実装にデモモード処理を追加
- デモモード時は簡易的なキーワードリンク処理（正規表現ベース）を実装
- `process.env.DEMO_MODE === 'true'` または `!process.env.ANTHROPIC_API_KEY` の場合に適用

### 2. 進捗フィードバックの不足
**問題:** キーワード処理中とURI生成中の区別がつかない
**影響:** ユーザーが何が起きているか分からず、不安を感じる可能性
**修正:**
- ObsidianSaveButton に処理ステータスメッセージを追加
- `message` 状態に "キーワードを抽出中..." を追加

### 3. 日本語処理の明示的指定なし
**問題:** システムプロンプトに日本語での処理指示がない
**影響:** 英語キーワードのみがリンクされる可能性
**修正:**
- システムプロンプトに「日本語のキーワードも同様に処理」を明記

### 4. keywords配列の未実装
**問題:** レスポンス型に `keywords: string[]` が定義されているが、実装計画に含まれていない
**影響:** 型とランタイムの不一致、将来のデバッグ困難
**修正:**
- API実装でキーワードリストも抽出して返すか、型定義から削除

## リスク・懸念事項

### 1. API呼び出しの遅延
**リスク:** Claude API呼び出しにより保存処理が遅くなる可能性（2-5秒）
**対策:**
- ローディング状態の明確な表示（既存の `isSaving` 状態を活用）
- 処理ステータスメッセージの追加（"キーワードを抽出中..."）
- エラー時は元のコンテンツで保存を続行（フォールバック）

### 2. キーワード抽出の精度
**リスク:** AIが不適切なキーワードにリンクを付ける、または重要なキーワードを見逃す可能性
**対策:**
- システムプロンプトを詳細に設計（日本語・英語両対応）
- 実際の使用例でテストし、必要に応じてプロンプトを調整

### 3. 既存の[[リンク]]との競合
**リスク:** ユーザーが手動で付けたリンクが上書きされる可能性
**対策:**
- システムプロンプトに「既に[[]]で囲まれているキーワードはそのまま維持する」指示を追加

### 4. コンテンツの長さ制限
**リスク:** 長いコンテンツの場合、Claude APIのトークン制限に達する可能性
**対策:**
- エラー時は元のコンテンツで保存（フォールバック）
- 必要に応じて、コンテンツの分割処理を検討（将来の拡張）

### 5. API Key未設定時の挙動
**リスク:** デモモードや環境変数未設定時にエラーが発生
**対策:**
- デモモード実装を追加（正規表現ベースの簡易キーワード検出）
- エラーハンドリングで適切にフォールバック

## テスト計画

### 単体テスト
1. **API エンドポイントのテスト**
   - 正常系: 有効なMarkdownを送信し、リンク付きMarkdownが返ること
   - 異常系: 空のコンテンツでエラーが返ること
   - 異常系: API Key未設定でエラーが返ること

2. **processWithKeywordLinks 関数のテスト**
   - 正常系: APIが成功し、処理されたコンテンツが返ること
   - 異常系: API失敗時に元のコンテンツが返ること
   - エッジケース: 空のコンテンツで元のまま返ること

### 結合テスト
1. **保存フローのテスト**
   - ObsidianSaveButton からキーワード処理を含む保存が成功すること
   - ローディング状態が正しく表示されること
   - エラー時に適切なメッセージが表示されること

### 手動テスト
1. **実際の会話内容でのテスト**
   - ビジネス用語が正しくリンクされること
   - 一般的な単語がリンクされないこと
   - 文章構造が維持されること
   - 既存のリンクが保持されること

2. **パフォーマンステスト**
   - 保存処理の遅延が許容範囲内であること（3秒以内を目標）

3. **エラーケースのテスト**
   - API Key未設定時でも保存できること
   - ネットワークエラー時でも保存できること

## テスト用サンプルデータ

### 入力例
```markdown
# ビジネスアイデア: SaaSプロダクト

今日は新しいB2Bのビジネスモデルについて考えました。
ターゲット層は中小企業で、課題は業務効率化です。

まずはMVPを作って、収益モデルを検証したいと思います。
KPIは月間アクティブユーザー数で測定します。
```

### 期待される出力例
```markdown
# ビジネスアイデア: [[SaaS]]プロダクト

今日は新しい[[B2B]]の[[ビジネスモデル]]について考えました。
[[ターゲット層]]は[[中小企業]]で、[[課題]]は[[業務効率化]]です。

まずは[[MVP]]を作って、[[収益モデル]]を検証したいと思います。
[[KPI]]は月間アクティブユーザー数で測定します。
```

## ロールバック手順

### 問題が発生した場合
1. `/home/noritakasawada/project/20260115/business-idea-ai/src/app/api/extract-keywords/` ディレクトリを削除
2. `/home/noritakasawada/project/20260115/business-idea-ai/src/lib/obsidian.ts` から `processWithKeywordLinks` 関数を削除
3. `/home/noritakasawada/project/20260115/business-idea-ai/src/components/ObsidianSaveButton.tsx` を元の状態に戻す
4. `/home/noritakasawada/project/20260115/business-idea-ai/src/types/api.ts` から追加した型定義を削除

### Git管理
- 各ステップごとにコミットを作成し、問題があれば該当コミットをrevert

## 実装スケジュール

1. **Step 1-2: 型定義とAPIエンドポイント** (30分)
   - 型定義の追加
   - extract-keywords API の実装
   - 単体テスト

2. **Step 3: obsidian.ts の修正** (15分)
   - processWithKeywordLinks 関数の実装

3. **Step 4-5: ObsidianSaveButton の修正** (20分)
   - 保存フローの修正
   - ダウンロードフローの修正

4. **テスト・調整** (30分)
   - 結合テスト
   - 手動テスト
   - プロンプトの調整

**合計見積もり:** 約2時間

## 成功基準

- [ ] キーワード抽出APIが正常に動作する
- [ ] Obsidian保存時に自動的にキーワードリンクが付与される
- [ ] エラー時でも保存が失敗しない（フォールバック機能）
- [ ] ローディング状態が適切に表示される
- [ ] 文章構造が維持される
- [ ] 一般的な単語がリンクされない
- [ ] ビジネス用語が適切にリンクされる

## 参考資料

- 既存実装: `/home/noritakasawada/project/20260115/business-idea-ai/src/app/api/claude/route.ts`
- Obsidianリンク記法: https://help.obsidian.md/Linking+notes+and+files/Internal+links
- Anthropic SDK: https://github.com/anthropics/anthropic-sdk-typescript
