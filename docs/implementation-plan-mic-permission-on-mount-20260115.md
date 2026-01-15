# Implementation Plan: Microphone Permission Request on Chat Screen Mount

**Date**: 2026-01-15  
**Status**: COMPLETED (Implemented and Build Verified)  
**Assignee**: Sonnet 4.5  
**Reviewer**: Opus 4.5 (Think Harder mode required)

---

## 1. Purpose and Background

### Objective
Request microphone permission when the chat screen opens, rather than waiting for the user to press the voice recording button. This improves user experience by:
- Reducing latency when first pressing the record button
- Making permission flow more predictable
- Avoiding permission popup appearing mid-interaction

### Current Behavior
- Microphone permission is requested only when user presses the voice recording button (`startRecording` is called)
- This causes a delay and permission dialog to appear during user interaction

### Desired Behavior
- Microphone permission is requested immediately when chat page mounts
- User sees permission dialog before attempting to record
- Recording button becomes immediately responsive once permission is granted

---

## 2. Impact Analysis

### Files to Modify

1. **`/home/noritakasawada/project/20260115/business-idea-ai/src/hooks/useVoiceRecorder.ts`**
   - Add `requestPermission` function to expose stream initialization
   - Export in return value

2. **`/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`**
   - Expose `requestPermission` via props or ref
   - Pass through to parent component

3. **`/home/noritakasawada/project/20260115/business-idea-ai/src/app/chat/page.tsx`**
   - Add `useEffect` to call `requestPermission` on mount
   - Handle permission result appropriately

### Existing Code Analysis

#### useVoiceRecorder.ts (lines 58-68)
```typescript
const getOrCreateStream = useCallback(async (): Promise<MediaStream> => {
  // 既存のアクティブなストリームがあれば再利用
  if (streamRef.current && streamRef.current.active) {
    return streamRef.current;
  }

  // 新規取得
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  streamRef.current = stream;
  return stream;
}, []);
```
- This function already handles permission request via `getUserMedia`
- We can reuse this for pre-requesting permission

#### VoiceInput.tsx
- Currently only calls `startRecording` on user interaction (lines 24-36)
- No prop/ref mechanism to expose permission request to parent

#### chat/page.tsx
- No useEffect for microphone initialization
- VoiceInput is used on line 132 with limited props

---

## 3. Implementation Steps

### Step 1: Modify `useVoiceRecorder.ts`

**Location**: `/home/noritakasawada/project/20260115/business-idea-ai/src/hooks/useVoiceRecorder.ts`

**Changes**:

1. **Add `requestPermission` function** (after line 68):
```typescript
const requestPermission = useCallback(async (): Promise<boolean> => {
  try {
    setError(null);
    await getOrCreateStream();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'マイクへのアクセスが拒否されました';
    setError(message);
    return false;
  }
}, [getOrCreateStream]);
```

2. **Update `UseVoiceRecorderReturn` interface** (lines 25-32):
```typescript
interface UseVoiceRecorderReturn {
  isRecording: boolean;
  mimeType: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  releaseStream: () => void;
  requestPermission: () => Promise<boolean>;  // ADD THIS LINE
  error: string | null;
}
```

3. **Update return statement** (line 141):
```typescript
return { 
  isRecording, 
  mimeType, 
  startRecording, 
  stopRecording, 
  releaseStream, 
  requestPermission,  // ADD THIS
  error 
};
```

### Step 2: Modify `VoiceInput.tsx`

**Location**: `/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`

**Strategy**: Use `useImperativeHandle` with `forwardRef` to expose `requestPermission` to parent component.

**Changes**:

1. **Import additional hooks** (line 3):
```typescript
import { useState, useImperativeHandle, forwardRef } from 'react';
```

2. **Define ref handle type** (after line 12):
```typescript
export interface VoiceInputHandle {
  requestPermission: () => Promise<boolean>;
}
```

3. **Update component signature** (line 14):
```typescript
export const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  ({ onTranscript, disabled = false, onRecordingStart }, ref) => {
```

4. **Destructure `requestPermission` from hook** (line 18):
```typescript
const { 
  isRecording, 
  mimeType, 
  startRecording, 
  stopRecording, 
  requestPermission,  // ADD THIS
  error: recorderError 
} = useVoiceRecorder({
  onTimeout: () => {
    setErrorMessage('録音時間が上限に達しました（60秒）');
  },
});
```

5. **Expose via imperative handle** (after line 22, before handleStartRecording):
```typescript
useImperativeHandle(ref, () => ({
  requestPermission,
}), [requestPermission]);
```

6. **Close the component properly** (after line 144):
```typescript
  );  // Close forwardRef function
});

VoiceInput.displayName = 'VoiceInput';
```

### Step 3: Modify `chat/page.tsx`

**Location**: `/home/noritakasawada/project/20260115/business-idea-ai/src/app/chat/page.tsx`

**Changes**:

