# Comprehensive Bug Audit Report

**Date**: 2026-02-12
**Audited by**: 5 parallel agents (State, Hook, UI, Service, Screen)
**Scope**: Entire codebase (~97 files, ~43K LOC)
**Raw findings**: 124 bugs → **88 unique bugs after deduplication**

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 7 | Crashes, memory leaks, data loss |
| High | 12 | Incorrect behavior, state corruption, missing platform support |
| Medium | 30 | Edge cases, race conditions, poor error handling |
| Low | 39 | Code quality, minor UX, potential future issues |

---

## CRITICAL BUGS (7)

### C1: Memory Leak in HatchModal — Missing Animation Cleanup
**File**: `src/components/HatchModal.tsx:39-58`
**Source**: UI Auditor
**Description**: ConfettiParticle starts 5 animations in useEffect (translateY, translateX, rotate, opacity, scale) but never calls cancelAnimation() on unmount.
**Impact**: Memory accumulates with each hatch celebration, degrading performance over time.
**Fix**: Add cleanup return to useEffect with cancelAnimation() for all 5 shared values.

### C2: Memory Leak in AchievementModal — Missing Animation Cleanup
**File**: `src/components/AchievementModal.tsx:44-63`
**Source**: UI Auditor
**Description**: ConfettiParticle and StarParticle components use withRepeat animations without cleanup.
**Impact**: Repeated achievement unlocks accumulate memory leaks.
**Fix**: Add cancelAnimation() cleanup in useEffect return for both particle components.

### C3: Memory Leak in DailyRewardModal — Missing Animation Cleanup
**File**: `src/components/DailyRewardModal.tsx:39-61`
**Source**: UI Auditor
**Description**: SparkleParticle uses withRepeat animations without unmount cleanup.
**Impact**: Daily reward displays accumulate memory.
**Fix**: Add cancelAnimation() cleanup in SparkleParticle useEffect return.

### C4: Conditional Hook Call in AnimalCard
**File**: `src/components/AnimalCard.tsx:258`
**Source**: UI Auditor
**Description**: Cleanup return statement is inside a conditional block (lines 180-258), potentially violating Rules of Hooks. useEffect must always call hooks in the same order.
**Impact**: May cause React Hooks errors and unpredictable behavior depending on `collected` prop changes.
**Fix**: Move cleanup return outside of conditional logic; cancel all animations unconditionally.

### C5: Data Import Type Guard Mutates Input
**File**: `src/utils/dataImport.ts:158-163`
**Source**: Service Auditor
**Description**: isValidStats() is a type guard that MUTATES the input object (sanitizing negative values). Type guards should validate, not mutate.
**Impact**: Side effects during validation create unexpected behavior and violate function contract.
**Fix**: Separate validation from sanitization — create a sanitizeStats() function called explicitly before validation.

### C6: Data Import Rollback Failure Leaves Corrupted State
**File**: `src/utils/dataImport.ts:263-289`
**Source**: Service Auditor
**Description**: restoreFromBackup() overwrites all data with AsyncStorage.multiSet(), but if rollback itself fails, the app is left with partial/corrupted data.
**Impact**: Users can lose ALL their data if import fails and rollback also fails.
**Fix**: Implement two-phase commit: write to temp keys first, verify, then atomically swap.

### C7: Memory Leak in AnimatedBackground — Missing Animation Cleanup
**File**: `src/components/AnimatedBackground.tsx:64-86`
**Source**: UI Auditor
**Description**: useEffect starts infinite withRepeat animations (colorProgress, pulseValue) without returning cleanup function.
**Impact**: Background animations continue running after unmount, wasting CPU/battery.
**Fix**: Add cancelAnimation() cleanup return for colorProgress and pulseValue.

---

## HIGH BUGS (12)

### H1: useTimer — Interval Not Cleared Before Creating New One
**File**: `src/hooks/useTimer.ts:79-98`
**Source**: Hook Auditor
**Description**: New interval created at line 82 without first clearing existing interval. If effect re-runs before cleanup, old interval ID is lost — orphaned interval.
**Impact**: Memory leak; multiple intervals updating same state causes rapid re-renders and incorrect timer values.
**Fix**: Clear existing interval before creating new one: `if (intervalRef.current) clearInterval(intervalRef.current);`

