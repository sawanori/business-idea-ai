# Implementation Plan: Phase 3d - Page Integration

**Date**: 2026-01-15
**Project**: business-idea-ai
**Feature**: Landing Page & Chat Page Integration

---

## 1. Purpose & Background

### Objective
Integrate all implemented React components (VoiceInput, ChatInterface, AudioPlayer, ObsidianSaveButton) into functional pages to complete the user-facing application.

### Background
Phase 3 components are complete:
- ✅ VoiceInput.tsx - Voice recording with STT integration
- ✅ ChatInterface.tsx - Message display with animations
- ✅ AudioPlayer.tsx - TTS audio playback
- ✅ ObsidianSaveButton.tsx - Session export to Obsidian

Phase 3d requires:
- Landing page (/) with app introduction and CTA
- Chat page (/chat) with full conversation flow
- Enhanced layout.tsx for PWA and mobile support

---

## 2. Scope of Changes

### Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/app/page.tsx` | **Full Rewrite** | Replace default Next.js template with custom landing page |
| `src/app/layout.tsx` | **Partial Update** | Add PWA meta tags, viewport config, font loading |
| `src/app/globals.css` | **Read Only** | Verify Tailwind config (no changes expected) |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/app/chat/page.tsx` | Main conversation page with all components integrated |

---

## 3. Implementation Steps

### Step 1: Update `src/app/layout.tsx`

**Changes**:
1. Add PWA-specific metadata
   - `themeColor`: `#1a1f36` (dark navy)
   - `manifest`: `/manifest.json`
   - `viewport`: `width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes`
   - Apple touch icons

2. Add Noto Sans JP font import
   ```tsx
   import { Noto_Sans_JP } from 'next/font/google';

   const notoSansJP = Noto_Sans_JP({
     weight: ['400', '500', '700'],
     subsets: ['latin'],
     variable: '--font-noto-sans-jp',
   });
   ```

3. Update metadata
   ```tsx
   title: "ビジネスアイデア壁打ちAI"
   description: "AIと対話しながら、あなたのアイデアを磨き上げる"
   ```

4. Update `<html>` tag
   ```tsx
   <html lang="ja">
   ```

5. Update body className
   ```tsx
   className={`${notoSansJP.variable} antialiased`}
   ```

**Dependencies**: None
**Risk**: Low (metadata changes only)

---

### Step 2: Implement `src/app/page.tsx` (Landing Page)

**Layout Structure**:
```
┌─────────────────────────────┐
│ Hero Section                │
│ - App Title                 │
│ - Catch Copy                │
│ - CTA Button → /chat        │
├─────────────────────────────┤
│ Features (3 columns)        │
│ - 🎤 Voice                  │
│ - 🧠 AI Thinking            │
│ - 📝 Obsidian Export        │
├─────────────────────────────┤
│ Footer                      │
└─────────────────────────────┘
```

**Key Requirements**:
1. 'use client' directive (for Framer Motion)
2. Responsive design (mobile-first)
   - Desktop: 3-column features
   - Mobile: stacked features
3. Color scheme:
   - Background: `#1a1f36` (dark navy)
   - Accent: `#ff6b35` (orange)
   - Text: white/gray
4. Framer Motion animations:
   - Fade-in on mount
   - Scroll-triggered animations for features
5. Next.js Link for navigation to `/chat`

**Component Dependencies**:
- `framer-motion` (already installed)
- `next/link` (built-in)

**Pseudocode**:
```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1a1f36]">
      {/* Hero Section */}
      <section className="hero">
        <motion.h1 initial={{opacity: 0}} animate={{opacity: 1}}>
          ビジネスアイデア壁打ちAI
        </motion.h1>
        <p>AIと対話しながら、あなたのアイデアを磨き上げる</p>
        <Link href="/chat">
          <motion.button whileHover={{scale: 1.05}}>
            対話を始める
          </motion.button>
        </Link>
      </section>

      {/* Features */}
      <section className="features grid md:grid-cols-3">
        {features.map((feature) => (
          <motion.div
            key={feature.id}
            initial={{opacity: 0, y: 50}}
            whileInView={{opacity: 1, y: 0}}
          >
            {feature.icon} {feature.title}
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </section>

      {/* Footer */}
      <footer>...</footer>
    </div>
  );
}
```

