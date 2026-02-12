# Comprehensive Bug Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan.

**Goal:** Find and fix all bugs in the Ovo Focus codebase through a parallel multi-agent sweep.

**Architecture:** 5 specialized audit agents run in parallel, each examining a distinct domain. Their findings are consolidated into a prioritized bug report. Then bugs are fixed in severity order (Critical > High > Medium > Low), with verification after each fix.

**Tech Stack:** React Native, Expo, TypeScript, React Context/useReducer, Reanimated, AsyncStorage

---

## Phase 1: Parallel Bug Discovery (5 agents, run simultaneously)

### Task 1: Dispatch State Auditor Agent

**Type:** Research only (no code changes)

**Agent prompt:**
> Audit all state management and persistence code in Ovo Focus for bugs. Read every file listed below thoroughly and report ALL bugs found.
>
> **Files to audit:**
> - `src/context/GameContext.tsx` — Main state (useReducer, actions, persistence)
> - `src/context/ThemeContext.tsx` — Theme state
> - `src/utils/storage.ts` — AsyncStorage persistence layer
> - `src/utils/migrations.ts` — Data migration logic
> - `src/utils/validation.ts` — Data validation
> - `src/types/results.ts` — Result types
>
> **What to look for:**
> 1. State machine violations: Can the session reach invalid states? (e.g., `active` + `completed` simultaneously, `pauseCount` going negative)
> 2. Reducer logic errors: Missing cases, wrong state transitions, mutation of state
> 3. Race conditions: Concurrent dispatches, async actions that don't guard state
> 4. Persistence bugs: Data corruption on save/load, missing error handling, partial writes
> 5. Migration bugs: Missing migration paths, data loss during upgrades
> 6. Stale closure bugs: Actions capturing old state values
>
> **Output format for each bug:**
> ```
> BUG-S[N]: [Title]
> Severity: Critical|High|Medium|Low
> File: [path]:[line range]
> Description: [What's wrong]
> Impact: [What happens to users]
> Fix: [Recommended fix approach]
> ```

### Task 2: Dispatch Hook Auditor Agent

**Type:** Research only (no code changes)

**Agent prompt:**
> Audit all React hooks in Ovo Focus for bugs. Read every file listed below thoroughly and report ALL bugs found.
>
> **Files to audit:**
> - `src/hooks/useTimer.ts` — Main countdown timer
> - `src/hooks/useAppState.ts` — App foreground/background handling
> - `src/hooks/useAppStateAnimation.ts` — Animation state on app transitions
> - `src/hooks/useCalendar.ts` — Calendar integration
> - `src/hooks/useToleranceSystem.ts` — Background tolerance grace period
> - `src/hooks/usePomodoroTimer.ts` — Pomodoro interval logic
> - `src/hooks/useResponsive.ts` — Responsive sizing calculations
> - `src/hooks/useReducedMotion.ts` — Accessibility reduced motion
> - `src/hooks/__tests__/useTimer.test.ts` — Existing timer tests (check coverage gaps)
> - `src/hooks/__tests__/useResponsive.test.ts` — Existing responsive tests
>
> **What to look for:**
> 1. useEffect dependency array bugs: Missing deps causing stale closures, extra deps causing re-runs
> 2. Memory leaks: Intervals/timeouts not cleared on unmount, subscriptions not cancelled
> 3. Race conditions: Timer drift, state updates after unmount
> 4. Infinite loop risks: Effects that trigger their own dependencies
> 5. Cleanup failures: Missing cleanup functions in useEffect
> 6. Incorrect memoization: useMemo/useCallback with wrong deps
>
> **Output format for each bug:**
> ```
> BUG-H[N]: [Title]
> Severity: Critical|High|Medium|Low
> File: [path]:[line range]
> Description: [What's wrong]
> Impact: [What happens to users]
> Fix: [Recommended fix approach]
> ```

### Task 3: Dispatch UI Auditor Agent

**Type:** Research only (no code changes)