### H2: useCalendar — Infinite Loop Risk with Changing Dependencies
**File**: `src/hooks/useCalendar.ts:187, 216`
**Source**: Hook Auditor
**Description**: loadCalendarData depends on [minSlotDuration, workHoursStart, workHoursEnd]. If parent passes inline objects or computed values that change on each render, the callback is recreated, triggering the useEffect that calls it again.
**Impact**: Infinite render loop, app freeze/crash.
**Fix**: Use refs for configuration values to stabilize dependencies.

### H3: useCalendar — hasAutoLoadedRef Prevents Reloading on Config Changes
**File**: `src/hooks/useCalendar.ts:209-216`
**Source**: Hook Auditor
**Description**: hasAutoLoadedRef set to true after first auto-load and never reset. Config changes (work hours, etc.) don't trigger reload.
**Impact**: Calendar data becomes stale when user changes work hours. Manual refresh required.
**Fix**: Reset hasAutoLoadedRef when significant options change.

### H4: Session Restoration Missing Pomodoro State
**File**: `src/context/GameContext.tsx:478-501`
**Source**: Screen + State Auditors
**Description**: Session restore recovers basic timer but loses Pomodoro-specific state (currentPhase, workSessionsCompleted, isPomodoroMode).
**Impact**: Users lose Pomodoro context on app kill. Work phase restored as regular session.
**Fix**: Extend PersistedSession to include Pomodoro fields; restore them in GameContext load effect.

### H5: Pomodoro Auto-Resume Broken After Modal Close
**File**: `app/index.tsx:823-835`
**Source**: Screen Auditor
**Description**: handleModalClose in Pomodoro mode only sets local phase to 'work' without resetting the underlying timer. Timer state remains stale.
**Impact**: After completing a Pomodoro work session and closing hatch modal, timer shows stale values.
**Fix**: Call pomodoroTimer.reset() in handleModalClose when in Pomodoro mode.

### H6: Stale Closure in completeSession Rollback
**File**: `src/context/GameContext.tsx:743-746`
**Source**: State Auditor
**Description**: Captures previousStats/Collection/DailyProgress before dispatching COMPLETE_SESSION. If a parallel dispatch happens between dispatch and rollback, rollback overwrites unrelated changes.
**Impact**: Race condition where settings update between COMPLETE_SESSION and rollback loses the settings change.
**Fix**: Use functional dispatch or capture state inside try-catch before dispatching.

### H7: COMPLETE_SESSION Reducer Doesn't Clear isPaused/pauseCount
**File**: `src/context/GameContext.tsx:310-318`
**Source**: State Auditor
**Description**: Reducer sets sessionState to 'completed' but leaves isPaused and pauseCount set if session was paused when completed.
**Impact**: UI may show "Paused" badge on completed session screen.
**Fix**: Add `isPaused: false, pauseCount: 0` to COMPLETE_SESSION reducer.

### H8: Missing onRequestClose in GestureHint Modal
**File**: `src/components/GestureHint.tsx:189`
**Source**: UI Auditor
**Description**: Modal component lacks onRequestClose prop, required on Android for hardware back button.
**Impact**: Android users cannot dismiss gesture hint modal with back button — trapped.
**Fix**: Add `onRequestClose={onDismiss}` to Modal props.

### H9: Streak Freeze Award Logic Error — Skips Milestones
**File**: `src/utils/streakFreeze.ts:115-140`
**Source**: Service Auditor
**Description**: checkAndAwardFreeze only awards one freeze per call. If streak jumps multiple milestones (via data import), intermediate milestones are skipped.
**Impact**: Users miss freeze rewards they should have earned.
**Fix**: Loop to award ALL missed milestones: `while (currentStreak >= nextMilestone && freezeCount < MAX_FREEZES) { award; update; }`

