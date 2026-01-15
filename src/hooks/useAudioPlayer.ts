'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: (audioContent: string) => Promise<void>;
  stop: () => void;
  canAutoPlay: boolean;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canAutoPlay, setCanAutoPlay] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // AudioContextを初期化（ユーザーインタラクション時に呼ぶ）
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        setCanAutoPlay(true);
      });
    } else {
      setCanAutoPlay(true);
    }
  }, []);

  // 最初のユーザーインタラクションでAudioContextを初期化
  useEffect(() => {
    const handleInteraction = () => {
      initAudioContext();
      // 一度だけ実行
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [initAudioContext]);

  const play = useCallback(async (audioContent: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // 既存の音声を停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Base64をBlobに変換
      const byteCharacters = atob(audioContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setError('音声の再生に失敗しました');
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      setIsLoading(false);
      setIsPlaying(true);

      // 再生を試みる
      try {
        await audio.play();
      } catch (playError) {
        // 自動再生がブロックされた場合
        setError('再生ボタンをタップしてください');
        setIsPlaying(false);
        setCanAutoPlay(false);
      }
    } catch (err) {
      setError('音声の処理に失敗しました');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, isLoading, error, play, stop, canAutoPlay };
};
