# Implementation Plan: Obsidian Preview Modal

## 目的・背景

現在のObsidian保存機能は、保存ボタンを押すとキーワード処理後にそのまま保存される。ユーザーがどのような内容が保存されるのかを事前に確認できないため、以下の問題がある:

- キーワード抽出・リンク処理の結果が見えない
- 保存前に内容を確認できない
- `[[キーワード]]` リンクがどこに付いたかわからない

本実装では、保存前にプレビューモーダルを表示し、ユーザーが内容を確認してから保存できるようにする。

## 要件定義

### 機能要件

1. **モーダル表示フロー**
   - 保存ボタン押下 → キーワード処理実行 → モーダルでプレビュー表示
   - モーダル内に「保存」「キャンセル」ボタンを配置

2. **プレビュー表示**
   - キーワード処理後のMarkdown内容を表示
   - `[[キーワード]]` をハイライト表示（青色/背景色）
   - スクロール可能な領域で長文にも対応

3. **操作**
   - 「保存」ボタン: Obsidian URIを開く、またはダウンロード処理を実行
   - 「キャンセル」ボタン: モーダルを閉じる

### 非機能要件

- アニメーション: framer-motionを使用してスムーズな開閉
- アクセシビリティ: ESCキーでモーダルを閉じる、背景クリックで閉じる
- レスポンシブ: モバイルでも使いやすいUI

## 影響範囲

### 変更対象ファイル

1. **新規作成**
   - `/src/components/ObsidianPreviewModal.tsx` - プレビューモーダルコンポーネント

2. **修正**
   - `/src/components/ObsidianSaveButton.tsx` - モーダル統合

### シンボル・関数の影響

#### ObsidianSaveButton.tsx

**追加する状態:**
- `isPreviewOpen: boolean` - モーダルの開閉状態
- `processedContent: string` - キーワード処理後の内容

**変更する関数:**
- `handleSaveToObsidian()`
  - 現在: 処理後すぐに保存
  - 変更後: 処理後にモーダルを開く

**新規追加する関数:**
- `handleConfirmSave()` - モーダルの「保存」ボタン押下時の処理
- `handleCancelPreview()` - モーダルの「キャンセル」ボタン押下時の処理

## 実装手順

### ステップ1: ObsidianPreviewModal コンポーネント作成

**ファイル:** `/src/components/ObsidianPreviewModal.tsx`

**Props定義:**
```typescript
interface ObsidianPreviewModalProps {
  isOpen: boolean;
  content: string;  // キーワード処理済みの内容
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**実装内容:**
1. モーダルオーバーレイ（背景暗転、クリックで閉じる）
2. モーダルコンテンツエリア
   - タイトル: "Obsidianに保存"
   - プレビュー領域（max-height設定、スクロール可能）
   - `[[キーワード]]` のハイライト処理関数
   - ボタンエリア（キャンセル、保存）
3. framer-motionのアニメーション
   - オーバーレイ: fadeIn/fadeOut
   - モーダル: scaleUp/scaleDown
4. ESCキーハンドリング
5. 背景クリックでのクローズ処理

**ハイライト実装:**
- 正規表現 `/\[\[([^\]]+)\]\]/g` で `[[キーワード]]` を検出
- `<span className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">` でラップ
- dangerouslySetInnerHTML ではなく、テキストをパースしてReact要素として生成

### ステップ2: ObsidianSaveButton.tsx の修正

**状態追加:**
```typescript
const [isPreviewOpen, setIsPreviewOpen] = useState(false);
const [processedContent, setProcessedContent] = useState('');
```

**handleSaveToObsidian() の変更:**

```typescript
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
    // キーワードリンク処理
    const processed = await processWithKeywordLinks(content);
    setProcessedContent(processed);

    // モーダルを開く
    setIsPreviewOpen(true);
    setMessage(null);  // ローディングメッセージをクリア
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

**新規関数追加:**

```typescript
const handleConfirmSave = () => {
  setIsPreviewOpen(false);

  // URI生成と保存処理
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
};