### H10: Offline Queue Race Condition — No Atomic Lock
**File**: `src/utils/offlineQueue.ts:289-295`
**Source**: Service Auditor
**Description**: isProcessing flag checked and set non-atomically. Two simultaneous processQueue() calls (app resume + network restore) can both pass the check.
**Impact**: Queue processed twice, causing duplicate operations or data corruption.
**Fix**: Use promise-based lock or proper queue mechanism preventing concurrent processing.

### H11: Android zIndex Missing Elevation in AnimalCard
**File**: `src/components/AnimalCard.tsx:294-302`
**Source**: UI Auditor
**Description**: Multiple overlay elements use zIndex without matching elevation. Android requires both.
**Impact**: On Android, badges/glows/overlays render in wrong z-order.
**Fix**: Add elevation property matching zIndex throughout file (lines 365-404, 455-469).

### H12: Missing Accessibility Labels on Interactive Elements
**File**: Multiple (ExportModal, DailyRewardModal, CalendarView)
**Source**: UI Auditor
**Description**: Multiple Pressable elements lack accessibilityLabel and accessibilityHint.
**Impact**: Screen reader users cannot effectively use parts of the app.
**Fix**: Add descriptive accessibilityLabel to all Pressable/button elements.

---

## MEDIUM BUGS (30)

### M1: useTimer — startTimeRef Race Condition
**File**: `src/hooks/useTimer.ts:78-98`
**Source**: Hook Auditor
**Description**: Effect relies on startTimeRef.current being set before interval callback runs. Works due to execution order but depends on implementation details.
**Fix**: Move startTimeRef assignment into the effect itself.

### M2: Pomodoro Auto-Advance — Timeout Not Cleaned on Unmount
**File**: `src/hooks/usePomodoroTimer.ts:139-149`
**Source**: Hook + Screen Auditors
**Description**: Auto-advance timeout has no cleanup if component unmounts during 100ms delay.
**Fix**: Store timeout in ref, clear on cleanup.

### M3: Pomodoro Duration Reset Timing
**File**: `src/hooks/usePomodoroTimer.ts:151-156`
**Source**: Hook Auditor
**Description**: Duration reset effect fires between phase change and timer restart, potentially setting wrong duration.
**Fix**: Remove getPhaseDuration from dependency array.

### M4: useToleranceSystem — Stale effectiveTolerance in Callback
**File**: `src/hooks/useToleranceSystem.ts:145-147`
**Source**: Hook Auditor
**Description**: Callback captures potentially stale tolerance values from creation time.
**Fix**: Use ref to access current effectiveTolerance.

### M5: completeSession Lock — Error in Error Handler
**File**: `src/context/GameContext.tsx:719-824`
**Source**: Screen Auditor
**Description**: If error handler itself throws, isCompletingRef lock stays engaged forever.
**Fix**: Double-wrap error handler in try-catch, ensure lock always releases.

### M6: Daily Progress Not Reset at Midnight During Active Session
**File**: `src/context/GameContext.tsx:759` + `src/utils/storage.ts:552-576`
**Source**: Screen + State Auditors
**Description**: Session completed at midnight uses yesterday's dailyProgress date. Progress doesn't reset until next app load.
**Fix**: Check current date before calling incrementDailyProgress.

### M7: failSession Missing Guard Against Double Call
**File**: `src/context/GameContext.tsx:826-846`
**Source**: Screen Auditor
**Description**: Unlike completeSession which has ref-based lock, failSession only has state guard. Rapid calls could double-increment failure stats.
**Fix**: Add ref-based lock similar to completeSession.

### M8: incrementSession — Invalid lastSessionDate Parsing
**File**: `src/utils/storage.ts:313-316, 326-332`
**Source**: State Auditor
**Description**: Creates Date from lastSessionDate without checking parse success. Invalid date produces "NaN-NaN-NaN" string, breaking streak logic.
**Fix**: Validate date parse: `if (isNaN(lastDate.getTime())) newStreak = 1;`

