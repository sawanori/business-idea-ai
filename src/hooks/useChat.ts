'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/chat';

const STORAGE_KEY = 'business-idea-ai-session';

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearSession: () => void;
  generateSummary: () => string;
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // LocalStorageから読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
    setIsInitialized(true);
  }, []);

  // LocalStorageに保存
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  }, [messages, isInitialized]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    setIsLoading(true);

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Claude APIを呼び出し
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'APIエラーが発生しました');
      }

      const data = await response.json();

      // アシスタントメッセージを追加
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : '通信エラーが発生しました';
      setError(message);
      // エラー時はユーザーメッセージを削除
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearSession = useCallback(() => {
    setMessages([]);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const generateSummary = useCallback((): string => {
    if (messages.length === 0) return '';

    const date = new Date().toLocaleDateString('ja-JP');
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    let summary = `# ビジネスアイデア壁打ち - ${date} ${time}\n\n`;
    summary += `## 対話ログ\n\n`;

    messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? '**あなた**' : '**AI**';
      summary += `### ${index + 1}. ${role}\n`;
      summary += `${msg.content}\n\n`;
    });

    return summary;
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearSession,
    generateSummary,
  };
};