1. **Import useRef** (line 3):
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
```

2. **Import VoiceInputHandle** (line 8):
```typescript
import { VoiceInput, VoiceInputHandle } from '@/components/VoiceInput';
```

3. **Create ref** (after line 18):
```typescript
const voiceInputRef = useRef<VoiceInputHandle>(null);
```

4. **Add useEffect for permission request** (after line 18, before existing useEffect):
```typescript
// Request microphone permission on mount
useEffect(() => {
  let isMounted = true;
  
  const requestMicPermission = async () => {
    if (!voiceInputRef.current) {
      console.error('VoiceInput ref is null during mount');
      return;
    }
    
    try {
      const granted = await voiceInputRef.current.requestPermission();
      if (isMounted && !granted) {
        // Permission denied - user can retry by pressing record button
        console.info('Microphone permission not granted on initial load');
      }
    } catch (err) {
      // Some browsers (Safari) may block permission request without user gesture
      if (isMounted) {
        console.info('Could not pre-request microphone permission:', err);
      }
    }
  };
  
  requestMicPermission();
  
  return () => {
    isMounted = false;
  };
}, []);
```

5. **Update VoiceInput usage** (line 132):
```typescript
<VoiceInput 
  ref={voiceInputRef}
  onTranscript={handleTranscript} 
  disabled={isLoading} 
  onRecordingStart={handleRecordingStart} 
