# Implementation Plan: UI Components

**Date**: 2026-01-15  
**Author**: Claude Code Agent  
**Task**: Implement 4 UI components for Business Idea AI application

---

## 1. Purpose & Background

### Objective
Create 4 React components for the voice-based AI chat interface:
1. `VoiceInput.tsx` - Voice recording interface with visual feedback
2. `ChatInterface.tsx` - Message display with animations
3. `AudioPlayer.tsx` - Audio playback controls
4. `ObsidianSaveButton.tsx` - Save chat content to Obsidian

### Context
These components form the user-facing layer of the application, integrating with existing hooks (`useVoiceRecorder`, `useAudioPlayer`, `useChat`) and library functions (`speechToText`, `generateObsidianUri`, etc.).

---

## 2. Impact Scope

### Files to Create
- `src/components/VoiceInput.tsx`
- `src/components/ChatInterface.tsx`
- `src/components/AudioPlayer.tsx`
- `src/components/ObsidianSaveButton.tsx`

### Dependencies (Existing)
**Types:**
- `src/types/chat.ts` → `Message` interface
  - `{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number; }`

**Hooks:**
- `src/hooks/useVoiceRecorder.ts` → `useVoiceRecorder()`
  - Returns: `{ isRecording, mimeType, startRecording, stopRecording, error }`
  - `stopRecording()` returns `{ blob: Blob; mimeType: string } | null`
  
- `src/hooks/useAudioPlayer.ts` → `useAudioPlayer()`
  - Returns: `{ isPlaying, isLoading, error, play, stop, canAutoPlay }`
  - `play(audioContent: string)` is async

**Libraries:**
- `src/lib/speech.ts` → `speechToText(audioBlob: Blob, mimeType: string, languageCode?: string)`
  - Returns: `Promise<STTResponse>` where `STTResponse = { transcript: string; confidence?: number; }`
  
- `src/lib/obsidian.ts`:
  - `generateObsidianUri(vaultName: string, fileName: string, content: string)` → `ObsidianUriResult`
  - `openObsidianUri(uri: string)` → `void`
  - `downloadAsMarkdown(fileName: string, content: string)` → `void`
  - `getDefaultVaultName()` → `string | null`

**External Dependencies:**
- `framer-motion` (for animations)
- React hooks: `useState`, `useRef`, `useEffect`

---

## 3. Implementation Steps

### Step 1: Create `src/components/` directory
```bash
mkdir -p src/components
```

### Step 2: Implement `VoiceInput.tsx`
**Key Features:**
- Circular recording button (orange gradient)
- Visual states: idle → recording (red, pulsing) → processing (spinner)
- Integration with `useVoiceRecorder` hook
- Speech-to-text conversion on stop
- Error display
- 60-second timeout handling

**State Management:**
- `isProcessing` (local) - STT processing state
- `errorMessage` (local) - user-facing error messages
- `isRecording`, `error` (from hook)

**Critical Logic:**
```typescript
const handleToggleRecording = async () => {
  if (isRecording) {
    const result = await stopRecording();
    if (result) {
      const sttResult = await speechToText(result.blob, result.mimeType);
      onTranscript(sttResult.transcript);
    }
  } else {
    await startRecording();
  }
}
```

**Edge Cases:**
- Empty/null STT transcript → show error
- Hook-level errors (permission denied, etc.) → display from hook
- Disabled state handling

### Step 3: Implement `ChatInterface.tsx`
**Key Features:**
- Message list with auto-scroll
- User messages (right, orange gradient)
- Assistant messages (left, white with border)
- Timestamp display
- Loading indicator (3 bouncing dots)
- Empty state illustration

**Animation:**
- Entry: `opacity: 0, y: 20` → `opacity: 1, y: 0`
- Exit: `opacity: 0, y: -20`
- Loading dots: vertical bounce with staggered delays

