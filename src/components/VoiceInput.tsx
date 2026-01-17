'use client';

import { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import { motion } from 'framer-motion';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { speechToText } from '@/lib/speech';

export interface VoiceInputHandle {
  requestPermission: () => Promise<boolean>;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  onRecordingStart?: () => void;
}

export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  ({ onTranscript, disabled = false, onRecordingStart }, ref) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { isRecording, mimeType, startRecording, stopRecording, requestPermission, error: recorderError } = useVoiceRecorder({
      onTimeout: () => {
        setErrorMessage('録音時間が上限に達しました（60秒）');
      },
    });

    useImperativeHandle(ref, () => ({
      requestPermission,
    }), [requestPermission]);

    const isHoldingRef = useRef(false);
    const isStartingRef = useRef(false);
    const shouldStopRef = useRef(false);

    const handleStartRecording = async () => {
      // Guard clause: prevent start if disabled, processing, or already recording
      if (disabled || isProcessing || isRecording || isStartingRef.current) return;

      setErrorMessage(null);
      isStartingRef.current = true;
      shouldStopRef.current = false;

      try {
        await startRecording();

        // 録音開始処理が完了した直後のチェック
        isStartingRef.current = false;

        // 録音開始処理中に「停止」がリクエストされていた場合（ボタンを離していた場合）
        // または、現在ボタンを保持していない場合は即座に停止
        if (shouldStopRef.current || !isHoldingRef.current) {
          await handleStopRecording();
          return;
        }

        // 録音開始成功時にコールバック実行
        onRecordingStart?.();
      } catch (err) {
        isStartingRef.current = false;
        setErrorMessage(err instanceof Error ? err.message : '録音開始に失敗しました');
      }
    };

    const handleStopRecording = async () => {
      // Guard clause: only process if not disabled
      if (disabled) return;

      // もし録音開始処理中なら、停止フラグを立ててリターンする
      // (開始処理完了後に handleStartRecording 内でチェックされ、停止が実行される)
      if (isStartingRef.current) {
        shouldStopRef.current = true;
        return;
      }

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
    };

    const displayError = errorMessage || recorderError;

    return (
      <div className="flex flex-col items-center gap-3">
        <motion.button
          onMouseDown={(e) => {
            e.preventDefault();
            isHoldingRef.current = true;
            handleStartRecording();
          }}
          onMouseUp={() => {
            isHoldingRef.current = false;
            handleStopRecording();
          }}
          onMouseLeave={() => {
            isHoldingRef.current = false;
            handleStopRecording();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            isHoldingRef.current = true;
            handleStartRecording();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            isHoldingRef.current = false;
            handleStopRecording();
          }}
          onTouchCancel={() => {
            isHoldingRef.current = false;
            handleStopRecording();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
          draggable={false}
          disabled={disabled || isProcessing}
          style={{ WebkitTouchCallout: 'none' }}
          className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          select-none
          ${isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700'
            }
          ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
          whileTap={{ scale: 0.95 }}
          aria-label={isRecording ? '録音中' : '押して話す'}
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
          {isProcessing ? '音声を処理中...' : isRecording ? '録音中...' : '押して話す'}
        </p>

        {/* エラーメッセージ */}
        {displayError && (
          <p className="text-sm text-red-500 text-center max-w-xs">{displayError}</p>
        )}
      </div>
    );
  });

VoiceInput.displayName = 'VoiceInput';
