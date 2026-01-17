'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_RECORDING_DURATION = 60000; // 60秒

const getSupportedMimeType = (): string => {
  if (typeof window === 'undefined') return 'audio/webm';

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
};

interface UseVoiceRecorderOptions {
  onTimeout?: () => void;
  maxDuration?: number;
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  mimeType: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  releaseStream: () => void;
  requestPermission: () => Promise<boolean>;
  error: string | null;
}

export const useVoiceRecorder = (
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn => {
  const { onTimeout, maxDuration = MAX_RECORDING_DURATION } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [mimeType, setMimeType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // ストリーム解放を削除（再利用のため保持）
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const getOrCreateStream = useCallback(async (): Promise<MediaStream> => {
    // 既存のアクティブなストリームがあれば再利用
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }

    // 新規取得
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      await getOrCreateStream();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'マイクへのアクセスが拒否されました';
      setError(message);
      return false;
    }
  }, [getOrCreateStream]);

  const stopRecording = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const currentMimeType = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: currentMimeType });

        chunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve({ blob, mimeType: currentMimeType });
      };

      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      } else {
        // 'paused' などの状態の場合も考慮して停止
        // ただし通常このアプリでは paused にはならない想定だが安全策
        try {
          mediaRecorder.stop();
        } catch (e) {
          // すでに停止している場合などのフェイルセーフ
          setIsRecording(false);
          resolve(null);
          return;
        }
      }
      setIsRecording(false);
    });
  }, [mimeType]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      cleanup();

      const stream = await getOrCreateStream();

      const detectedMimeType = getSupportedMimeType();
      setMimeType(detectedMimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: detectedMimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // 自動停止タイマー
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
          onTimeout?.();
        }
      }, maxDuration);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'マイクへのアクセスに失敗しました';
      setError(message);
      cleanup();
    }
  }, [cleanup, getOrCreateStream, maxDuration, onTimeout, stopRecording]);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  return { isRecording, mimeType, startRecording, stopRecording, releaseStream, requestPermission, error };
};
