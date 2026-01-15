# Implementation Plan: Push-to-Talk for VoiceInput Component

**Date**: 2026-01-15
**Target File**: `/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`
**Assignee**: Sonnet (Implementation)
**Reviewer**: Opus (Post-implementation review)

---

## 1. Purpose and Background

### Objective
Convert the VoiceInput component from toggle-based recording to Push-to-Talk (PTT) mode, where recording starts when the button is pressed and stops when released.

### Current Behavior
- Click to start recording
- Click again to stop recording and process STT

### Target Behavior
- Press (mousedown/touchstart) to start recording
- Release (mouseup/touchend) to stop recording and process STT
- Support edge cases (mouse leave, touch cancel)

---

## 2. Scope of Changes

### Files to Modify
1. `/home/noritakasawada/project/20260115/business-idea-ai/src/components/VoiceInput.tsx`

### Symbols/Functions Affected
- `handleToggleRecording` (line 23-49) → Split into two handlers
- Button event handlers (line 56) → Replace onClick with PTT events
- UI text (line 105) → Update from "タップして話す" to "押して話す"

### Dependencies
- No external file dependencies
- Uses existing hooks: `useVoiceRecorder`
- Uses existing function: `speechToText`

---

## 3. Implementation Steps

### Step 1: Split Event Handlers
**Action**: Replace `handleToggleRecording` with two separate handlers

**Old Code** (lines 23-49):
```typescript
const handleToggleRecording = async () => {
  setErrorMessage(null);

  if (isRecording) {
    // Stop recording and process STT
    ...
  } else {
    // Start recording
    await startRecording();
  }
};
```

**New Code**:
```typescript
const handleStartRecording = async () => {
  // Guard clause: prevent start if disabled, processing, or already recording
  if (disabled || isProcessing || isRecording) return;

  setErrorMessage(null);
  try {
    await startRecording();
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : '録音開始に失敗しました');
  }
};

const handleStopRecording = async () => {
  // Guard clause: only process if currently recording and not disabled
  if (disabled || !isRecording) return;

  setIsProcessing(true);
  try {
    const result = await stopRecording();
    if (result) {
      const { blob, mimeType: recordedMimeType } = result;
      const sttResult = await speechToText(blob, recordedMimeType);
      if (sttResult.transcript) {
        onTranscript(sttResult.transcript);
      } else {
        setErrorMessage('音声を認識できませんでした');
      }
    }
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : '音声処理に失敗しました');
  } finally {
    setIsProcessing(false);
  }
};
```

**Rationale**:
- Separation of concerns: start and stop are distinct operations
- **CRITICAL**: Guard clauses now check `disabled`, `isProcessing`, and `isRecording` to prevent race conditions
- Error handling added to `handleStartRecording` (was missing in initial draft)
- `handleStopRecording` only processes if currently recording
- Prevents multiple simultaneous operations (e.g., starting while processing)

---

### Step 2: Update Button Event Handlers
**Action**: Replace `onClick` with PTT-specific events

**Old Code** (line 56):
```typescript
onClick={handleToggleRecording}
```

**New Code**:
```typescript
onMouseDown={handleStartRecording}
onMouseUp={handleStopRecording}
onMouseLeave={handleStopRecording}
onTouchStart={(e) => {
  e.preventDefault();
  handleStartRecording();
}}
onTouchEnd={(e) => {
  e.preventDefault();
  handleStopRecording();
}}
onTouchCancel={handleStopRecording}
```

**Note**: The guard clauses in the handlers themselves prevent execution when disabled/processing, so explicit checks in inline handlers are not needed.

**Rationale**:
- `onMouseDown`/`onMouseUp`: Standard mouse PTT behavior
- `onMouseLeave`: Stops recording if user drags cursor away from button
- `onTouchStart`/`onTouchEnd`: Mobile touch support
- `e.preventDefault()`: Prevents double-firing of touch + mouse events on mobile
- `onTouchCancel`: Handles interrupted touch (e.g., incoming call)

---

### Step 3: Update UI Text
**Action**: Change status text to reflect PTT interaction

**Old Code** (line 105):
```typescript
{isProcessing ? '音声を処理中...' : isRecording ? '録音中...' : 'タップして話す'}
```

**New Code**:
```typescript
{isProcessing ? '音声を処理中...' : isRecording ? '録音中...' : '押して話す'}
```

**Rationale**:
- "押して話す" (Press to speak) is more accurate for PTT interaction
- Maintains consistency with other status messages

---

## 4. Edge Cases and Error Handling

### Edge Case 1: Mouse Drag Off Button
**Scenario**: User presses button, drags mouse away, releases
**Solution**: `onMouseLeave={handleStopRecording}` ensures recording stops
**Risk**: Low - standard browser behavior

### Edge Case 2: Touch Interruption
**Scenario**: Incoming call or notification during touch recording
**Solution**: `onTouchCancel={handleStopRecording}` handles interruption
**Risk**: Low - browser provides touchcancel event

### Edge Case 3: Double Stop Call
**Scenario**: Multiple events trigger `handleStopRecording` simultaneously
**Solution**: Guard clause `if (!isRecording) return;` prevents double-processing
**Risk**: Low - guard clause is fail-safe

### Edge Case 4: Touch + Mouse Double-Fire
**Scenario**: Some mobile browsers fire both touch and mouse events
**Solution**: `e.preventDefault()` in touch handlers blocks mouse event
**Risk**: Medium - tested pattern, but device-specific behavior may vary

