import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { SummarizeRequest, SummarizeResponse, ErrorResponse } from '@/types/api';

let anthropic: Anthropic | null = null;

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

const SUMMARIZE_SYSTEM_PROMPT = `あなたはビジネスアイデアの会話を要約する専門家です。
以下のルールに従って会話を要約してください。

【要約のルール】
1. 重要なビジネスアイデアのポイントを抽出
2. 議論された課題と解決策を明確にまとめる
3. アクションアイテムがあれば箇条書きで列挙
4. 重要なキーワードには[[キーワード]]の形式でObsidianリンクを必ず付ける
5. 指定された最大文字数以内に**必ず**収める
6. 会話の流れを時系列で整理

【出力フォーマット】
## 概要
（全体の要約を2-3文で）

## 主要なポイント
- ポイント1
- ポイント2
- ポイント3

## 課題と解決策
（議論された課題と解決策があれば記載）
- 課題: XXX → 解決策: YYY

## アクションアイテム
（具体的なアクションがあれば記載）
- [ ] タスク1
- [ ] タスク2

## キーワード
[[キーワード1]] [[キーワード2]] [[キーワード3]]

【重要】
- 文字数制限を厳守すること
- キーワードリンクは[[]]形式で必ず付けること
- 簡潔かつ要点を押さえた要約にすること`;

export async function POST(req: NextRequest) {
  try {
    // デモモード判定
    const isDemoMode = !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === 'true';

    const body: SummarizeRequest = await req.json();
    const { content, maxLength = 1000 } = body;

    // バリデーション
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    const originalLength = content.length;

    if (isDemoMode) {
      // デモレスポンス
      const demoSummary = `## 概要
ビジネスアイデアについての対話を行いました。[[ターゲット市場]]の分析と[[収益モデル]]の検討を中心に議論しました。

## 主要なポイント
- [[ターゲット市場]]の明確化が必要
- [[競合優位性]]の検討を深める
- [[収益モデル]]の設計を具体化

## 課題と解決策
- 課題: 市場規模が不明確 → 解決策: [[市場調査]]の実施
- 課題: [[差別化]]ポイントが弱い → 解決策: 独自技術の開発

## アクションアイテム
- [ ] [[MVP]]の作成開始
- [ ] [[ターゲット顧客]]へのインタビュー実施
- [ ] [[競合分析]]レポート作成

## キーワード
[[ビジネスモデル]] [[価値提案]] [[顧客課題]]`;

      // リアルな遅延を追加
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));

      return NextResponse.json({
        summary: `[デモモード]\n\n${demoSummary}`,
        originalLength,
        summaryLength: demoSummary.length,
      } as SummarizeResponse);
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        { error: 'API client not initialized' } as ErrorResponse,
        { status: 500 }
      );
    }

    // Claude API呼び出し
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Sonnetモデルを使用（コスト最適化）
      max_tokens: 2048,
      temperature: 0.3, // 一貫性のある要約生成
      system: SUMMARIZE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `以下の会話を${maxLength}文字以内に要約してください。文字数制限は絶対に守ってください。\n\n${content}`,
        },
      ],
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const summary = assistantMessage.text;

    return NextResponse.json({
      summary,
      originalLength,
      summaryLength: summary.length,
    } as SummarizeResponse);

  } catch (error) {
    console.error('Summarize API Error:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' } as ErrorResponse,
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' } as ErrorResponse,
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to summarize content' } as ErrorResponse,
      { status: 500 }
    );
  }
}
