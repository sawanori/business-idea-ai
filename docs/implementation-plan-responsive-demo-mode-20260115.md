# 実装計画書: レスポンシブデザイン修正とデモモード実装

## メタデータ
- **作成日**: 2026-01-15
- **担当モデル**: Sonnet (実装), Opus (レビュー)
- **影響範囲**: フロントエンド (page.tsx, chat/page.tsx), バックエンド API (claude, speech-to-text, text-to-speech), 環境設定

## 目的・背景

### 課題
1. **レスポンシブデザインの問題**
   - ランディングページのタイトル「アイデアを声で深掘り」がスマホ (375px幅) で改行されて見栄えが悪い
   - チャットページのUI要素がスマホで最適化されていない可能性
   - タッチターゲットのサイズが不十分

2. **API設定の問題**
   - `ANTHROPIC_API_KEY` や `GOOGLE_CLOUD_CREDENTIALS` がない場合、アプリが動作しない
   - デモ・開発環境での動作確認が困難

### 目標
1. スマホ (375px幅) での見栄えを改善
2. API認証がない場合でもアプリが動作するデモモードを実装
3. タッチターゲットを44px x 44px以上に統一
4. 環境変数のテンプレートを整備

## 影響範囲

### 変更対象ファイル

#### フロントエンド
1. `src/app/page.tsx` - ランディングページ
   - タイトルのフォントサイズ調整
   - レスポンシブブレークポイントの最適化
   - パディング・マージンの調整

2. `src/app/chat/page.tsx` - チャットページ
   - ヘッダーUI要素のサイズ確認
   - ボタンのタッチターゲット確認
   - レイアウト調整

#### バックエンド API
3. `src/app/api/claude/route.ts`
   - デモモード判定ロジック追加
   - デモレスポンス生成機能

4. `src/app/api/speech-to-text/route.ts`
   - デモモード判定ロジック追加
   - デモレスポンス返却

5. `src/app/api/text-to-speech/route.ts`
   - デモモード判定ロジック追加
   - デモレスポンス返却

#### 環境設定
6. `.env.example` - 環境変数テンプレート更新
7. `.env.local` - デモモード用デフォルト設定ファイル作成 (新規)

### 影響を受けるシンボル・コンポーネント
- `Home` component (page.tsx)
- `ChatPage` component (chat/page.tsx)
- `POST` handler (claude/route.ts)
- `POST` handler (speech-to-text/route.ts)
- `POST` handler (text-to-speech/route.ts)

## 実装手順

### Phase 1: レスポンシブデザイン修正

#### Step 1.1: ランディングページタイトル修正 (`src/app/page.tsx`)
**現状の問題**:
```tsx
className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
アイデアを<span>声</span>で深掘り
```
- `text-4xl` (36px) がスマホ (375px幅) で大きすぎる可能性
- 「アイデアを」と「声で深掘り」が改行される

**修正内容**:
```tsx
className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6"
```
- スマホ: `text-3xl` (30px) に縮小
- タブレット: `sm:text-4xl` (36px)
- デスクトップ: `lg:text-6xl` (60px)

**検証方法**:
- Chrome DevToolsで375px幅表示を確認
- タイトルが1行または適切に改行されることを確認

#### Step 1.2: セクションパディング最適化
**対象要素**:
- ヒーローセクション: `px-4 pt-20 pb-16 sm:px-6 lg:px-8`
- 特徴セクション: `px-4 py-16 sm:px-6 lg:px-8`

**修正内容**:
- スマホでの縦パディングを調整 (`pt-20 pb-16` → `pt-16 pb-12` または `pt-12 pb-10`)
- コンテンツが詰まりすぎず、かつスクロール量を抑える

#### Step 1.3: チャットページタッチターゲット確認
**確認ポイント**:
1. ヘッダーボタン (戻る、TTS切り替え、クリア、Obsidian保存)
   - 現状: `p-2` (padding 0.5rem = 8px) → 要素全体で約44px必要
   - `p-2` のボタンにアイコン `w-5 h-5` (20px) → 合計 36px (不足)

2. VoiceInputボタン
   - サイズを確認、必要に応じて調整

**修正内容**:
- ボタンのパディングを `p-2` → `p-3` に変更 (12px padding → 20px icon + 24px padding = 44px)
- または `min-w-[44px] min-h-[44px]` を明示的に指定

### Phase 2: デモモード実装

#### Step 2.1: Claude API デモモード (`src/app/api/claude/route.ts`)
**実装箇所**: `POST` 関数の冒頭