**Dependencies**: None
**Risk**: Low (static page)

---

### Step 3: Implement `src/app/chat/page.tsx` (Chat Page)

**Layout Structure**:
```
┌──────────────────────────────┐
│ Header                       │
│ [← Back] Title [Save Button] │
├──────────────────────────────┤
│                              │
│ ChatInterface (flex-1)       │
│ - Message History            │
│ - Loading Indicator          │
│                              │
├──────────────────────────────┤
│ Controls (fixed bottom)      │
│ [AudioPlayer] [VoiceInput]   │
└──────────────────────────────┘
```

**Integration Flow**:
```
User speaks → VoiceInput
  ↓ (onTranscript)
Text → useChat.sendMessage
  ↓
Claude API → response
  ↓
TTS conversion → audioContent
  ↓
AudioPlayer plays
```

**Key Requirements**:
1. 'use client' directive (state hooks)
2. State management with `useChat()` hook
3. Audio state for TTS responses
4. Component wiring:
   - `VoiceInput.onTranscript` → `handleUserMessage()`
   - `ChatInterface.messages` ← `useChat.messages`
   - `ChatInterface.isLoading` ← `useChat.isLoading`
   - `AudioPlayer.audioContent` ← last assistant message TTS
   - `ObsidianSaveButton.content` ← `useChat.generateSummary()`

**Data Flow Diagram**:
```
VoiceInput → transcript
    ↓
handleUserMessage(transcript)
    ↓
useChat.sendMessage(transcript)
    ↓
[User Message Added] → ChatInterface
    ↓
[API Call] → Claude
    ↓
[Assistant Response] → ChatInterface
    ↓
textToSpeech(response) → audioContent
    ↓
setAudioContent(audioContent) → AudioPlayer
```

**Implementation Pseudocode**:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { textToSpeech } from '@/lib/speech';
import { VoiceInput, ChatInterface, AudioPlayer, ObsidianSaveButton } from '@/components';

