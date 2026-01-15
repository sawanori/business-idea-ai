import { Session, Message } from '@/types/chat';

const SESSION_STORAGE_KEY = 'business-idea-ai-sessions';
const CURRENT_SESSION_KEY = 'business-idea-ai-current-session';

/**
 * セッションIDを生成
 */
export const generateSessionId = (): string => {
  return crypto.randomUUID();
};

/**
 * 現在のセッションIDを取得
 */
export const getCurrentSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_SESSION_KEY);
};

/**
 * 現在のセッションIDを設定
 */
export const setCurrentSessionId = (sessionId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
};

/**
 * セッションを作成
 */
export const createSession = (title?: string): Session => {
  const now = Date.now();
  const session: Session = {
    id: generateSessionId(),
    title: title || `セッション ${new Date().toLocaleDateString('ja-JP')}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  return session;
};

/**
 * セッションにメッセージを追加
 */
export const addMessageToSession = (
  session: Session,
  role: 'user' | 'assistant',
  content: string
): Session => {
  const message: Message = {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };

  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: Date.now(),
  };
};

/**
 * セッションのサマリーを生成（Obsidian用Markdown形式）
 */
export const generateSessionSummary = (session: Session): string => {
  const date = new Date(session.createdAt);
  const formattedDate = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const formattedTime = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let summary = `# ${session.title}\n\n`;
  summary += `> 作成日時: ${formattedDate} ${formattedTime}\n\n`;
  summary += `---\n\n`;
  summary += `## 対話ログ\n\n`;

  session.messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? 'あなた' : 'AI';
    const timestamp = new Date(msg.timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    summary += `### ${role} (${timestamp})\n\n`;
    summary += `${msg.content}\n\n`;
  });

  summary += `---\n\n`;
  summary += `*このセッションは「ビジネスアイデア壁打ちAI」で生成されました*\n`;

  return summary;
};

/**
 * セッションの総文字数を取得
 */
export const getSessionCharacterCount = (session: Session): number => {
  return session.messages.reduce((total, msg) => total + msg.content.length, 0);
};