const handleCancelPreview = () => {
  setIsPreviewOpen(false);
  setProcessedContent('');
};
```

**JSX追加:**
```typescript
<ObsidianPreviewModal
  isOpen={isPreviewOpen}
  content={processedContent}
  onConfirm={handleConfirmSave}
  onCancel={handleCancelPreview}
  isLoading={false}
/>
```

### ステップ3: ダウンロード機能への統合

`handleDownloadMarkdown()` も同様にモーダルを経由するように変更するかどうか検討。

**決定:** ダウンロードも同じフローにする方が一貫性がある。

**変更内容:**
1. `handleDownloadMarkdown()` もモーダルを開くように変更
2. `handleConfirmSave()` で保存タイプ（Obsidian or Download）を判定
3. 状態に `saveType: 'obsidian' | 'download'` を追加

**修正後の状態:**
```typescript
const [saveType, setSaveType] = useState<'obsidian' | 'download'>('obsidian');
```

**修正後のhandleDownloadMarkdown:**
```typescript
const handleDownloadMarkdown = async () => {
  if (!content.trim()) {
    setMessage({ text: 'ダウンロードする内容がありません', type: 'error' });
    return;
  }

  setIsSaving(true);
  setSaveType('download');

  try {
    const processed = await processWithKeywordLinks(content);
    setProcessedContent(processed);
    setIsPreviewOpen(true);
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

**修正後のhandleConfirmSave:**
```typescript
const handleConfirmSave = () => {
  setIsPreviewOpen(false);

  if (saveType === 'download') {
    // ダウンロード処理
    const date = new Date().toISOString().split('T')[0];
    const fullFileName = `${fileName}-${date}`;
    downloadAsMarkdown(fullFileName, processedContent);
    setMessage({ text: 'ダウンロードしました', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  } else {
    // Obsidian保存処理
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
  }
};
```

## 依存関係

### 外部ライブラリ
- `framer-motion` - 既に使用中（モーダルアニメーション）
- `react` - useState, useEffect

### 既存関数
- `processWithKeywordLinks()` - キーワード処理API呼び出し
- `generateObsidianUri()` - URI生成
- `openObsidianUri()` - URI起動
- `downloadAsMarkdown()` - ファイルダウンロード

## リスク・懸念事項

### 1. キーワードハイライトの実装方法

**リスク:** dangerouslySetInnerHTMLを使うとXSSのリスクがある

**対策:** テキストをパースしてReact要素として生成する

**実装例:**
```typescript
const renderContentWithHighlights = (text: string) => {
  const parts: React.ReactNode[] = [];
  const regex = /(\[\[([^\]]+)\]\])/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // ハイライト部分
    parts.push(
      <span key={match.index} className="text-blue-600 font-semibold bg-blue-50 px-1 rounded">
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};
```

### 2. 長文コンテンツのパフォーマンス

**リスク:** 大量のテキストをパースするとパフォーマンスが低下する可能性

**対策:**
- プレビュー領域にmax-heightを設定し、スクロールで対応
- 必要に応じてuseMemで結果をキャッシュ

### 3. モーダルのアクセシビリティ

**リスク:** キーボード操作やスクリーンリーダーへの対応が不十分

**対策:**
- ESCキーでのクローズ対応
- role="dialog", aria-labelledby, aria-modal属性を設定
- フォーカストラップを実装（モーダル内でのTab移動）

### 4. 改行・整形の保持

**リスク:** Markdown内の改行やコードブロックがプレビューで崩れる

**対策:**
- `white-space: pre-wrap` を使用して改行を保持
- コードブロックは別途処理（オプション）

## テスト計画

### 手動テスト

1. **基本フロー**
   - [ ] 保存ボタン押下 → モーダル表示
   - [ ] モーダル内で `[[キーワード]]` がハイライト表示されている
   - [ ] 保存ボタン → Obsidianが開く
   - [ ] キャンセルボタン → モーダルが閉じる

2. **エッジケース**
   - [ ] 空のコンテンツでの保存
   - [ ] 超長文コンテンツのプレビュー表示
   - [ ] キーワードが0個の場合
   - [ ] キーワードが大量の場合

3. **アクセシビリティ**
   - [ ] ESCキーでモーダルが閉じる
   - [ ] 背景クリックでモーダルが閉じる
   - [ ] Tabキーでボタン間を移動できる

4. **ダウンロード機能**
   - [ ] ダウンロードボタン → モーダル表示 → ダウンロード実行

### 自動テスト（オプション）

- コンポーネントのレンダリングテスト
- ハイライト関数の単体テスト

## ロールバック手順

1. ObsidianPreviewModal.tsxを削除
2. ObsidianSaveButton.tsxを元のコミットに戻す
3. git reset --hard [commit-hash]

## 実装見積もり

- ステップ1（モーダルコンポーネント作成）: 30分
- ステップ2（ObsidianSaveButton修正）: 20分
- ステップ3（ダウンロード統合）: 10分
- テスト・調整: 20分

**合計:** 約1.5時間

## 実装順序

1. ObsidianPreviewModal.tsx 作成
2. ObsidianSaveButton.tsx 修正（Obsidian保存のみ）
3. 動作確認
4. ダウンロード機能の統合
5. 総合テスト
6. エッジケースの確認

## 補足事項

### UIデザイン詳細

**モーダルサイズ:**
- 幅: max-w-2xl (640px)
- 高さ: max-h-[80vh]
- プレビュー領域: max-h-96 (384px)

**カラー:**
- キーワードハイライト: `text-blue-600 bg-blue-50`
- 保存ボタン: `bg-purple-600 hover:bg-purple-700`
- キャンセルボタン: `bg-gray-200 hover:bg-gray-300`

**アニメーション:**
- オーバーレイ: `opacity: 0 → 1` (duration: 200ms)
- モーダル: `scale: 0.95 → 1, opacity: 0 → 1` (duration: 200ms)

## レビューチェックリスト（第1回）

- [ ] 要件の漏れはないか → **OK**: モーダル表示、プレビュー、保存・キャンセル機能を網羅
- [ ] 影響範囲は正確に特定されているか → **OK**: 新規1ファイル、修正1ファイル
- [ ] 手順に曖昧な箇所はないか → **要確認**: ハイライト実装の詳細が必要
- [ ] エッジケースは考慮されているか → **OK**: 空コンテンツ、長文、キーワード0個を考慮
- [ ] 既存コードとの整合性は取れているか → **OK**: 既存の状態管理・関数を活用
- [ ] エラーハンドリングは適切か → **OK**: try-catchで処理、フォールバック用意
- [ ] テストケースは十分か → **OK**: 基本フロー、エッジケース、アクセシビリティをカバー

## レビュー結果と修正事項（Think Harder Analysis）

### 発見された問題点

#### 1. URI長チェックのタイミング問題

**問題:** 現在の設計では、ユーザーがプレビューを確認して「保存」を押した後にURI長チェックが行われ、失敗する可能性がある。

**影響:** ユーザーが内容を確認して保存しようとしたのに、その後でエラーが出る悪いUX。

**修正:**
- プレビュー表示前にURI長をチェック
- モーダルに「このコンテンツは長すぎるため、ダウンロードのみ可能です」と表示
- 保存ボタンを無効化し、ダウンロードを促す

**修正後のフロー:**
```typescript
// キーワード処理後、モーダルを開く前にチェック
const processed = await processWithKeywordLinks(content);
setProcessedContent(processed);

// URI長チェック
const date = new Date().toISOString().split('T')[0];
const fullFileName = `${fileName}-${date}.md`;
const result = generateObsidianUri(vault, fullFileName, processed);

// モーダル状態に長さチェック結果を保存
setIsContentTooLong(result.truncated);
setIsPreviewOpen(true);
```

#### 2. コードの重複（DRY原則違反）

**問題:** `handleSaveToObsidian` と `handleDownloadMarkdown` で同じキーワード処理コードが重複する。

**修正:** 共通処理を抽出

```typescript
const handlePrepareContent = async (type: 'obsidian' | 'download') => {
  if (!content.trim()) {
    setMessage({
      text: type === 'obsidian' ? '保存する内容がありません' : 'ダウンロードする内容がありません',
      type: 'error'
    });
    return;
  }

  if (type === 'obsidian' && !vault) {
    setMessage({ text: 'Vault名が設定されていません', type: 'error' });
    setShowOptions(true);
    return;
  }

  setIsSaving(true);
  setSaveType(type);
  setMessage({ text: 'キーワードを抽出中...', type: null });

  try {
    const processed = await processWithKeywordLinks(content);
    setProcessedContent(processed);

    if (type === 'obsidian') {
      // URI長チェック
      const date = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}-${date}.md`;
      const result = generateObsidianUri(vault, fullFileName, processed);
      setIsContentTooLong(result.truncated);
    }

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

const handleSaveToObsidian = () => handlePrepareContent('obsidian');
const handleDownloadMarkdown = () => handlePrepareContent('download');
```

#### 3. モーダルコンポーネントのProps設計

**問題:** `isLoading` propが定義されているが、実装計画で使用用途が不明確。

**修正:** Props定義を明確化

```typescript
interface ObsidianPreviewModalProps {
  isOpen: boolean;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSaving?: boolean;  // 保存中（保存ボタンをローディング表示）
  isContentTooLong?: boolean;  // コンテンツが長すぎる場合の警告表示
  saveType?: 'obsidian' | 'download';  // 保存タイプに応じた表示
}
```

#### 4. Compact モードの扱い

**問題:** コンパクトモードでの動作が計画に含まれていない。

**修正:** コンパクトモードでも同じフローを適用

- コンパクトモードでもプレビューモーダルを表示
- モーダルのサイズやレイアウトは変更不要（モーダルは常にフルサイズ）

#### 5. Markdownコードブロック内のキーワード問題

**問題:** コードブロック内の `[[keyword]]` もハイライトされてしまう可能性。

**修正:** 簡易的なアプローチとして、コードブロックは考慮しない
- 理由: Markdownパーサーを導入するとオーバーエンジニアリング
- 代替案: 改行を保持するだけで、特殊な処理は不要
- 将来的な改善: 必要に応じてmarkdown-to-jsxなどを検討

#### 6. コンテンツの改行保持

**問題:** CSS適用箇所が不明確。

**修正:** プレビュー領域のスタイル明確化

```typescript
<div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded whitespace-pre-wrap font-mono text-sm">
  {renderContentWithHighlights(content)}
</div>
```

- `whitespace-pre-wrap`: 改行・スペースを保持
- `font-mono`: 等幅フォントでMarkdownらしく表示
- `text-sm`: 読みやすいサイズ

### 追加する状態

修正後の状態管理:

```typescript
const [isPreviewOpen, setIsPreviewOpen] = useState(false);
const [processedContent, setProcessedContent] = useState('');
const [saveType, setSaveType] = useState<'obsidian' | 'download'>('obsidian');
const [isContentTooLong, setIsContentTooLong] = useState(false);  // 新規追加
```

### 修正後のテスト計画追加項目

**追加テストケース:**
- [ ] URI長制限を超えるコンテンツで保存ボタン無効化を確認
- [ ] ダウンロードモードとObsidianモードでモーダル表示が切り替わることを確認
- [ ] コンパクトモードでもモーダルが正常に開くことを確認

## 最終レビューチェックリスト（第2回）

- [x] 要件の漏れはないか → **修正完了**: URI長チェック、コンパクトモード対応を追加
- [x] 影響範囲は正確に特定されているか → **OK**: 変更なし
- [x] 手順に曖昧な箇所はないか → **修正完了**: CSS適用箇所、props定義を明確化
- [x] エッジケースは考慮されているか → **修正完了**: URI長制限、コードブロック対応方針を明記
- [x] 既存コードとの整合性は取れているか → **修正完了**: DRY原則に従い共通処理を抽出
- [x] エラーハンドリングは適切か → **OK**: 変更なし
- [x] テストケースは十分か → **修正完了**: 追加テストケースを明記
- [x] パフォーマンスへの影響は考慮されているか → **OK**: useMemoでキャッシュ可能
- [x] より良いアプローチは存在しないか → **検討完了**: 現在の設計が最適

## 実装準備完了

上記の修正を反映した実装を進めることができます。
