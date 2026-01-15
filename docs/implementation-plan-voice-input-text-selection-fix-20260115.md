# 実装計画書: VoiceInput 録音ボタン長押し時のテキスト選択防止

**作成日**: 2026-01-15
**対象ファイル**: `/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`
**担当モデル**: Sonnet (実装), Opus (レビュー)

---

## 1. 目的・背景

### 問題
録音ボタンを長押しした際に、ブラウザのデフォルト動作により以下の問題が発生する:
- テキスト選択が発動してしまう
- 右クリックメニューが表示される可能性がある (モバイル)
- ドラッグ操作と誤認される可能性がある

### 目標
ボタン長押し時のすべてのブラウザデフォルト動作を抑制し、音声録音機能のみを実行する。

---

## 2. 影響範囲

### 変更対象ファイル
- `/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`

### 変更対象シンボル
- `VoiceInput` コンポーネント内の `motion.button` 要素

### 影響を受ける機能
- 録音ボタンの長押し操作
- マウスイベント・タッチイベントのハンドリング

### 影響を受けないもの
- 録音ロジック (`handleStartRecording`, `handleStopRecording`)
- 音声処理 (`speechToText`)
- エラーハンドリング

---

## 3. 実装手順

### Step 1: CSS クラスの追加
**対象**: `motion.button` の `className` プロパティ

**変更内容**:
```tsx
// 修正前
className={`
  relative w-20 h-20 rounded-full flex items-center justify-center
  transition-all duration-300 shadow-lg
  ${isRecording
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700'
  }
  ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
`}

// 修正後
className={`
  relative w-20 h-20 rounded-full flex items-center justify-center
  transition-all duration-300 shadow-lg
  select-none
  ${isRecording
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700'
  }
  ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
`}
```

**理由**: Tailwind CSS の `select-none` クラスは `user-select: none` を適用し、テキスト選択を防止する。

---

### Step 2: `onMouseDown` イベントハンドラの修正
**対象**: `motion.button` の `onMouseDown` プロパティ

**変更内容**:
```tsx
// 修正前
onMouseDown={handleStartRecording}

// 修正後
onMouseDown={(e) => {
  e.preventDefault();
  handleStartRecording();
}}
```

**理由**: `preventDefault()` により、マウス長押し時のブラウザデフォルト動作 (テキスト選択開始) を防止する。

---

### Step 3: `onContextMenu` イベントハンドラの追加
**対象**: `motion.button` の新規プロパティ

**変更内容**:
```tsx
// 新規追加
onContextMenu={(e) => {
  e.preventDefault();
}}
```

**理由**: 右クリックメニューや長押しコンテキストメニュー (モバイル) を防止する。

---

### Step 4: ドラッグ防止の追加
**対象**: `motion.button` の新規プロパティ

**変更内容**:
```tsx
// 新規追加
draggable={false}
```

**理由**:
- `draggable={false}` により、要素のドラッグを無効化
- ボタン要素はデフォルトでドラッグ不可能だが、内部の SVG や子要素のドラッグを防ぐため明示的に設定

---

### Step 5: iOS Safari 対応の追加
**対象**: `motion.button` の `style` プロパティ

**変更内容**:
```tsx
// 新規追加
style={{ WebkitTouchCallout: 'none' }}
```

**理由**: iOS Safari で長押しコンテキストメニューを防ぐには `-webkit-touch-callout: none` が必要。Tailwind CSS の `select-none` には含まれていないため、インラインスタイルで追加。

---

## 4. 依存関係

### 外部依存
- React (`onMouseDown`, `onTouchStart`, `onContextMenu`, `onDragStart` イベントハンドラ)
- Tailwind CSS (`select-none` クラス)
- Framer Motion (`motion.button`)

### 内部依存
- `handleStartRecording` 関数 (既存)
- `handleStopRecording` 関数 (既存)

### 変更不要な箇所
- `onTouchStart` / `onTouchEnd` (既に `preventDefault()` 実装済み)
- `onMouseUp` / `onMouseLeave` (変更不要)

---

## 5. リスク・懸念事項

### リスク 1: イベント伝播の干渉
**内容**: `preventDefault()` により親要素のイベントに影響する可能性

**対策**:
- 現状、VoiceInput は独立したコンポーネントで親要素への伝播は問題ない
- 必要に応じて `stopPropagation()` も検討できるが、現時点では不要

### リスク 2: アクセシビリティへの影響
**内容**: `select-none` や `preventDefault()` がスクリーンリーダーに影響する可能性

**対策**:
- `aria-label` 属性は既に実装済み (`aria-label={isRecording ? '録音中' : '押して話す'}`)
- セマンティック要素として `button` を使用しているため問題なし