**Agent prompt:**
> Audit all UI components in Ovo Focus for bugs. Read every file listed below thoroughly and report ALL bugs found.
>
> **Files to audit (47 component files):**
> - `src/components/Egg.tsx` — Main egg with enchanted animations
> - `src/components/egg/EmberParticles.tsx` — Ember particle system
> - `src/components/egg/FireflyParticles.tsx` — Firefly particle system
> - `src/components/egg/GroundShadow.tsx` — Ground shadow effect
> - `src/components/egg/PulseRings.tsx` — Pulse ring animations
> - `src/components/HatchModal.tsx` — Hatch celebration modal
> - `src/components/AchievementModal.tsx` — Achievement popup
> - `src/components/AnimalDetailModal.tsx` — Animal detail view
> - `src/components/DailyRewardModal.tsx` — Daily reward popup
> - `src/components/ExportModal.tsx` — Data export modal
> - `src/components/AnimatedBackground.tsx` — Background animations
> - `src/components/FloatingParticles.tsx` — Floating particle effects
> - `src/components/GestureHint.tsx` — First-time gesture overlay
> - `src/components/OnboardingFlow.tsx` — Onboarding screens
> - `src/components/PixelButton.tsx` — Standard button component
> - `src/components/AnimalCard.tsx` — Collection grid card
> - `src/components/CalendarView.tsx` — Calendar component
> - `src/components/DailyProgressRing.tsx` — Progress ring
> - `src/components/StyledEgg.tsx` — Styled egg variant
> - `src/components/EggStylePicker.tsx` — Egg style selector
> - `src/components/ShieldSelector.tsx` — Shield power-up selector
> - `src/components/TimerProgressBar.tsx` — Timer progress bar
> - `src/components/ProgressIndicator.tsx` — Generic progress
> - `src/components/StreakBadge.tsx` — Streak display badge
> - `src/components/StreakCelebration.tsx` — Streak milestone celebration
> - `src/components/StreakFreezeIndicator.tsx` — Freeze indicator
> - `src/components/MilestoneCelebration.tsx` — Milestone effects
> - `src/components/ErrorBoundary.tsx` — Error boundary wrapper
> - `src/components/ErrorFallback.tsx` — Error UI fallback
> - `src/components/EmptyState.tsx` — Empty state displays
> - `src/components/LoadingIndicator.tsx` — Loading spinner
> - `src/components/QuickReturnToast.tsx` — Quick return toast
> - `src/components/ScrollToTopButton.tsx` — Scroll to top
> - `src/components/SkeletonCard.tsx` — Loading skeleton
> - `src/components/session/SessionHeader.tsx` — Session header bar
> - `src/components/session/SessionControls.tsx` — Start/pause/give-up buttons
> - `src/components/session/PowerUpControls.tsx` — Power-up UI
> - `src/components/session/TimerDisplay.tsx` — Timer text display
> - `src/components/session/EggContainer.tsx` — Egg wrapper
> - `src/components/session/InteractiveEgg.tsx` — Egg with gestures
> - `src/components/session/SessionStatsBar.tsx` — Stats bar
> - `src/components/stats/StatsChart.tsx` — Statistics chart
> - `src/components/stats/StatsSummary.tsx` — Statistics summary
>
> **What to look for:**
> 1. Animation memory leaks: Shared values not cancelled, withRepeat without cancellation
> 2. Layout bugs: Missing overflow handling, incorrect zIndex/elevation for Android
> 3. Missing error boundaries around crash-prone components
> 4. Accessibility issues: Missing accessibilityLabel, accessibilityRole
> 5. Prop type bugs: Optional props used without defaults, wrong types
> 6. Reanimated issues: Accessing .value on UI thread from JS thread, worklet violations
> 7. Conditional hook calls: Hooks inside if/for/early-return
> 8. Key prop issues in lists: Missing or non-unique keys
>
> **Output format for each bug:**
> ```
> BUG-U[N]: [Title]
> Severity: Critical|High|Medium|Low
> File: [path]:[line range]
> Description: [What's wrong]
> Impact: [What happens to users]
> Fix: [Recommended fix approach]
> ```

### Task 4: Dispatch Service Auditor Agent

**Type:** Research only (no code changes)

