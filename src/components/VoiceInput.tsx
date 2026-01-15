'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { speechToText } from '@/lib/speech';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isRecording, mimeType, startRecording, stopRecording, error: recorderError } = useVoiceRecorder({
    onTimeout: () => {
      setErrorMessage('録音時間が上限に達しました（60秒）');
    },
  });

  const handleToggleRecording = async () => {
    setErrorMessage(null);

    if (isRecording) {
      // 録音停止 → STT処理
      setIsProcessing(true);
      try {
        const result = await stopRecording();
        if (result) {
          const { blob, mimeType: recordedMimeType } = result;
          const sttResult = await speechToText(blob, recordedMimeType);
          if (sttResult.transcript) {
            onTranscript(sttResult.transcript);
          } else {
            setErrorMessage('音声を認識できませんでした');
          }
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : '音声処理に失敗しました');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // 録音開始
      await startRecording();
    }
  };

  const displayError = errorMessage || recorderError;

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700'
          }
          ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        whileTap={{ scale: 0.95 }}
        aria-label={isRecording ? '録音停止' : '録音開始'}
      >
        {isProcessing ? (
          <motion.div
            className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : isRecording ? (
          <motion.div
            className="w-6 h-6 bg-white rounded-sm"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        ) : (
          <svg
            className="w-10 h-10 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}

        {/* 録音中のパルスアニメーション */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* ステータステキスト */}
      <p className="text-sm text-gray-500">
        {isProcessing ? '音声を処理中...' : isRecording ? '録音中...' : 'タップして話す'}
      </p>

      {/* エラーメッセージ */}
      {displayError && (
        <p className="text-sm text-red-500 text-center max-w-xs">{displayError}</p>
      )}
    </div>
  );
};
