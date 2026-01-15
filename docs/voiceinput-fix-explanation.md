# VoiceInput Push-to-Talk 修正の技術的解説

## 問題の可視化

### 修正前の動作フロー（問題あり）

```
[User Action]           [Component State]       [Hook State]        [Result]
    |
    | Button Press
    v
onMouseDown/            isRecording: false      recorder: null
onTouchStart
    |
    | handleStartRecording() ← async
    v
startRecording()        isRecording: false      Creating...
    |                   ↓ (非同期処理中)
    |                   waiting...              stream: acquiring
    |
    | Button Release
    v
onMouseUp/              isRecording: false      recorder: creating
onTouchEnd
    |
    | handleStopRecording()
    v
if (!isRecording)       ← ここでチェック       recorder: creating
return ← 早期リターン！
    |
    X (録音停止処理が実行されない)
    |
    |                   isRecording: true ← 遅れて更新
    v
[録音が続く]            isRecording: true       recorder: recording
    |
    | もう一度タップ
    v
handleStopRecording()   isRecording: true       recorder: recording
    |
    | ようやく停止
    v
stopRecording()         isRecording: false      recorder: stopped
```

### 修正後の動作フロー（正常）

```
[User Action]           [Component State]       [Hook State]        [Result]
    |
    | Button Press
    v
onMouseDown/            isRecording: false      recorder: null
onTouchStart
    |
    | handleStartRecording() ← async
    v
startRecording()        isRecording: false      Creating...
    |                   ↓ (非同期処理中)
    |                   waiting...              stream: acquiring
    |
    | Button Release
    v
onMouseUp/              isRecording: false      recorder: creating
onTouchEnd
    |
    | handleStopRecording()
    v
if (disabled)           ← disabled のみチェック
    | continue                                  recorder: creating
    v
stopRecording()
    |                                           ↓ Hook内でチェック
    |                                           if (state !== 'recording')
    |                                               resolve(null)
    |                                               return
    v
[正常終了]              isRecording: false      recorder: stopped
```

## コードレベルの比較

### 修正前（問題あり）

```typescript
const handleStopRecording = async () => {
  // ❌ 問題: isRecording の状態を信頼しすぎている
  if (disabled || !isRecording) return;

  setIsProcessing(true);
  try {
    const result = await stopRecording();
    // ...
  } finally {
    setIsProcessing(false);
  }
};
```

**問題点**:
- `isRecording` はReact State（非同期更新）
- `startRecording()` も非同期処理
- 状態の更新タイミングがずれる → Race Condition

### 修正後（正常）

```typescript
const handleStopRecording = async () => {
  // ✅ 修正: UI状態のみチェック
  if (disabled) return;

  setIsProcessing(true);
  try {
    const result = await stopRecording();
    // Hook内で実際のデバイス状態をチェック
    // ...
  } finally {
    setIsProcessing(false);
  }
};
```

**改善点**:
- コンポーネント = UI状態（`disabled`）のみ管理
- Hook = デバイス状態（MediaRecorder）を管理
- 責任の分離 → 競合状態の解消

## Hook側のガードクローズ

```typescript
// useVoiceRecorder.ts
const stopRecording = useCallback((): Promise<...> => {
  return new Promise((resolve) => {
    const mediaRecorder = mediaRecorderRef.current;

    // ✅ 実際のデバイス状態をチェック
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      resolve(null);  // 安全に終了
      return;
    }

    // 録音中のみ停止処理を実行
    mediaRecorder.stop();
    setIsRecording(false);
  });
}, [mimeType]);
```

**重要なポイント**:
- `mediaRecorder.state` は同期的に取得可能
- React State の `isRecording` より信頼性が高い
- 二重停止を自動的に防ぐ

## なぜこの修正で解決するのか

### 1. 責任の明確化
| レイヤー | 責任範囲 | チェック内容 |
|---------|---------|-------------|
| **Component** | UI状態の管理 | `disabled` (ボタンの有効/無効) |
| **Hook** | デバイス状態の管理 | `mediaRecorder.state` (実際の録音状態) |

### 2. 状態の信頼性
```
React State (isRecording)
├─ 非同期更新
├─ レンダリングサイクルに依存
└─ タイミングのずれが発生しやすい

MediaRecorder.state
├─ 同期的に取得可能
├─ Web APIの実際の状態
└─ 信頼性が高い
```

### 3. 防御的プログラミング
```typescript
// 多層防御
Button (disabled)          ← 第1層: UI無効化
  ↓
handleStopRecording       ← 第2層: disabled チェック
  ↓
stopRecording (Hook)      ← 第3層: デバイス状態チェック
  ↓
MediaRecorder.stop()      ← 実際の停止処理
```

## パフォーマンスへの影響

### 修正前
```
handleStopRecording 呼び出し
  → isRecording チェック (React State読み取り)
  → 早期リターン
  → 処理なし
```

### 修正後
```
handleStopRecording 呼び出し
  → disabled チェック
  → stopRecording 呼び出し
    → mediaRecorder.state チェック
    → 録音中でなければ resolve(null)
```

**パフォーマンス評価**:
- 影響: ほぼなし（マイクロ秒レベル）
- メリット: 確実な停止処理 > わずかなオーバーヘッド

## 類似の問題を防ぐためのベストプラクティス

### 1. UI状態とデバイス状態を混同しない
```typescript
// ❌ 悪い例
if (!isRecording) return; // React Stateに依存

// ✅ 良い例
// デバイス状態は Hook 内でチェック
```

### 2. 非同期処理の状態管理
```typescript
// ❌ 悪い例
async function start() {
  setState(true);  // 即座には反映されない
}

// ✅ 良い例
async function start() {
  const device = await initDevice();
  // デバイスの実際の状態を信頼
}
```

### 3. ガードクローズの配置
```typescript
// ❌ 悪い例: コンポーネントで全チェック
if (disabled || !isRecording || isProcessing) return;

// ✅ 良い例: 責任の分離
Component: if (disabled) return;
Hook: if (!mediaRecorder || state !== 'recording') return;
```

## まとめ

### 修正のエッセンス
1. **コンポーネント側**: UI状態（`disabled`）のみチェック
2. **Hook側**: デバイス状態（`mediaRecorder.state`）をチェック
3. **結果**: Race Condition の解消

### 技術的意義
- 責任の分離（Separation of Concerns）
- 状態の信頼性向上（Trust the Source of Truth）
- 防御的プログラミング（Defensive Programming）

### 学んだこと
- React State は非同期 → タイミングに注意
- デバイス API の状態を直接信頼する
- 多層防御で安全性を確保