**Agent prompt:**
> Audit all services, utilities, and data files in Ovo Focus for bugs. Read every file listed below thoroughly and report ALL bugs found.
>
> **Files to audit:**
> - `src/services/notifications.ts` — Push notification scheduling
> - `src/services/calendarService.ts` — Calendar integration
> - `src/services/audioManager.ts` — Sound effects
> - `src/services/ambientSoundService.ts` — Ambient background sounds
> - `src/services/quickActionsService.ts` — App quick actions
> - `src/services/shareService.ts` — Social sharing
> - `src/services/analyticsService.ts` — Analytics tracking
> - `src/utils/statsCalculations.ts` — Statistics math
> - `src/utils/dailyRewards.ts` — Daily reward logic
> - `src/utils/goalTracking.ts` — Goal tracking logic
> - `src/utils/streakFreeze.ts` — Streak freeze logic
> - `src/utils/levelBonuses.ts` — Level bonus calculations
> - `src/utils/dataExport.ts` — Data export functionality
> - `src/utils/dataImport.ts` — Data import functionality
> - `src/utils/offlineQueue.ts` — Offline action queue
> - `src/utils/logger.ts` — Logging utility
> - `src/utils/accessibility.ts` — Accessibility helpers
> - `src/data/animals.ts` — Animal definitions and rarity weights
> - `src/data/achievements.ts` — Achievement definitions
> - `src/data/eggStyles.ts` — Egg style definitions
> - `src/i18n/translations.ts` — Translation strings
> - `src/styles/theme.ts` — Design tokens
>
> **What to look for:**
> 1. Unhandled async errors: Missing try/catch, swallowed promises, missing .catch()
> 2. Data integrity: Wrong rarity weights (should sum to 100%), broken achievement conditions
> 3. Edge cases: Division by zero, empty array access, undefined property access
> 4. i18n gaps: Missing translation keys, hardcoded strings, interpolation bugs
> 5. Resource leaks: Audio not unloaded, calendar permissions not checked
> 6. Calculation bugs: Off-by-one errors, wrong date math, timezone issues
> 7. Import/export bugs: Data corruption, missing validation, version incompatibility
>
> **Output format for each bug:**
> ```
> BUG-V[N]: [Title]
> Severity: Critical|High|Medium|Low
> File: [path]:[line range]
> Description: [What's wrong]
> Impact: [What happens to users]
> Fix: [Recommended fix approach]
> ```

### Task 5: Dispatch Screen Auditor Agent

**Type:** Research only (no code changes)

**Agent prompt:**
> Audit all app screen files and cross-cutting integration in Ovo Focus for bugs. Read every file listed below thoroughly and report ALL bugs found.
>
> **Files to audit:**
> - `app/_layout.tsx` — Root layout, providers, navigation
> - `app/index.tsx` — Main focus timer screen
> - `app/collection.tsx` — Animal collection screen
> - `app/settings.tsx` — Settings screen
> - `app/stats.tsx` — Statistics screen
>
> Also cross-reference with the components these screens use to find integration bugs.
>
> **What to look for:**
> 1. Navigation bugs: Missing back handlers, incorrect modal presentation, deep link issues
> 2. Provider ordering: Missing providers, wrong nesting order
> 3. Screen lifecycle: Data not refreshing on focus, stale data after background
> 4. Loading states: Missing loading UI while data loads, flash of empty content
> 5. Error handling: Unhandled errors propagating to users, missing error boundaries
> 6. Prop drilling: Data passed through multiple layers incorrectly
> 7. Screen-specific state bugs: Local state not reset on navigation, leaked state between screens
> 8. Safe area handling: Content under status bar or nav bar
>
> **Output format for each bug:**
> ```
> BUG-X[N]: [Title]
> Severity: Critical|High|Medium|Low
> File: [path]:[line range]
> Description: [What's wrong]
> Impact: [What happens to users]
> Fix: [Recommended fix approach]
> ```

---

## Phase 2: Consolidation (after all 5 agents complete)

### Task 6: Consolidate Bug Report

**Step 1:** Collect all bug findings from the 5 agents.

**Step 2:** Deduplicate — if multiple agents report the same bug, keep the most detailed version.

**Step 3:** Sort by severity: Critical > High > Medium > Low.

**Step 4:** Write consolidated report to `docs/plans/2026-02-12-bug-audit-report.md` with:
- Summary statistics (count by severity)
- Full bug table with ID, title, severity, file, description
- Recommended fix order

**Step 5:** Commit the report.

```bash
git add docs/plans/2026-02-12-bug-audit-report.md
git commit -m "docs: add comprehensive bug audit report"
```

---

## Phase 3: Fix All Bugs (sequential, severity order)

### Task 7: Fix Critical Bugs

For each Critical bug in the report:

**Step 1:** Read the affected file(s).

**Step 2:** Implement the fix.

**Step 3:** Verify the fix doesn't break TypeScript: `npx tsc --noEmit`

**Step 4:** Commit after each fix or logical group of related fixes.

### Task 8: Fix High Bugs

Same process as Task 7, for High severity bugs.

### Task 9: Fix Medium Bugs

Same process as Task 7, for Medium severity bugs.

### Task 10: Fix Low Bugs

Same process as Task 7, for Low severity bugs.

### Task 11: Final Verification

**Step 1:** Run `npx tsc --noEmit` — expect 0 new errors (pre-existing 11 are known).

**Step 2:** Run any existing tests: `npx jest --passWithNoTests`

**Step 3:** Update `docs/plans/2026-02-12-bug-audit-report.md` with fix status for each bug.

**Step 4:** Final commit.

```bash
git add -A
git commit -m "fix: resolve all bugs found in comprehensive audit"
```