export default function ChatPage() {
  const { messages, isLoading, sendMessage, generateSummary } = useChat();
  const [audioContent, setAudioContent] = useState<string | null>(null);
  const [isTTSProcessing, setIsTTSProcessing] = useState(false);

  // Handle voice input transcript
  const handleUserMessage = async (transcript: string) => {
    await sendMessage(transcript);
  };

  // Generate TTS for latest assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      setIsTTSProcessing(true);
      textToSpeech(lastMessage.content)
        .then(ttsResponse => setAudioContent(ttsResponse.audioContent))
        .catch(err => console.error('TTS failed:', err))
        .finally(() => setIsTTSProcessing(false));
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link href="/">← 戻る</Link>
        <h1>対話セッション</h1>
        <ObsidianSaveButton content={generateSummary()} />
      </header>

      {/* Chat Area */}
      <ChatInterface messages={messages} isLoading={isLoading} />

      {/* Controls */}
      <div className="flex items-center gap-4 p-4">
        <AudioPlayer audioContent={audioContent} autoPlay />
        <VoiceInput
          onTranscript={handleUserMessage}
          disabled={isLoading || isTTSProcessing}
        />
      </div>
    </div>
  );
}
```

**Dependencies**:
- `@/hooks/useChat` ✅ exists
- `@/lib/speech` ✅ exists (textToSpeech function)
- `@/components` ✅ barrel export exists

**Risks**:
- **Medium**: TTS failure handling (network, rate limits)
- **Medium**: useEffect dependency array correctness
- **Low**: Component prop types (all defined in existing code)

---

## 4. Dependency Analysis

### External Dependencies (Already Installed)
- ✅ `framer-motion@^12.26.2`
- ✅ `next@16.1.2`
- ✅ `react@19.2.3`

### Internal Dependencies

| Component | Hook/Lib | API Endpoint |
|-----------|----------|--------------|
| VoiceInput | useVoiceRecorder | /api/speech-to-text |
| ChatInterface | - | - |
| AudioPlayer | useAudioPlayer | - |
| ObsidianSaveButton | - | - |
| useChat | - | /api/claude |
| textToSpeech | - | /api/text-to-speech |

**Validation**: All dependencies verified to exist in codebase.

---

## 5. Edge Cases & Error Handling

### Landing Page (page.tsx)
| Scenario | Handling |
|----------|----------|
| User clicks CTA repeatedly | No issue (Link navigation) |
| Animation performance | Use `will-change` CSS (optional) |

### Chat Page (chat/page.tsx)

| Scenario | Handling | Implementation |
|----------|----------|----------------|
| **STT Failure** | VoiceInput already handles | Display error in VoiceInput component |
| **Claude API Error** | useChat already handles | Show error message in ChatInterface |
| **TTS Failure** | Catch in useEffect | Log error, don't block UI |
| **No messages yet** | ChatInterface handles | Show empty state (already implemented) |
| **ObsidianSaveButton empty content** | Button disabled | `generateSummary()` returns empty string |
| **Multiple rapid voice inputs** | Disable during processing | `disabled={isLoading || isTTSProcessing}` |
| **Audio autoplay blocked** | AudioPlayer handles | useAudioPlayer has `canAutoPlay` detection |
| **Network offline** | API calls fail | Show error in respective components |

**Critical**: Ensure VoiceInput is disabled during:
1. Claude API call (`isLoading`)
2. TTS processing (`isTTSProcessing`)

---

## 6. Testing Strategy

### Unit Tests (Out of Scope)
*Note: Component tests already exist for VoiceInput, ChatInterface, AudioPlayer, ObsidianSaveButton*

### Integration Testing (Manual)

#### Landing Page
1. ✅ Page renders without errors
2. ✅ Hero section displays correctly
3. ✅ Features are responsive (desktop 3-col, mobile stack)
4. ✅ CTA button navigates to `/chat`
5. ✅ Framer Motion animations work

#### Chat Page
1. ✅ Page renders with empty state
2. ✅ VoiceInput → STT → message added
3. ✅ Claude response received → message added
4. ✅ TTS generated → AudioPlayer plays
5. ✅ ObsidianSaveButton generates correct markdown
6. ✅ Error states display correctly
7. ✅ Back button navigates to `/`
8. ✅ Mobile responsive layout

#### Layout
1. ✅ Correct metadata in `<head>`
2. ✅ Japanese font loads correctly
3. ✅ PWA meta tags present
4. ✅ Theme color applied

---

## 7. Rollback Procedure

### If Implementation Fails

1. **Revert Git Changes**
   ```bash
   git checkout HEAD -- src/app/page.tsx src/app/layout.tsx
   git clean -fd src/app/chat/
   ```

2. **Restore Default Next.js Template**
   - `page.tsx`: Restore original scaffold
   - `layout.tsx`: Remove custom metadata

3. **Verify App Runs**
   ```bash
   npm run dev
   ```

### Partial Rollback
- Landing page issues → Keep default `page.tsx`
- Chat page issues → Remove `chat/page.tsx`, keep landing page
- Layout issues → Revert only `layout.tsx`

---

## 8. Implementation Checklist

### Pre-Implementation
- [ ] Verify all components exist in `src/components/`
- [ ] Verify all hooks exist in `src/hooks/`
- [ ] Verify all lib functions exist in `src/lib/`
- [ ] Confirm Next.js 16.1.2 compatibility
- [ ] Confirm Framer Motion installed

### Implementation Order
1. [ ] Update `layout.tsx` (metadata, fonts)
2. [ ] Implement `page.tsx` (landing page)
3. [ ] Create `chat/page.tsx` (chat page)
4. [ ] Manual integration test

### Post-Implementation
- [ ] Test on localhost:3000
- [ ] Test mobile responsive design
- [ ] Test audio permissions flow
- [ ] Test Obsidian export
- [ ] Verify no TypeScript errors
- [ ] Verify no console errors

---

## 9. Security & Performance Considerations

### Security
- ✅ No user input sanitization needed (handled by API routes)
- ✅ No XSS risk (React auto-escapes)
- ✅ API keys in environment variables (already configured)

### Performance
- **Lazy Loading**: Not needed (only 2 pages)
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Use `next/image` for any future images
- **Animation Performance**: Framer Motion uses GPU acceleration

### Accessibility
- [ ] Add `aria-label` to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test screen reader compatibility (future enhancement)

---

## 10. Open Questions & Assumptions

### Assumptions
1. ✅ API routes (`/api/claude`, `/api/speech-to-text`, `/api/text-to-speech`) are functional
2. ✅ Environment variables are configured (`.env.local`)
3. ✅ Google Cloud credentials for STT/TTS are valid
4. ✅ Anthropic API key for Claude is valid

### Open Questions
1. **Q**: Should we add session persistence beyond localStorage?
   **A**: Out of scope for Phase 3d

2. **Q**: Should we add a "New Session" button in chat page?
   **A**: Future enhancement (use `useChat.clearSession()`)

3. **Q**: PWA manifest file - does it exist?
   **A**: Needs verification (may need to create `public/manifest.json`)

---

## 11. Success Criteria

✅ **Phase 3d Complete When**:
1. Landing page (`/`) displays with correct branding and animations
2. Chat page (`/chat`) integrates all 4 components successfully
3. Full conversation flow works: Voice → STT → Claude → TTS → AudioPlayer
4. ObsidianSaveButton exports correct markdown summary
5. Mobile responsive design verified
6. No TypeScript compilation errors
7. No runtime errors in browser console

---

## 12. Potential Issues & Mitigations

### Issue 1: TTS Rate Limiting
**Impact**: High (blocks audio playback)
**Mitigation**:
- Add retry logic with exponential backoff
- Show user-friendly error message
- Allow conversation to continue without audio

**Implementation**:
```tsx
const handleTTS = async (text: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await textToSpeech(text);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Issue 2: useEffect Infinite Loop
**Impact**: High (app freezes)
**Cause**: Incorrect dependency array in TTS useEffect
**Mitigation**:
- Only trigger on `messages.length` change
- Use `useRef` to track last processed message ID

**Implementation**:
```tsx
const lastProcessedRef = useRef<string | null>(null);

useEffect(() => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'assistant' && lastMessage.id !== lastProcessedRef.current) {
    lastProcessedRef.current = lastMessage.id;
    // TTS processing...
  }
}, [messages]);
```

### Issue 3: Hydration Mismatch (SSR)
**Impact**: Medium (console warnings)
**Cause**: Client-side only hooks (localStorage) in useChat
**Mitigation**: useChat already handles with `isInitialized` flag

### Issue 4: Missing PWA Manifest
**Impact**: Low (PWA features won't work)
**Mitigation**: Create minimal `public/manifest.json`

```json
{
  "name": "ビジネスアイデア壁打ちAI",
  "short_name": "壁打ちAI",
  "description": "AIと対話しながら、あなたのアイデアを磨き上げる",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1f36",
  "theme_color": "#1a1f36",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 13. Timeline Estimate

| Task | Estimated Time |
|------|----------------|
| Update layout.tsx | 10 minutes |
| Implement page.tsx (landing) | 30 minutes |
| Implement chat/page.tsx | 45 minutes |
| Integration testing | 20 minutes |
| Bug fixes | 15 minutes |
| **Total** | **2 hours** |

---

## 14. Review Checklist (for Think Harder Mode)

### Architecture
- [ ] Does chat/page.tsx correctly use all 4 components?
- [ ] Is the data flow unidirectional (props down, events up)?
- [ ] Are there any unnecessary re-renders?
- [ ] Is state properly lifted to the page level?

### Type Safety
- [ ] Are all component props correctly typed?
- [ ] Are API responses properly typed (STTResponse, TTSResponse)?
- [ ] Are useState generics specified?

### Error Boundaries
- [ ] What happens if VoiceInput throws?
- [ ] What happens if ChatInterface renders invalid message?
- [ ] Is TTS failure gracefully handled?

### User Experience
- [ ] Is loading feedback clear to users?
- [ ] Can users recover from errors?
- [ ] Is the back button behavior intuitive?

### Code Quality
- [ ] Are magic strings extracted to constants?
- [ ] Are inline styles avoided (use Tailwind)?
- [ ] Are comments necessary/helpful?

---

## Conclusion

This implementation plan provides a comprehensive roadmap for Phase 3d. All components, hooks, and APIs are verified to exist. The main risks are network-related (TTS rate limits, API failures), which are mitigated with proper error handling and user feedback.

**Next Step**: Execute Opus-powered "Think Harder" review to identify potential issues before implementation.