### M9: getCooldownRemaining — Wrong Return for Invalid Timestamps
**File**: `src/utils/storage.ts:739-746`
**Source**: State Auditor
**Description**: Returns FULL cooldown duration for invalid timestamps instead of 0. Locks interaction unnecessarily.
**Fix**: Change to `return 0` for invalid timestamps.

### M10: restoreActiveSession — pausedAt Not Validated
**File**: `src/utils/storage.ts:1097-1101`
**Source**: State Auditor
**Description**: Malformed pausedAt string causes NaN in elapsed time calculation.
**Fix**: Validate pausedAt timestamp, clear session if invalid.

### M11: restoreActiveSession — No Upper Bound on Duration
**File**: `src/utils/storage.ts:1064-1068`
**Source**: State Auditor
**Description**: Doesn't validate duration is reasonable. Corrupted huge duration shows timer for years.
**Fix**: Cap validation at 7200 seconds (2 hours).

### M12: pauseCount Can Go Negative from Corrupted Storage
**File**: `src/context/GameContext.tsx:280-290`
**Source**: State Auditor
**Description**: No lower bound check on pauseCount. Corrupted storage value could allow infinite pauses.
**Fix**: Add `pauseCount < 0` check in PAUSE_SESSION reducer.

### M13: Missing Validation for Negative accumulatedPauseTime
**File**: `src/context/GameContext.tsx:303-308`
**Source**: State Auditor
**Description**: accumulatedPauseTime from payload not validated as non-negative.
**Fix**: `Math.max(0, newAccumulatedPauseTime + ...)`

### M14: unlockAchievement — Busy-Wait Lock with setTimeout
**File**: `src/utils/storage.ts:1145-1150`
**Source**: State Auditor
**Description**: Boolean lock with 50ms retry creates busy-wait. Multiple concurrent calls all retry simultaneously.
**Fix**: Replace with async queue or exponential backoff with max retries.

### M15: Stats Screen Missing Loading State
**File**: `app/stats.tsx:78-233`
**Source**: Screen Auditor
**Description**: Stats screen shows empty state instead of loading indicator while data loads.
**Fix**: Add `if (state.isLoading) return <LoadingIndicator />;` before hasData check.

### M16: Navigation — Modal Screens Missing State Cleanup
**File**: `app/collection.tsx`, `app/settings.tsx`, `app/stats.tsx`
**Source**: Screen Auditor
**Description**: No useFocusEffect to reset local state (search, filters) when navigating away.
**Fix**: Add useFocusEffect cleanup.

### M17: Level Bonuses Recalculation on Every Render
**File**: `app/index.tsx:263-275`
**Source**: Screen Auditor
**Description**: levelBonuses useMemo depends on state.collection array ref, which changes on every ADD_TO_COLLECTION.
**Fix**: Memoize based on collection length or stable selector.

### M18: Potential NaN in StyledEgg Color Calculations
**File**: `src/components/StyledEgg.tsx:83-116`
**Source**: UI Auditor
**Description**: Color functions use parseInt without hex validation. Invalid hex produces "#NaNNaNNaN".
**Fix**: Validate hex format before parsing, return fallback color on NaN.

### M19: FloatingParticles Escaping Timer Area
**File**: `src/components/FloatingParticles.tsx:126-136`
**Source**: UI Auditor
**Description**: Particles spawn at 0.4 height but travel up -0.15, entering timer area (0.25).
**Fix**: Increase initial spawn to 0.5 or reduce upward travel.

### M20: OnboardingFlow — Animation Cleanup Mismatch
**File**: `src/components/OnboardingFlow.tsx:100-210`
**Source**: UI Auditor
**Description**: useEffect cleanup tries to cancel animations from different animation type branches.
**Fix**: Track active animations with refs, clean only active ones.

### M21: Ambient Sound Volume — Clears Failed Sound Cache Unnecessarily
**File**: `src/services/ambientSoundService.ts:284-294`
**Source**: Service Auditor
**Description**: setVolume() clears failedSounds, retrying sounds that failed for non-volume reasons.
**Fix**: Only clear failedSounds for volume-related failures.

