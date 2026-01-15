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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      cleanup();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
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
  }, [cleanup, maxDuration, onTimeout]);

  const stopRecording = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const currentMimeType = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: currentMimeType });
        
        // ストリームを停止
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        chunksRef.current = [];
        resolve({ blob, mimeType: currentMimeType });
      };

      mediaRecorder.stop();
      setIsRecording(false);
    });
  }, [mimeType]);

  return { isRecording, mimeType, startRecording, stopRecording, error };
};