**Critical Logic:**
```typescript
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Edge Cases:**
- Empty messages array → show empty state
- Long messages → proper text wrapping with `whitespace-pre-wrap`
- Timestamp formatting (Japanese locale)

### Step 4: Implement `AudioPlayer.tsx`
**Key Features:**
- Play/stop toggle button
- Visual playback indicator (animated bars)
- Auto-play support (if `canAutoPlay` is true)
- Loading state during audio preparation

**State Management:**
- All state from `useAudioPlayer` hook
- Auto-play triggered via effect-like logic in component body

**Critical Logic:**
```typescript
// Auto-play when audioContent changes (MUST use useEffect)
useEffect(() => {
  if (autoPlay && canAutoPlay && audioContent && !isPlaying && !isLoading) {
    play(audioContent);
  }
}, [audioContent, autoPlay, canAutoPlay, isPlaying, isLoading, play]);
```

**Edge Cases:**
- No audioContent → return null (component not rendered)
- Auto-play blocked by browser → user must manually click
- Audio loading errors → display from hook

### Step 5: Implement `ObsidianSaveButton.tsx`
**Key Features:**
- Primary save button (purple)
- Obsidian URI generation with truncation detection
- Fallback to Markdown download
- Options menu (if URI too long)
- Success/warning/error feedback

**State Management:**
- `showOptions` - toggle options menu
- `isSaving` - button loading state
- `message` - feedback message with type

**Critical Logic:**
```typescript
const handleSaveToObsidian = () => {
  const result = generateObsidianUri(vaultName, fileName, content);
  if (result.truncated) {
    // Show warning + options menu
  } else {
    openObsidianUri(result.uri);
  }
}
```

**Edge Cases:**
- No vault name → show error, open options
- Content too long (>8000 chars) → auto-suggest Markdown download
- Empty content → disable button
- Download as alternative action

### Step 6: TypeScript Type Checking
```bash
npx tsc --noEmit
```

### Step 7: Verify Import Paths
Ensure all imports resolve correctly:
- `@/components/*` (component cross-references)
- `@/hooks/*`
- `@/lib/*`
- `@/types/*`
- `framer-motion`

---

## 4. Dependencies & Order

```
graph LR
  A[Create components dir] --> B[VoiceInput.tsx]
  A --> C[ChatInterface.tsx]
  A --> D[AudioPlayer.tsx]
  A --> E[ObsidianSaveButton.tsx]
  B --> F[Type checking]
  C --> F
  D --> F
  E --> F
```

**Independent Components** (can be created in parallel):
- VoiceInput
- ChatInterface
- AudioPlayer
- ObsidianSaveButton

---

## 5. Risks & Concerns

### R1: Framer Motion Import Issues
**Risk**: `framer-motion` may not be installed  
**Mitigation**: Check `package.json` before implementation; install if needed

### R2: TypeScript Path Aliases
**Risk**: `@/` imports may not resolve if `tsconfig.json` paths are misconfigured  
**Mitigation**: Verify `tsconfig.json` has correct `paths` configuration

### R3: Hook Return Type Mismatches
**Risk**: Component props may not match hook signatures  
**Mitigation**: Verified all signatures in advance (see Section 2)

### R4: Auto-play Logic Race Conditions
**Risk**: AudioPlayer auto-play may trigger repeatedly  
**Mitigation**: Careful condition checking in component body

### R5: Obsidian URI Length Limits
**Risk**: Long content may exceed browser URI limits  
**Mitigation**: Already handled via `truncated` flag and Markdown fallback

---

## 6. Test Plan

### Manual Testing Checklist

#### VoiceInput
- [ ] Click button starts recording (turns red)
- [ ] Click again stops and processes (shows spinner)
- [ ] Transcript is passed to parent via `onTranscript`
- [ ] Error messages display correctly
- [ ] Disabled state prevents interaction
- [ ] 60-second timeout triggers warning

#### ChatInterface
- [ ] User messages appear on right (orange)
- [ ] Assistant messages appear on left (white)
- [ ] Auto-scroll works on new messages
- [ ] Timestamps format correctly
- [ ] Loading indicator animates
- [ ] Empty state displays when no messages

#### AudioPlayer
- [ ] Play button starts audio
- [ ] Stop button pauses audio
- [ ] Visual indicator animates during playback
- [ ] Auto-play works when enabled
- [ ] Returns null when no audioContent
- [ ] Error messages display

#### ObsidianSaveButton
- [ ] Button disabled when no content
- [ ] Opens Obsidian URI successfully
- [ ] Shows warning when content too long
- [ ] Markdown download works
- [ ] Options menu toggles correctly
- [ ] Success/error messages display

### Type Checking
```bash
npx tsc --noEmit
```
Expected: 0 errors

---

## 7. Rollback Procedure

### If Implementation Fails
1. Delete created component files:
   ```bash
   rm src/components/VoiceInput.tsx
   rm src/components/ChatInterface.tsx
   rm src/components/AudioPlayer.tsx
   rm src/components/ObsidianSaveButton.tsx
   ```

2. If directory was created:
   ```bash
   rmdir src/components  # only if empty
   ```

### If Partial Success
- Keep working components
- Debug failing components individually
- Check error messages from TypeScript compiler

---

## 8. Success Criteria

✅ All 4 component files created without errors  
✅ TypeScript compilation passes with `npx tsc --noEmit`  
✅ All imports resolve correctly  
✅ Component props match documented interfaces  
✅ No runtime console errors on component render  
✅ Visual elements match specification (buttons, colors, animations)

---

## 9. Post-Implementation Notes

**Integration Points:**
These components will be integrated into the main page at `src/app/page.tsx` in a subsequent task.

**Styling:**
Components use Tailwind CSS utility classes (ensure Tailwind is configured).

**Accessibility:**
- Buttons have `aria-label` attributes
- Loading states prevent interaction
- Error messages are visible
