'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { VoiceInput } from '@/components/VoiceInput';
import { ChatInterface } from '@/components/ChatInterface';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ObsidianSaveButton } from '@/components/ObsidianSaveButton';
import { textToSpeech } from '@/lib/speech';

export default function ChatPage() {
  const { messages, isLoading, error, sendMessage, clearSession, generateSummary } = useChat();
  const [lastAudioContent, setLastAudioContent] = useState<string | null>(null);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);

  // 最新のアシスタントメッセージをTTSで再生
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && isTTSEnabled) {
      textToSpeech(lastMessage.content)
        .then((response) => {
          setLastAudioContent(response.audioContent);
        })
        .catch((err) => {
          console.error('TTS Error:', err);
        });
    }
  }, [messages, isTTSEnabled]);

  const handleTranscript = async (text: string) => {
    setLastAudioContent(null);
    await sendMessage(text);
  };

  const handleClearSession = () => {
    if (window.confirm('対話履歴をすべて削除しますか？')) {
      clearSession();
      setLastAudioContent(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-3 -ml-2 rounded-lg hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="ホームに戻る"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-slate-800">アイデア壁打ち</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* TTS切り替え */}
            <button
              onClick={() => setIsTTSEnabled(!isTTSEnabled)}
              className={`p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                isTTSEnabled ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
              }`}
              aria-label={isTTSEnabled ? '音声オフ' : '音声オン'}
            >
              {isTTSEnabled ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>

            {/* クリアボタン */}
            <button
              onClick={handleClearSession}
              className="p-3 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="履歴をクリア"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Obsidian保存 */}
            <ObsidianSaveButton
              content={generateSummary()}
              disabled={messages.length === 0}
              compact={true}
            />
          </div>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-b border-red-200 px-4 py-3"
        >
          <p className="text-sm text-red-600 text-center">{error}</p>
        </motion.div>
      )}

      {/* チャットエリア */}
      <ChatInterface messages={messages} isLoading={isLoading} />

      {/* 入力エリア */}
      <footer className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            <VoiceInput onTranscript={handleTranscript} disabled={isLoading} />
            
            {/* 音声再生ボタン */}
            {lastAudioContent && (
              <AudioPlayer audioContent={lastAudioContent} autoPlay={isTTSEnabled} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