### リスク 3: iOS Safari の特殊挙動
**内容**: iOS Safari では `-webkit-touch-callout: none` が必要な場合がある

**対策**:
- Tailwind CSS の `select-none` は `-webkit-user-select: none` を含むが、`-webkit-touch-callout` は含まない
- Step 5 で `style={{ WebkitTouchCallout: 'none' }}` を追加して対応

### リスク 4: Framer Motion の `whileTap` との競合
**内容**: `onMouseDown` での `preventDefault()` が Framer Motion の `whileTap` アニメーションに影響する可能性

**対策**:
- 実装後に実機で `whileTap` アニメーションが正常に動作するか確認
- もし動作しない場合は、`whileTap` を削除するか、カスタムアニメーションに変更

---

## 6. テスト計画

### 手動テスト項目
- [ ] **デスクトップ (Chrome/Firefox/Safari)**
  - [ ] ボタン長押し時にテキスト選択が発生しないこと
  - [ ] 録音が正常に開始・停止すること
  - [ ] 右クリックメニューが表示されないこと

- [ ] **モバイル (iOS Safari/Chrome)**
  - [ ] ボタン長押し時にテキスト選択が発生しないこと
  - [ ] 長押しコンテキストメニューが表示されないこと
  - [ ] タッチ操作で録音が正常に動作すること

- [ ] **タブレット (iPad/Android)**
  - [ ] 長押し操作時のデフォルト動作が抑制されること
  - [ ] 録音機能が正常に動作すること

### 回帰テスト
- [ ] 既存の録音機能が正常に動作すること
- [ ] エラーハンドリングが正常に動作すること
- [ ] disabled 状態でボタンが無効化されること

### エッジケーステスト
- [ ] ボタンを押しながら画面外にドラッグした場合の挙動
- [ ] ボタンを押しながら別のタブに切り替えた場合の挙動
- [ ] Framer Motion の `whileTap` アニメーションが正常に動作すること

---

## 7. ロールバック手順

### 手順
1. Git で変更前のコミットに戻す
2. または、追加したイベントハンドラと CSS クラスを削除

### 影響範囲
- `VoiceInput.tsx` のみ
- 他コンポーネントへの影響なし

---

## 8. 実装後の確認事項

- [ ] 各ブラウザでテキスト選択が防止されていること
- [ ] 録音機能が正常に動作すること
- [ ] コンソールエラーがないこと
- [ ] TypeScript のコンパイルエラーがないこと
- [ ] ESLint の警告がないこと

---

## 9. 実装コード全体 (最終版)

### 変更箇所の全体像

```tsx
<motion.button
  onMouseDown={(e) => {
    e.preventDefault();
    handleStartRecording();
  }}
  onMouseUp={handleStopRecording}
  onMouseLeave={handleStopRecording}
  onTouchStart={(e) => {
    e.preventDefault();
    handleStartRecording();
  }}
  onTouchEnd={(e) => {
    e.preventDefault();
    handleStopRecording();
  }}
  onTouchCancel={handleStopRecording}
  onContextMenu={(e) => {
    e.preventDefault();
  }}
  draggable={false}
  disabled={disabled || isProcessing}
  style={{ WebkitTouchCallout: 'none' }}
  className={`
    relative w-20 h-20 rounded-full flex items-center justify-center
    transition-all duration-300 shadow-lg
    select-none
    ${isRecording
      ? 'bg-red-500 hover:bg-red-600'
      : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700'
    }
    ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `}
  whileTap={{ scale: 0.95 }}
  aria-label={isRecording ? '録音中' : '押して話す'}
>
  {/* 内部コンテンツは変更なし */}
</motion.button>
```

---

## 10. 補足事項

### 変更されない箇所
- `handleStartRecording` / `handleStopRecording` のロジック
- `useVoiceRecorder` フックの利用
- `speechToText` 関数の呼び出し
- エラーハンドリング
- UI の見た目・アニメーション

### この修正により解決される問題
✅ 長押し時のテキスト選択
✅ 右クリックメニューの表示
✅ ドラッグ操作の誤認
✅ iOS Safari の長押しコンテキストメニュー

---

## 11. レビュー履歴

### 初回レビュー (Opus - Think Harder モード)
**日時**: 2026-01-15

**発見された問題**:
1. iOS Safari の `-webkit-touch-callout` 未対応 → Step 5 として追加
2. `onDragStart` の冗長性 → 削除
3. Framer Motion `whileTap` との競合リスク → リスク項目に追加
4. エッジケーステストの不足 → テスト計画に追加

**修正結果**: すべて対応完了

---

**計画書作成: Sonnet**
**レビュー・修正: Opus (Think Harder モード)**
**ステータス: レビュー完了、実装準備完了**