/>
```

---

## 4. Dependencies and Constraints

### Dependencies
- React hooks: `useCallback`, `useImperativeHandle`, `forwardRef`, `useRef`
- Browser API: `navigator.mediaDevices.getUserMedia`

### Constraints
- Must handle browser environments where microphone is not available
- Must handle user denying permission gracefully
- Should not block page rendering if permission is denied

### Browser Compatibility
- `getUserMedia` is widely supported in modern browsers
- Permission request UI varies by browser

---

## 5. Risk Analysis

### Potential Issues

1. **Permission denied on mount**
   - Risk: User denies permission, error state is set
   - Mitigation: Log warning but allow page to function. User can retry by pressing record button.

2. **Multiple permission requests**
   - Risk: If `requestPermission` is called multiple times rapidly
   - Mitigation: `getOrCreateStream` already checks for active stream before requesting

3. **SSR/hydration issues**
   - Risk: `navigator.mediaDevices` not available during SSR
   - Mitigation: useEffect only runs on client side, safe to use

4. **Race conditions**
   - Risk: User presses record button before permission completes
   - Mitigation: `startRecording` already calls `getOrCreateStream`, which will reuse existing stream

### Edge Cases

1. **Browser doesn't support getUserMedia**
   - Handled by existing error handling in `getOrCreateStream`

2. **User grants then revokes permission**
   - Stream will become inactive, `getOrCreateStream` will request again

3. **Tab is backgrounded during permission request**
   - Browser handles this, request will complete when tab is foregrounded

4. **Browser policy restrictions (Safari/Firefox)**
   - Some browsers block getUserMedia without user gesture
   - Handled by try-catch in useEffect, falls back to button-press permission

---

## 6. Testing Plan

### Manual Testing

1. **Fresh load test**
   - Open chat page in new tab
   - Verify permission dialog appears immediately
   - Grant permission
   - Press record button, verify no second permission dialog

2. **Permission denied test**
   - Open chat page in new tab
   - Deny permission
   - Verify error message is shown
   - Press record button, verify permission is requested again

3. **Existing session test**
   - Grant permission on mount
   - Record multiple voice messages
   - Verify no additional permission requests

4. **Browser compatibility test**
   - Test on Chrome, Firefox, Safari, Edge
   - Verify permission dialog behavior

5. **Browser policy test (Safari/iOS)**
   - Open chat page in Safari desktop
   - Check console for permission request success/failure
   - Test on iOS Safari and iOS Chrome
   - Document browser-specific behavior
   - Verify fallback to button-press permission works if mount-time request fails

### Automated Testing (Future)
- Add unit tests for `requestPermission` function
- Mock `getUserMedia` to test error handling
- Test ref exposure in VoiceInput component

---

## 7. Rollback Procedure

If issues arise:

1. **Revert Step 3** (chat/page.tsx)
   - Remove useEffect
   - Remove ref from VoiceInput usage
   
2. **Revert Step 2** (VoiceInput.tsx)
   - Remove forwardRef wrapper
   - Remove useImperativeHandle
   
3. **Revert Step 1** (useVoiceRecorder.ts)
   - Remove requestPermission from return value
   - Remove requestPermission function
   - Revert interface changes

This allows gradual rollback if only certain parts cause issues.

---

## 8. Success Criteria

- [ ] Permission dialog appears when chat page loads
- [ ] Error is handled gracefully if permission is denied
- [ ] First press of record button is immediate (no delay for permission)
- [ ] No regressions in existing recording functionality
- [ ] No console errors in browser
- [ ] Works across major browsers (Chrome, Firefox, Safari, Edge)

---

## 9. Implementation Notes

### Why useImperativeHandle?
- VoiceInput is a presentation component, doesn't need to expose internal logic in props
- Imperative handle keeps API clean while allowing parent to trigger initialization
- Follows React best practices for exposing component methods

### Why useEffect in chat/page.tsx?
- Component mount is the appropriate time to request permission
- useEffect with empty dependency array ensures single execution
- Client-side only execution avoids SSR issues

### Alternative Approaches Considered

1. **Pass requestPermission as callback prop**
   - More props = more complex API
   - Imperative handle is more appropriate for this use case

2. **Request permission in _app.tsx globally**
   - Not all pages need microphone
   - Better to request only when needed

3. **Create separate permission hook**
   - Over-engineering for this single use case
   - Simpler to expose existing functionality

---

## 10. Post-Implementation Verification

After implementation:

1. **Code Review Checklist**
   - [ ] All TypeScript types are correct
   - [ ] Error handling is comprehensive
   - [ ] No memory leaks (refs are cleaned up)
   - [ ] Console warnings are appropriate

2. **Manual Testing**
   - [ ] Permission flow works on desktop
   - [ ] Permission flow works on mobile
   - [ ] Error states are displayed correctly
   - [ ] No regressions in recording functionality

3. **Performance Check**
   - [ ] Page load time not significantly impacted
   - [ ] No blocking operations on mount
   - [ ] Stream is reused correctly (no duplicate requests)

---

## 11. Review Findings (Opus 4.5 - Think Harder Mode)

**Review Date**: 2026-01-15  
**Reviewer**: Opus 4.5  
**Status**: APPROVED WITH MODIFICATIONS

### Critical Issues Found and Resolved

1. **Component Unmount Safety** ✓ FIXED
   - Added `isMounted` flag to prevent state updates after unmount
   - Added cleanup function to useEffect

2. **Ref Null Safety** ✓ FIXED
   - Added explicit null check for `voiceInputRef.current`
   - Added error logging for debugging

3. **Browser Policy Restrictions** ✓ FIXED
   - Added try-catch to handle browsers that block getUserMedia without user gesture
   - Safari and Firefox may block mount-time permission requests
   - Graceful fallback to button-press permission

4. **Enhanced Testing Requirements** ✓ ADDED
   - Added Safari/iOS-specific test cases
   - Documented browser-specific behavior expectations

### Design Decisions Validated

- **useImperativeHandle approach**: APPROVED - appropriate for this use case
- **Error handling strategy**: APPROVED - comprehensive with fallback
- **Rollback procedure**: APPROVED - adequate coverage
- **Risk analysis**: APPROVED - thorough with additions

### Optional Improvements (Not Required)

- Consider gentler error messaging for mount-time permission denial
- Future: Add analytics to track permission grant/deny rates by browser

### Implementation Clearance

**PROCEED WITH IMPLEMENTATION** using the corrected code in Step 3.

All critical issues have been addressed in the updated plan. The implementation is safe to proceed.

---

## 12. Implementation Summary

**Implementation Date**: 2026-01-15  
**Implemented By**: Sonnet 4.5  
**Build Status**: ✓ PASSED (TypeScript compilation successful)

### Changes Applied

1. **useVoiceRecorder.ts** ✓ COMPLETE
   - Added `requestPermission` function with error handling
   - Updated `UseVoiceRecorderReturn` interface
   - Exported `requestPermission` in return value

2. **VoiceInput.tsx** ✓ COMPLETE
   - Converted to `forwardRef` component
   - Added `VoiceInputHandle` interface
   - Exposed `requestPermission` via `useImperativeHandle`
   - Added displayName for debugging

3. **chat/page.tsx** ✓ COMPLETE
   - Added `voiceInputRef` with proper typing
   - Implemented mount-time permission request with:
     - Component unmount safety (`isMounted` flag)
     - Null reference checking
     - Browser policy error handling (Safari/Firefox compatibility)
   - Updated VoiceInput usage with ref

### Build Verification

```
$ npm run build
✓ Compiled successfully in 3.3s
✓ Running TypeScript
✓ Generating static pages (8/8)
✓ Finalizing page optimization
```

### Manual Testing Required

Please verify the following scenarios:
- [ ] Permission dialog appears on chat page load (Chrome/Edge)
- [ ] Safari desktop: Check console for permission request (may be blocked)
- [ ] iOS Safari: Test permission flow
- [ ] Permission denial: Error handling works correctly
- [ ] Recording button works immediately after permission granted
- [ ] No console errors in browser
- [ ] No React warnings about unmounted components

### Known Behavior

**Safari/iOS**: Some browsers may block `getUserMedia` without user gesture. The implementation handles this gracefully:
- Try-catch prevents crashes
- Falls back to button-press permission request
- Console logs inform about behavior

---

**End of Implementation Plan**
