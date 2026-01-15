import { SpeechClient } from '@google-cloud/speech';
import { NextRequest, NextResponse } from 'next/server';
import { STTRequest, STTResponse, ErrorResponse } from '@/types/api';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

let client: SpeechClient | null = null;

function getClient() {
  if (!client) {
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (credentials) {
      client = new SpeechClient({
        credentials: JSON.parse(credentials),
      });
    } else {
      client = new SpeechClient();
    }
  }
  return client;
}

const getEncodingFromMimeType = (mimeType: string): string => {
  if (mimeType.includes('webm') || mimeType.includes('opus')) return 'WEBM_OPUS';
  if (mimeType.includes('mp4')) return 'MP3';
  if (mimeType.includes('ogg')) return 'OGG_OPUS';
  if (mimeType.includes('wav')) return 'LINEAR16';
  return 'ENCODING_UNSPECIFIED';
};

const getSampleRate = (mimeType: string): number => {
  if (mimeType.includes('webm') || mimeType.includes('opus')) return 48000;
  if (mimeType.includes('wav')) return 16000;
  return 48000;
};

export async function POST(req: NextRequest) {
  try {
    // デモモード判定
    const isDemoMode = !process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID;

    // サイズチェック
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)' } as ErrorResponse,
        { status: 413 }
      );
    }

    const body: STTRequest = await req.json();
    const { audio, languageCode = 'ja-JP', mimeType = 'audio/webm' } = body;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (isDemoMode) {
      // デモレスポンス
      await new Promise(resolve => setTimeout(resolve, 500));

      return NextResponse.json({
        transcript: "[デモモード] これはデモ音声認識結果です。実際の認識にはGoogle Cloud Speech APIの設定が必要です。",
        confidence: 1.0,
      } as STTResponse);
    }

    const speechClient = getClient();
    const encoding = getEncodingFromMimeType(mimeType);
    const sampleRateHertz = getSampleRate(mimeType);

    const [response] = await speechClient.recognize({
      audio: { content: audio },
      config: {
        encoding: encoding as any,
        sampleRateHertz,
        languageCode,
        enableAutomaticPunctuation: true,
      },
    });

    const transcript = response.results
      ?.map((result: any) => result.alternatives?.[0]?.transcript)
      .join('') || '';

    const confidence = response.results?.[0]?.alternatives?.[0]?.confidence || 0;

    return NextResponse.json({
      transcript,
      confidence,
    } as STTResponse);
  } catch (error) {
    console.error('STT Error:', error);
    return NextResponse.json(
      { error: 'Speech recognition failed' } as ErrorResponse,
      { status: 500 }
    );
  }
}