```typescript
export async function POST(req: NextRequest) {
  try {
    // デモモード判定
    const isDemoMode = !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === 'true';

    const body: ClaudeRequest = await req.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (isDemoMode) {
      // デモレスポンス
      const demoResponses = [
        "なるほど、そのアイデアは面白いですね！具体的にどんなターゲット層を想定していますか？",
        "そのビジネスモデルについて、競合との差別化ポイントはどこにあると考えていますか？",
        "素晴らしい視点です。次のステップとして、まずは小規模なMVPを作ってみることをお勧めします。",
        "その課題感は多くの人が共感すると思います。実際にどんな場面で困っているか、もう少し具体的に教えてもらえますか？",
        "市場規模はどのくらいを見込んでいますか？また、収益モデルについてはどう考えていますか？"
      ];
      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];

      // リアルな遅延を追加
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

      const sessionId = body.sessionId || crypto.randomUUID();
      return NextResponse.json({
        response: `[デモモード] ${randomResponse}`,
        sessionId,
      } as ClaudeResponse);
    }

    // 既存の実装（API呼び出し）
    const response = await anthropic.messages.create({
      // ...
    });
    // ...
  } catch (error) {
    // ...
  }
}
```

**注意点**:
- `anthropic` クライアントの初期化をデモモード時にスキップするため、初期化を遅延させる必要がある
- 現状の `const anthropic = new Anthropic(...)` はファイルトップレベルで実行されるため、API_KEYがないとエラーになる

**修正が必要な箇所**:
```typescript
// Before (ファイルトップレベル)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// After (関数内で遅延初期化)
let anthropic: Anthropic | null = null;

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}
```

#### Step 2.2: Speech-to-Text デモモード (`src/app/api/speech-to-text/route.ts`)
**実装箇所**: `POST` 関数内、クライアント取得前

```typescript
export async function POST(req: NextRequest) {
  try {
    const isDemoMode = !process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID;

    // ... サイズチェック、bodyパース ...

    if (isDemoMode) {
      // 遅延
      await new Promise(resolve => setTimeout(resolve, 500));

      return NextResponse.json({
        transcript: "[デモモード] これはデモ音声認識結果です。実際の認識にはGoogle Cloud Speech APIの設定が必要です。",
        confidence: 1.0,
      } as STTResponse);
    }

    // 既存の実装
    const speechClient = getClient();
    // ...
  } catch (error) {
    // ...
  }
}
```

**注意点**:
- 既存の `getClient()` はクレデンシャルがない場合でも `new SpeechClient()` を呼び出す
- デモモード時はクライアント取得をスキップする必要がある

#### Step 2.3: Text-to-Speech デモモード (`src/app/api/text-to-speech/route.ts`)
**実装箇所**: `POST` 関数内、クライアント取得前

```typescript
export async function POST(req: NextRequest) {
  try {
    const body: TTSRequest = await req.json();
    const { text, languageCode, voiceName } = body;

    // バリデーション
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long (max ${MAX_TEXT_LENGTH} characters)` } as ErrorResponse,
        { status: 400 }
      );
    }

    const isDemoMode = !process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (isDemoMode) {
      // デモ用の空音声（またはダミーBase64）
      await new Promise(resolve => setTimeout(resolve, 300));

      return NextResponse.json({
        audioContent: "", // 空の音声データ（フロントエンド側で音声再生をスキップ）
      } as TTSResponse);
    }

    // 既存の実装
    const ttsClient = getClient();
    // ...
  } catch (error) {
    // ...
  }
}
```

**フロントエンド側の対応**:
- `audioContent` が空の場合、AudioPlayerを表示しない
- または無音のMP3 Base64を返す（オプション）

### Phase 3: 環境設定ファイル更新

#### Step 3.1: `.env.example` 更新
```bash
# デモモード（APIキーなしで動作確認する場合はtrueに設定）
DEMO_MODE=true

# Claude API（本番用）
ANTHROPIC_API_KEY=

# Google Cloud Speech API（本番用）
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_CREDENTIALS=

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_OBSIDIAN_VAULT_NAME=MyVault

# Claude API設定（オプション）
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TOKENS=2048

