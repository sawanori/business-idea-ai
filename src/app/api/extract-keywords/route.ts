import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { ExtractKeywordsRequest, ExtractKeywordsResponse, ErrorResponse } from '@/types/api';

let anthropic: Anthropic | null = null;

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

const SYSTEM_PROMPT = `あなたはビジネス文書の分析専門家です。
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
処理後のMarkdownのみを出力してください。`;

// デモモード用の簡易キーワードリンク処理
const demoKeywords = [
  'SaaS', 'B2B', 'B2C', 'MVP', 'KPI', 'ROI', 'PLG',
  'ビジネスモデル', '収益モデル', 'ターゲット層', '課題', '価値提案',
  '中小企業', '大企業', 'スタートアップ',
  '業務効率化', 'DX', 'デジタル化', 'アイデア'
];

function processKeywordsInDemoMode(content: string): string {
  let processed = content;
  for (const keyword of demoKeywords) {
    // 既に[[]]で囲まれていないキーワードのみリンク化
    // 単語境界を考慮（日本語の場合は単語境界が機能しないため、両方に対応）
    const regex = new RegExp(`(?<!\\[\\[)(${keyword})(?!\\]\\])`, 'g');
    processed = processed.replace(regex, '[[$1]]');
  }
  return processed;
}

export async function POST(req: NextRequest) {
  try {
    // デモモード判定
    const isDemoMode = !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === 'true';

    const body: ExtractKeywordsRequest = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      // 空のコンテンツはそのまま返す（エラーにしない）
      return NextResponse.json({
        processedContent: content || '',
      } as ExtractKeywordsResponse);
    }

    if (isDemoMode) {
      // デモモード: 正規表現ベースの簡易処理
      const processedContent = processKeywordsInDemoMode(content);

      // リアルな遅延を追加
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

      return NextResponse.json({
        processedContent,
      } as ExtractKeywordsResponse);
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        { error: 'API client not initialized' } as ErrorResponse,
        { status: 500 }
      );
    }

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      processedContent: assistantMessage.text,
    } as ExtractKeywordsResponse);
  } catch (error) {
    console.error('Extract Keywords API Error:', error);

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
      { error: 'Failed to extract keywords' } as ErrorResponse,
      { status: 500 }
    );
  }
}
