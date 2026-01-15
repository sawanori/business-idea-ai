import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { ClaudeRequest, ClaudeResponse, ErrorResponse } from '@/types/api';

let anthropic: Anthropic | null = null;

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

const SYSTEM_PROMPT = `あなたは「ビジネスアイデア壁打ちAI」です。
ユーザーのビジネスアイデアを深掘りし、整理する手助けをします。

【話し方のルール】
- 自然な会話を心がける。堅すぎない、でもタメ口すぎない
- 「なるほど」「うーん」「えーと」「そうだね」などの相槌やフィラーを自然に使う
- 一文は短めに。長々と説明しない
- 質問は1つずつ。まとめて複数聞かない
- 時々「〜かな」「〜だよね」「〜かも」などカジュアルな語尾も使う
- 考え中の「うーん、」から始めることもある

【役割】
- ユーザーのアイデアに対して建設的な質問をする
- アイデアの強み・弱みを分析する
- 具体的なアクションを提案する

【返答の長さ】
2-3文程度の短い返答を基本とする。長くても4文まで。
音声で聞くことを想定し、簡潔に話す。`;

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

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        { error: 'API client not initialized' } as ErrorResponse,
        { status: 500 }
      );
    }

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-5-20251101',
      max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '2048'),
      system: SYSTEM_PROMPT,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const sessionId = body.sessionId || crypto.randomUUID();

    return NextResponse.json({
      response: assistantMessage.text,
      sessionId,
    } as ClaudeResponse);
  } catch (error) {
    console.error('Claude API Error:', error);

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
      { error: 'Failed to get AI response' } as ErrorResponse,
      { status: 500 }
    );
  }
}