# Google TTS設定（オプション）
TTS_LANGUAGE_CODE=ja-JP
TTS_VOICE_NAME=ja-JP-Neural2-D
```

#### Step 3.2: `.env.local` 作成（新規ファイル）
```bash
# デモモード設定（ローカル開発用）
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_OBSIDIAN_VAULT_NAME=MyVault
```

**注意点**:
- `.env.local` は `.gitignore` に含まれているか確認
- デフォルトでNext.jsは `.env.local` を無視する設定になっている

### Phase 4: ビルド検証

#### Step 4.1: ビルドテスト
```bash
npm run build
```

**検証ポイント**:
- TypeScriptエラーがないこと
- ビルドが成功すること
- 警告が最小限であること

#### Step 4.2: デモモード動作確認
```bash
# .env.localにDEMO_MODE=trueが設定されていることを確認
npm run dev
```

**確認項目**:
- ランディングページが正しく表示される
- チャットページでメッセージ送信が可能
- デモレスポンスが返ってくる
- エラーが発生しない

#### Step 4.3: レスポンシブ確認
- Chrome DevToolsでデバイスエミュレーション
- 375px幅（iPhone SE）でレイアウト確認
- タッチターゲットサイズ確認

## 依存関係

### 前提条件
- Next.js 16.1.2
- TypeScript設定済み
- Tailwind CSS v4設定済み

### 外部依存
- なし（既存のパッケージのみ使用）

### 実装順序の依存
1. Phase 1 (レスポンシブ) と Phase 2 (デモモード) は並行実装可能
2. Phase 3 (環境設定) は Phase 2 の後に実装
3. Phase 4 (検証) は全フェーズ完了後

## リスク・懸念事項

### 技術的リスク
1. **Anthropic クライアント初期化エラー**
   - リスク: API_KEYなしでクライアント初期化するとエラー
   - 対策: 遅延初期化パターンを使用

2. **Google Cloud クライアント初期化エラー**
   - リスク: クレデンシャルなしでクライアント初期化するとエラー
   - 対策: デモモード判定をクライアント取得前に実施

3. **フォントサイズ変更の影響**
   - リスク: タイトルが小さくなりすぎる
   - 対策: 複数デバイスで視認性を確認

### ユーザー体験リスク
1. **デモモードの明示性**
   - リスク: ユーザーがデモモードと気づかない
   - 対策: レスポンスに `[デモモード]` プレフィックスを追加

2. **音声機能の制限**
   - リスク: TTS/STTがデモモードで動作しない
   - 対策: Web Speech API使用を促すメッセージ（将来的な拡張）

## テスト計画

### 単体テスト
- 各APIエンドポイントのデモモード判定ロジック
- 環境変数の読み込み

### 統合テスト
- デモモードでのエンドツーエンド対話フロー
- API KEYありでの通常動作（リグレッション）

### 手動テスト
1. **レスポンシブテスト**
   - [ ] iPhone SE (375px) でタイトル表示確認
   - [ ] iPad (768px) でレイアウト確認
   - [ ] デスクトップ (1920px) でレイアウト確認

2. **デモモードテスト**
   - [ ] DEMO_MODE=true でアプリ起動
   - [ ] メッセージ送信してデモレスポンス受信
   - [ ] エラーが表示されないこと

3. **本番モードテスト**
   - [ ] API KEYありでビルド成功
   - [ ] 実際のAPI呼び出しが動作すること

## ロールバック手順

### Phase 1 ロールバック
- `src/app/page.tsx` のコミットを revert
- `src/app/chat/page.tsx` のコミットを revert

### Phase 2 ロールバック
- API routeファイルのコミットを revert
- Anthropic/Google Cloudクライアント初期化を元に戻す

### Phase 3 ロールバック
- `.env.example` を元のバージョンに戻す
- `.env.local` を削除

### 緊急対応
- ビルドが失敗した場合: 直前のコミットに戻してデプロイ
- ランタイムエラー発生: 環境変数をチェック、デモモードを無効化

## 完了条件

- [ ] ランディングページがスマホ (375px) で適切に表示される
- [ ] チャットページのボタンが44px x 44px以上のタッチターゲットを持つ
- [ ] DEMO_MODE=true でアプリが正常動作する
- [ ] Claude APIなしでデモレスポンスが返る
- [ ] Google Cloud認証なしでデモモードが動作する
- [ ] `.env.example` が更新されている
- [ ] `.env.local` が作成されている
- [ ] `npm run build` が成功する
- [ ] 既存機能が正常動作する（リグレッションなし）

## 実装後の改善提案

### 短期 (次のイテレーション)
1. Web Speech API対応でブラウザネイティブSTTを使用
2. デモモード時のUI改善（バナー表示など）
3. ローディング状態の改善

### 長期 (将来的な拡張)
1. オフラインモード対応 (PWA + IndexedDB)
2. 多言語対応
3. デモ用の会話シナリオバリエーション追加

---

## レビューチェックリスト

### 要件の確認
- [x] レスポンシブデザイン修正が含まれている
- [x] デモモード実装が含まれている
- [x] 環境設定ファイルの更新が含まれている
- [x] ビルド検証手順が含まれている

### 影響範囲の確認
- [x] 変更対象ファイルが明確
- [x] 影響を受けるシンボルが特定されている
- [x] 既存機能への影響が考慮されている

### 実装手順の確認
- [x] 手順がステップバイステップで記述されている
- [x] コード例が具体的
- [x] 注意点が明記されている

### エッジケースの考慮
- [x] API KEYなしのケースが考慮されている
- [x] クライアント初期化エラーが考慮されている
- [x] 様々な画面サイズが考慮されている

### エラーハンドリング
- [x] デモモード判定ロジックが適切
- [x] エラーレスポンスが定義されている
- [x] ロールバック手順が明確

### テストケース
- [x] 単体テストが定義されている
- [x] 統合テストが定義されている
- [x] 手動テストチェックリストがある

### 保守性
- [x] コードの可読性が考慮されている
- [x] 将来の拡張性が考慮されている
- [x] ドキュメントが十分

---

**次のステップ**: この計画書をOpusモデルでレビューし、問題点を洗い出す
