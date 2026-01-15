# Implementation Plan: ObsidianSaveButton Compact Mode

## 目的・背景

### 問題
- `ObsidianSaveButton`がヘッダー内で使用されると、`flex flex-col gap-2`レイアウトによりボタンが縦に大きくなりすぎる
- ヘッダーのレイアウトが崩れ、視覚的にバランスが悪くなる

### 解決策
- `compact`プロップを追加して、ヘッダー用のコンパクト表示モードに対応
- コンパクトモードではアイコンのみのボタンとして表示
- 通常モードでは既存の動作を維持

## 影響範囲

### 変更対象ファイル

1. **`src/components/ObsidianSaveButton.tsx`**
   - Props型定義: `ObsidianSaveButtonProps`に`compact?: boolean`を追加
   - JSX構造: `compact`プロップによる条件分岐を実装
   - スタイリング: コンパクトモード用のクラス定義

2. **`src/app/chat/page.tsx`**
   - `<ObsidianSaveButton>`の使用箇所に`compact={true}`を追加

### 影響を受けるシンボル

- `ObsidianSaveButtonProps` interface (拡張)
- `ObsidianSaveButton` component (条件レンダリング追加)
- `ChatPage` component (props追加)

## 実装手順

### Step 1: Props型定義の拡張

**ファイル**: `src/components/ObsidianSaveButton.tsx`

```typescript
interface ObsidianSaveButtonProps {
  content: string;
  fileName?: string;
  vaultName?: string;
  disabled?: boolean;
  compact?: boolean;  // 追加
}
```

**理由**:
- オプショナルプロップとして定義することで、既存の使用箇所に影響を与えない
- デフォルト値は`false`（通常モード）

### Step 2: コンポーネント関数の修正

**ファイル**: `src/components/ObsidianSaveButton.tsx`

**2-1. デフォルト値の追加**

```typescript
export const ObsidianSaveButton: React.FC<ObsidianSaveButtonProps> = ({
  content,
  fileName = 'idea',
  vaultName,
  disabled = false,
  compact = false,  // 追加
}) => {
```

**2-2. コンパクトモードの早期リターン追加**

現在の`return`文の直前に以下を挿入:

```typescript
  // コンパクトモード: アイコンのみ表示
  if (compact) {
    return (
      <motion.button
        onClick={handleSaveToObsidian}
        disabled={disabled || isEmpty || isSaving}
        className={`
          p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px]
          flex items-center justify-center
          ${isEmpty || disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          }
        `}
        whileTap={isEmpty || disabled ? {} : { scale: 0.98 }}
        aria-label="Obsidianに保存"
        title={isEmpty ? '保存する内容がありません' : 'Obsidianに保存'}
        data-compact="true"
      >
        {isSaving ? (
          <motion.div
            className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
          </svg>
        )}
      </motion.button>
    );
  }
```

### Step 3: ヘッダーでの使用箇所の修正

**ファイル**: `src/app/chat/page.tsx` (95-99行目)

**変更前**:
```typescript
<ObsidianSaveButton
  content={generateSummary()}
  disabled={messages.length === 0}
/>
```

**変更後**:
```typescript
<ObsidianSaveButton
  content={generateSummary()}
  disabled={messages.length === 0}
  compact={true}
/>
```

## 依存関係

### 前提条件
- 既存の`ObsidianSaveButton`が正常に動作していること
- `framer-motion`が正常に動作していること

### 新規依存追加
なし（既存のライブラリのみ使用）

## リスク・懸念事項

### 低リスク
1. **後方互換性**: `compact`はオプショナルプロップのため、既存コードに影響なし
2. **スタイリング**: 既存のTailwind CSSクラスを流用するため、デザイン一貫性は維持

### 中リスク
1. **UXの変化**: コンパクトモードではフィードバックメッセージが表示されないため、ユーザーが保存成功/失敗を確認しづらい可能性
   - **対策**: `title`属性でツールチップを表示
   - **許容理由**: ヘッダーの限られたスペースでは、メッセージ表示領域を確保するとレイアウトが崩れる。Obsidianアプリ側で保存確認が可能なため、この制限は許容範囲内
   - **将来的改善**: トースト通知ライブラリ導入時に対応を検討

