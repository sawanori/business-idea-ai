import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextRequest, NextResponse } from 'next/server';
import { TTSRequest, TTSResponse, ErrorResponse } from '@/types/api';

const MAX_TEXT_LENGTH = 5000;

let client: TextToSpeechClient | null = null;

function getClient() {
  if (!client) {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (credentials) {
      client = new TextToSpeechClient({
        credentials: JSON.parse(credentials),
      });
    } else {
      client = new TextToSpeechClient();
    }
  }
  return client;
}

export async function POST(req: NextRequest) {
  try {
    // デモモード判定
    const isDemoMode = !process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID;

    const body: TTSRequest = await req.json();
    const {
      text,
      languageCode = process.env.TTS_LANGUAGE_CODE || 'ja-JP',
      voiceName = process.env.TTS_VOICE_NAME || 'ja-JP-Neural2-D',
    } = body;

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

    if (isDemoMode) {
      // デモモード: 空の音声データを返す（フロントエンドで音声再生をスキップ）
      await new Promise(resolve => setTimeout(resolve, 300));

      return NextResponse.json({
        audioContent: "",
      } as TTSResponse);
    }

    const ttsClient = getClient();

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const audioContent = response.audioContent
      ? Buffer.from(response.audioContent).toString('base64')
      : '';

    return NextResponse.json({
      audioContent,
    } as TTSResponse);
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech conversion failed' } as ErrorResponse,
      { status: 500 }
    );
  }
}
