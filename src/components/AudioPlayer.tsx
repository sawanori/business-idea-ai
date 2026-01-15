'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

interface AudioPlayerProps {
  audioContent: string | null;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioContent, autoPlay = true }) => {
  const { isPlaying, isLoading, error, play, stop, canAutoPlay } = useAudioPlayer();

  const handlePlay = () => {
    if (audioContent) {
      if (isPlaying) {
        stop();
      } else {
        play(audioContent);
      }
    }
  };

  // 自動再生が可能な場合のみ自動再生
  useEffect(() => {
    if (autoPlay && canAutoPlay && audioContent && !isPlaying && !isLoading) {
      play(audioContent);
    }
  }, [audioContent, autoPlay, canAutoPlay, isPlaying, isLoading, play]);

  if (!audioContent) return null;

  return (
    <div className="flex items-center gap-2">
      <motion.button
        onClick={handlePlay}
        disabled={isLoading}
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          transition-colors duration-200 shadow
          ${isPlaying
            ? 'bg-orange-500 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        whileTap={{ scale: 0.95 }}
        aria-label={isPlaying ? '停止' : '再生'}
      >
        {isLoading ? (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </motion.button>

      {/* 再生中のインジケーター */}
      {isPlaying && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-orange-500 rounded-full"
              animate={{ height: ['8px', '16px', '8px'] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
};