### 対策済み
- アクセシビリティ: `aria-label`と`title`で適切なラベリング
- タップターゲットサイズ: 44px x 44pxでアクセシビリティガイドライン準拠

## テスト計画

### 手動テスト
1. **コンパクトモードの表示確認**
   - ヘッダーに正しくアイコンのみが表示されるか
   - ボタンサイズが44px x 44pxであるか
   - ホバー/フォーカス状態が適切か

2. **機能確認**
   - クリック時にObsidianに保存できるか
   - `disabled`状態が正しく動作するか
   - `isSaving`中のローディング表示が正しいか

3. **通常モードの確認**
   - `compact={false}`または未指定時に既存の動作が維持されているか
   - オプションメニュー、フィードバックメッセージが表示されるか

4. **レスポンシブ確認**
   - モバイル、タブレット、デスクトップで適切に表示されるか

### ビルド確認
```bash
npm run build
```
- TypeScript型エラーがないこと
- ビルドが正常に完了すること

## ロールバック手順

### 修正内容の巻き戻し

**Step 1**: `src/components/ObsidianSaveButton.tsx`の変更を取り消し
- Props型定義から`compact?: boolean`を削除
- デフォルトパラメータから`compact = false`を削除
- コンパクトモードの早期リターンコードを削除

**Step 2**: `src/app/chat/page.tsx`の変更を取り消し
- `compact={true}`行を削除

### 確認
```bash
npm run build
git diff  # 変更が完全に取り消されたか確認
```

## 実装チェックリスト

- [ ] Props型定義に`compact?: boolean`を追加
- [ ] デフォルトパラメータに`compact = false`を設定
- [ ] コンパクトモードの早期リターンを実装
  - [ ] ボタンサイズ: 44px x 44px
  - [ ] アイコンのみ表示
  - [ ] `aria-label`と`title`を適切に設定
  - [ ] `isSaving`時のローディング表示
  - [ ] `disabled`/`isEmpty`時のスタイル
- [ ] `chat/page.tsx`に`compact={true}`を追加
- [ ] ビルドが成功することを確認
- [ ] 手動テストで動作確認
  - [ ] コンパクトモードの表示
  - [ ] 通常モードの表示（既存動作維持）
  - [ ] クリック動作
  - [ ] レスポンシブ表示

## 成功基準

1. **機能要件**
   - ✅ `compact={true}`時にアイコンのみのボタンが表示される
   - ✅ `compact={false}`または未指定時に既存の動作が維持される
   - ✅ ヘッダーのレイアウトが崩れない

2. **品質要件**
   - ✅ TypeScriptの型エラーがない
   - ✅ ビルドが成功する
   - ✅ アクセシビリティ基準（タップターゲット44px以上）を満たす

3. **非機能要件**
   - ✅ 後方互換性が維持される
   - ✅ コードの可読性が保たれる

## レビュー結果

### 実施日時
2026-01-15

### レビュー結果
✅ **承認 (Approved with Minor Improvements)**

### 改善点
1. ✅ `button`を`motion.button`に変更（UX一貫性のため）
2. ✅ `whileTap`アニメーションを追加
3. ✅ `data-compact="true"`属性を追加（テスト用）
4. ✅ UX制限（メッセージ非表示）の許容理由を明記

### レビュー所見
- 技術的に正しく、型安全性が保たれている
- 後方互換性が維持されている
- アクセシビリティ基準に準拠
- エッジケースが適切に考慮されている
- ロールバック手順が明確

## 備考

### デザイン判断
- **色の選択**: 既存のpurple系を踏襲（`bg-purple-100`, `text-purple-600`）
- **アイコン**: 既存のSVG保存アイコンを再利用
- **サイズ**: 他のヘッダーボタンと統一（44px x 44px）

### 将来的な改善案
- トースト通知ライブラリの導入によるフィードバック改善
- コンパクトモードでもポップオーバーでオプションメニューを表示
- カスタマイズ可能な`compactSize`プロップの追加
