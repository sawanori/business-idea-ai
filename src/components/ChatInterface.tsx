'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types/chat';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3 shadow-md
                ${message.role === 'user'
                  ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                  : 'bg-white text-gray-800 border border-gray-100'
                }
              `}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
              <p
                className={`
                  text-xs mt-2
                  ${message.role === 'user' ? 'text-orange-100' : 'text-gray-400'}
                `}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ローディングインジケーター */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start"
        >
          <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 空の状態 */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <svg
            className="w-16 h-16 mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium">対話を始めましょう</p>
          <p className="text-sm mt-1">マイクボタンをタップして話しかけてください</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
