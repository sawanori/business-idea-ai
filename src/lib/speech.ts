import { STTRequest, STTResponse, TTSRequest, TTSResponse, ErrorResponse } from '@/types/api';

/**
 * 音声データをBase64に変換
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // data:audio/webm;base64, プレフィックスを除去
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 音声をテキストに変換（Speech-to-Text）
 */
export const speechToText = async (
  audioBlob: Blob,
  mimeType: string,
  languageCode: string = 'ja-JP'
): Promise<STTResponse> => {
  const audioBase64 = await blobToBase64(audioBlob);

  const response = await fetch('/api/speech-to-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: audioBase64,
      languageCode,
      mimeType,
    } as STTRequest),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || '音声認識に失敗しました');
  }

  return response.json();
};

/**
 * テキストを音声に変換（Text-to-Speech）
 */
export const textToSpeech = async (
  text: string,
  languageCode: string = 'ja-JP',
  voiceName?: string
): Promise<TTSResponse> => {
  const response = await fetch('/api/text-to-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      languageCode,
      voiceName,
    } as TTSRequest),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || '音声合成に失敗しました');
  }

  return response.json();
};