### M22: Notification Permission — Repeated Requests
**File**: `src/services/notifications.ts:159,212,394,521`
**Source**: Service Auditor
**Description**: Multiple functions call requestPermissions() without caching. Denied permission causes repeated requests.
**Fix**: Cache permission status, request once per app lifecycle.

### M23: Share Service — Empty Message for Unknown Types
**File**: `src/services/shareService.ts:359-362`
**Source**: Service Auditor
**Description**: Default case assigns empty message instead of throwing error.
**Fix**: Throw error for unsupported share types.

### M24: Missing Spanish Translations
**File**: `src/i18n/translations.ts`
**Source**: Service Auditor
**Description**: Code supports 'es' via getLocalizedDayName() but translation file only has 'en' and 'tr'.
**Fix**: Add Spanish translations or remove 'es' from supported languages.

### M25: Daily Goal Reminder Scheduling Edge Case
**File**: `src/services/notifications.ts:466-475`
**Source**: Service Auditor
**Description**: 2 PM check has no buffer. If called at 1:59 PM, schedules for 2:00 PM (1 minute away).
**Fix**: Add buffer to schedule for tomorrow if within 10 minutes of target.

### M26: Audio Manager — Sound Cache Never Freed
**File**: `src/services/audioManager.ts:504`
**Source**: Service Auditor
**Description**: Sounds cached in soundCache but never unloaded except on cleanup(). Grows indefinitely.
**Fix**: Implement LRU cache with max size.

### M27: Analytics Provider — No Re-Enable After Transient Failures
**File**: `src/services/analyticsService.ts:358,510`
**Source**: Service Auditor
**Description**: Disabled providers have no mechanism to re-enable after cooldown.
**Fix**: Add re-enable mechanism after cooldown period.

### M28: Settings Emergency Pause Duration Not Configurable
**File**: `app/settings.tsx:599-1478`
**Source**: Screen Auditor
**Description**: emergencyPauseDuration exists in Settings interface but has no UI to configure it.
**Fix**: Add slider or button grid in Session section.

### M29: CalendarView — Dynamic Styles Recreation
**File**: `src/components/CalendarView.tsx:52-278`
**Source**: UI Auditor
**Description**: createStyles(theme) called inside component with useMemo, re-creating full StyleSheet on each theme reference change.
**Fix**: Move createStyles to module level or use inline overrides for dynamic values.

### M30: Division by Zero in Average Session Duration
**File**: `src/utils/statsCalculations.ts:322`
**Source**: Service Auditor
**Description**: Uses Math.max(1, completedSessions) when 0. Returns totalFocusMinutes / 1 instead of 0.
**Fix**: Return 0 or default when completedSessions is 0.

---

## LOW BUGS (39)

### L1-L5: Test Expectation Mismatches
- **L1**: useResponsive test expects timerFontSize 24-48, impl uses 36-56 (`src/hooks/__tests__/useResponsive.test.ts:66-69`)
- **L2**: useResponsive test expects progressRingSize 210-400, impl uses 120-200 (`src/hooks/__tests__/useResponsive.test.ts:72-77`)
- **L3**: Streak calculation edge case near midnight (`src/utils/goalTracking.ts:314-317`)
- **L4**: Goal progress returns 100% for target=0 (`src/utils/goalTracking.ts:463-465`)
- **L5**: Stats validation allows non-integer totalFocusMinutes (`src/utils/validation.ts:76`)

### L6-L10: Missing Validation / Edge Cases
- **L6**: ThemeContext isDarkMode doesn't handle null colorScheme explicitly (`src/context/ThemeContext.tsx:35-36`)
- **L7**: emergencyPause doesn't check sessionState before dispatch (`src/context/GameContext.tsx:584-589`)
- **L8**: DAILY_REWARD cycle array access without bounds check (`src/utils/dailyRewards.ts:138,165`)
- **L9**: PersistedSession doesn't validate accumulatedPauseTime <= duration (`src/utils/validation.ts:247-255`)
- **L10**: completeSession doesn't validate focusMinutes parameter (`src/context/GameContext.tsx:719`)

