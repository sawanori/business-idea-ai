// Claude API
export interface ClaudeRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  sessionId?: string;
}

export interface ClaudeResponse {
  response: string;
  sessionId: string;
}

// Speech-to-Text API
export interface STTRequest {
  audio: string; // base64
  languageCode?: string;
  mimeType?: string;
}

export interface STTResponse {
  transcript: string;
  confidence?: number;
}

// Text-to-Speech API
export interface TTSRequest {
  text: string;
  languageCode?: string;
  voiceName?: string;
}

export interface TTSResponse {
  audioContent: string; // base64 MP3
}

// Error Response
export interface ErrorResponse {
  error: string;
  code?: string;
}
