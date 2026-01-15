import { ClaudeRequest, ClaudeResponse, ErrorResponse } from '@/types/api';

export const sendMessageToClaude = async (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  sessionId?: string
): Promise<ClaudeResponse> => {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, sessionId } as ClaudeRequest),
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || 'Claude APIエラー');
  }

  return response.json();
};