### Edge Case 5: Rapid Press/Release
**Scenario**: User presses and immediately releases (< 100ms)
**Solution**: Existing `useVoiceRecorder` logic should handle minimal recording
**Expected**: May result in "音声を認識できませんでした" error (acceptable UX)
**Risk**: Low - user will naturally learn to hold longer

---

## 5. Testing Plan

### Manual Testing Checklist
- [ ] Desktop mouse: Press and hold → Records continuously
- [ ] Desktop mouse: Release → Stops and processes STT
- [ ] Desktop mouse: Drag away while holding → Stops recording
- [ ] Mobile touch: Press and hold → Records continuously
- [ ] Mobile touch: Release → Stops and processes STT
- [ ] Mobile touch: No double-fire of events
- [ ] Touch cancel (simulate with DevTools) → Stops recording
- [ ] Rapid press/release → Handles gracefully
- [ ] Button disabled state → No recording starts
- [ ] Error states → Display correctly

### Test Environments
- Desktop browsers: Chrome, Firefox, Safari
- Mobile browsers: Chrome Mobile, Safari iOS
- Devices: iOS, Android

### Regression Testing
- [ ] Recording timeout (60s) still works
- [ ] Error messages display correctly
- [ ] Processing spinner shows during STT
- [ ] Transcript callback fires correctly
- [ ] Disabled prop prevents interaction

---

## 6. Rollback Plan

### If Issues Occur
1. Revert to previous `onClick={handleToggleRecording}` pattern
2. Single commit makes rollback trivial via `git revert`

### Rollback Command
```bash
git revert <commit-hash>
```

### Critical Issues That Would Trigger Rollback
- PTT not working on major browsers
- Touch events causing page scroll issues
- STT processing fails more frequently than before
- Accessibility regression (screen reader compatibility)

---

## 7. Risks and Concerns

### Risk 1: Browser Compatibility
**Concern**: Touch event handling varies across browsers
**Mitigation**: Use standard events (well-supported), include preventDefault()
**Severity**: Low

### Risk 2: User Confusion
**Concern**: Users accustomed to toggle pattern may be confused
**Mitigation**: Clear UI text "押して話す" guides behavior
**Severity**: Low - PTT is common pattern (e.g., walkie-talkie apps)

### Risk 3: Accidental Stops
**Concern**: Mouse leaving button area stops recording unintentionally
**Mitigation**: This is standard PTT behavior and prevents stuck recording state
**Severity**: Low - expected behavior

### Risk 4: Accessibility
**Concern**: PTT may be harder for users with motor impairments
**Mitigation**: Consider adding keyboard-based alternative in future (spacebar PTT)
**Severity**: Medium - out of scope for this change, note for future enhancement

---

## 8. Future Enhancements (Out of Scope)

- Keyboard PTT support (spacebar or Enter key)
- Visual feedback for "holding" state (e.g., pulsing border)
- Haptic feedback on mobile devices
- Configurable PTT vs Toggle mode (user preference)

---

## 9. Pre-Implementation Checklist

- [x] Requirements clearly defined
- [x] Scope accurately identified
- [x] Step-by-step procedure documented
- [x] Edge cases considered
- [x] Error handling maintained
- [x] Test plan created
- [x] Rollback plan documented
- [x] **Opus review completed** ✅
- [x] Implementation ready to proceed ✅

---

## 10. Review Notes

### Reviewer: Opus (Think Harder Mode)

**Review Status**: ✅ COMPLETED (2026-01-15)

**Review Questions**:
1. Are there any race conditions between event handlers?
2. Does the guard clause in `handleStopRecording` cover all scenarios?
3. Are there any memory leaks from event listeners?
4. Is the preventDefault() placement correct?
5. Does this break any existing integrations?

**Review Findings**:

1. ✅ **Race Conditions**: RESOLVED
   - Initial plan had potential race condition between async handlers
   - Fixed by adding comprehensive guard clauses checking `disabled`, `isProcessing`, `isRecording`
   - Prevents starting recording while processing or already recording
   - Prevents stopping when not recording or when disabled

2. ✅ **Guard Clauses**: ENHANCED
   - Original plan only checked `!isRecording` in stop handler
   - Updated to check all relevant states in both handlers
   - Prevents edge cases like pressing button while STT is processing

3. ✅ **Memory Leaks**: NO ISSUES
   - Event handlers are inline JSX, React manages cleanup automatically
   - No manual addEventListener calls that would need cleanup

4. ✅ **preventDefault() Placement**: ACCEPTABLE
   - Placement is correct for preventing touch+mouse double-fire
   - Risk of preventing scroll is mitigated by guard clauses
   - Standard pattern for touch-based controls

5. ✅ **Error Handling**: FIXED
   - Added try-catch to `handleStartRecording` (was missing in initial draft)
   - Both handlers now have comprehensive error handling

6. ✅ **Existing Integrations**: NO BREAKING CHANGES
   - Props interface unchanged (`onTranscript`, `disabled`)
   - Hook usage unchanged (`useVoiceRecorder`)
   - Only internal implementation changed

**Recommendations**:
- Proceed with implementation using revised code
- Test thoroughly on mobile devices for touch behavior
- Monitor for any UX issues with `onMouseLeave` sensitivity

**Action Items**:
- [x] Opus review completed with extended thinking
- [x] Critical issues identified and fixed
- [x] Plan revised with corrections
- [x] Ready for implementation

---

## Approval

- [x] Plan Reviewed by Opus (Critical Review Mode)
- [x] Issues Addressed (Guard clauses, error handling)
- [x] ✅ **APPROVED FOR IMPLEMENTATION**