### L11-L15: Error Handling Gaps
- **L11**: updateSettings returns old settings on error instead of throwing (`src/utils/storage.ts:479-482`)
- **L12**: Audio manager silent failure for unknown sound types (`src/services/audioManager.ts:463-466`)
- **L13**: Data export file cleanup may fail silently (`src/utils/dataExport.ts:214-222`)
- **L14**: Notification listener missing unsubscribe null check (`app/_layout.tsx:29-33`)
- **L15**: Settings update rollback causes UI flicker (`src/context/GameContext.tsx:852-863`)

### L16-L20: Code Quality / Consistency
- **L16**: Hardcoded font sizes in multiple modals (`HatchModal.tsx`, `AchievementModal.tsx`, `OnboardingFlow.tsx`)
- **L17**: Magic number opacity values instead of theme constants (`ExportModal.tsx`, `CalendarView.tsx`)
- **L18**: Inconsistent border radius usage (`CalendarView.tsx`, `EggStylePicker.tsx`)
- **L19**: Migration v1 may overwrite user language preference (`src/utils/migrations.ts:32-63`)
- **L20**: Egg style unlock depends on both id and condition (`src/data/eggStyles.ts:186-194`)

### L21-L25: Performance / Efficiency
- **L21**: Collection search not debounced (`app/collection.tsx:530-532`)
- **L22**: Milestone data recalculates due to unstable i18n reference (`app/index.tsx:282-330`)
- **L23**: Calendar permission checked redundantly on every call (`src/services/calendarService.ts:164-165`)
- **L24**: Inefficient useMemo dependencies in AnimalCard (`src/components/AnimalCard.tsx:102-114`)
- **L25**: Logger __DEV__ may be undefined in some environments (`src/utils/logger.ts:114`)

### L26-L30: Minor UX Issues
- **L26**: Filter badge doesn't count active sort changes (`app/collection.tsx:812-814`)
- **L27**: Timer warnings not reset between sessions for screen readers (`app/index.tsx:683-689`)
- **L28**: Quick return toast may show on immediate background (`app/index.tsx:609-617`)
- **L29**: Ambient sound brief continuation after session fail (`app/index.tsx:518-556`)
- **L30**: Collection skeleton count doesn't account for screen height (`app/collection.tsx:647-649`)

### L31-L35: Data Integrity / Edge Cases
- **L31**: Session clock skew allows timer manipulation (`src/utils/storage.ts:1084-1110`)
- **L32**: Datetime validation schema inconsistency (`src/utils/validation.ts:48`)
- **L33**: getStats doesn't validate lastSessionDate format (`src/utils/storage.ts:273-295`)
- **L34**: Level bonus no validation for negative percentage (`src/utils/levelBonuses.ts:173-181`)
- **L35**: Accessibility rarity translation type assertion unsafe (`src/utils/accessibility.ts:82`)

### L36-L39: Miscellaneous
- **L36**: Duplicate PixelButton accessibility role (`src/components/PixelButton.tsx:198`)
- **L37**: Console key warnings in StyledEgg arrays (`src/components/StyledEgg.tsx:156-169`)
- **L38**: Animal emoji duplication in collection (`src/data/animals.ts:51,59,65`)
- **L39**: useToleranceSystem duplicate cleanup logic (`src/hooks/useToleranceSystem.ts:163-177`)

---

## Recommended Fix Order

### Phase 1: Critical (C1-C7) — Memory leaks, data safety, hook violations
### Phase 2: High (H1-H12) — Correctness, platform support, state management
### Phase 3: Medium (M1-M30) — Edge cases, validation, UX
### Phase 4: Low (L1-L39) — Quality, consistency, minor issues

### Excluded from fixes:
- Pre-existing TS errors (11 known)
- Service BUG-022 (streak freeze "cheating" via AsyncStorage) — design decision, not fixable without encrypted storage
- Theme typography scaling (L-class) — documented limitation of portrait-locked app
