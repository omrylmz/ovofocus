# Remaining Bugs Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all remaining bugs identified in the bug audit - hook bugs, silent failures, and edge cases.

**Architecture:** Apply consistent error handling patterns using discriminated union result types (established in storage.ts). Fix React hook issues using refs and memoization patterns. Maintain backward compatibility while improving error reporting.

**Tech Stack:** React Native, TypeScript, AsyncStorage, expo-calendar, expo-notifications

---

## Phase 1: High-Priority Hook Bugs (3 tasks)

These bugs cause performance issues, memory leaks, and stale data.

### Task 1: Fix useAppState Continuous Re-subscription

**Problem:** When parent components pass new callback functions on each render, the `options` object changes, causing `handleAppStateChange` to be recreated, which triggers subscription removal and re-addition repeatedly.

**Files:**
- Modify: `src/hooks/useAppState.ts`
- Test: `src/hooks/__tests__/useAppState.test.ts` (create if needed)

**Step 1: Read current implementation**

Verify current code at lines 10-50.

**Step 2: Implement fix using refs for callbacks**

Replace the implementation with refs to maintain stable callback references:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateOptions {
    onBackground?: () => void;
    onForeground?: () => void;
    onInactive?: () => void;
}

export function useAppState(options: UseAppStateOptions = {}) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const [wasInBackground, setWasInBackground] = useState(false);
    const previousState = useRef<AppStateStatus>(AppState.currentState);

    // Use refs to store callbacks - prevents re-subscription on callback changes
    const onBackgroundRef = useRef(options.onBackground);
    const onForegroundRef = useRef(options.onForeground);
    const onInactiveRef = useRef(options.onInactive);

    // Keep refs updated with latest callbacks
    useEffect(() => {
        onBackgroundRef.current = options.onBackground;
        onForegroundRef.current = options.onForeground;
        onInactiveRef.current = options.onInactive;
    });

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = previousState.current;

        // Going to background
        if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
            setWasInBackground(true);
            if (nextAppState === 'background') {
                onBackgroundRef.current?.();
            } else {
                onInactiveRef.current?.();
            }
        }

        // Coming back to foreground
        if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
            onForegroundRef.current?.();
        }

        previousState.current = nextAppState;
        setAppState(nextAppState);
    }, []); // Empty deps - callbacks accessed via refs

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [handleAppStateChange]);

    return {
        appState,
        wasInBackground,
        isActive: appState === 'active',
        isBackground: appState === 'background',
        isInactive: appState === 'inactive',
        resetBackgroundFlag: () => setWasInBackground(false),
    };
}
```

**Step 3: Verify fix compiles**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Test manually in app**

Run: `npm start`
Verify app state transitions work correctly

**Step 5: Commit**

```bash
git add src/hooks/useAppState.ts
git commit -m "fix: prevent useAppState re-subscription on callback changes

Use refs to store callbacks instead of including them in dependency arrays.
This prevents the AppState listener from being removed and re-added on
every parent re-render when callbacks are recreated."
```

---

### Task 2: Fix AnimalDetailModal Stale Closure in Cooldown Interval

**Problem:** The interval callback captures the `interaction` value from when the effect ran, not the current value. While the dependency array correctly includes `interaction`, the interval continues using the old closure.

**Files:**
- Modify: `src/components/AnimalDetailModal.tsx:204-221`

**Step 1: Read current implementation**

Verify the cooldown update effect at lines 204-221.

**Step 2: Implement fix using ref for interaction**

Add a ref to always access the latest interaction value:

```typescript
// Add ref near other refs (around line 140)
const interactionRef = useRef<AnimalInteraction | null>(null);

// Keep ref updated (add after line 233, inside loadInteraction or in a new effect)
useEffect(() => {
    interactionRef.current = interaction;
}, [interaction]);

// Replace the cooldown update effect (lines 204-221) with:
useEffect(() => {
    if (!visible || !interaction) return;

    const updateCooldowns = () => {
        // Use ref to get latest interaction value
        const currentInteraction = interactionRef.current;
        if (!currentInteraction) return;

        setPetCooldown(getPetCooldown(currentInteraction));
        setFeedCooldown(getFeedCooldown(currentInteraction));
        setPlayCooldown(getPlayCooldown(currentInteraction));
        setTrainCooldown(getTrainCooldown(currentInteraction));
        setGroomCooldown(getGroomCooldown(currentInteraction));
        setTalkCooldown(getTalkCooldown(currentInteraction));
    };

    updateCooldowns();
    const interval = setInterval(updateCooldowns, 60000);

    return () => clearInterval(interval);
}, [visible, interaction]);
```

**Step 3: Verify fix compiles**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

**Step 4: Test manually**

Open animal detail modal, wait for cooldowns to update, verify they reflect current interaction state.

**Step 5: Commit**

```bash
git add src/components/AnimalDetailModal.tsx
git commit -m "fix: prevent stale closure in AnimalDetailModal cooldown interval

Use ref to access latest interaction value in setInterval callback.
This ensures cooldown calculations always use current data, not the
value captured when the effect initially ran."
```

---

### Task 3: Verify useCalendar Hook (Investigation Only)

**Problem:** Reported as infinite loop from unstable options, but exploration suggests it may already be fixed.

**Files:**
- Read: `src/hooks/useCalendar.ts`

**Step 1: Investigate current implementation**

Read the file and verify:
1. Options are destructured into primitive values
2. Primitives are used in dependency arrays (not the options object)
3. No object references in deps that could cause infinite loops

**Step 2: Document findings**

If already fixed: Skip and document in commit message
If bug exists: Create detailed fix following same ref pattern as Tasks 1-2

**Step 3: Commit investigation results**

```bash
git commit --allow-empty -m "chore: verify useCalendar hook is not affected by infinite loop

Investigation confirmed options are destructured into primitive values
before use in dependency arrays. No fix needed."
```

---

## Phase 2: Silent Failure Patterns (5 tasks)

Convert void-returning functions to use result types for proper error handling.

### Task 4: Create ServiceResult Type

**Problem:** Services use different error handling patterns. Need a consistent result type.

**Files:**
- Create: `src/types/results.ts`

**Step 1: Create the result types file**

```typescript
/**
 * Generic result types for service operations
 * Provides consistent error handling across all services
 */

// For operations that return data
export type ServiceResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; fallback: T };

// For operations that don't return data (mutations)
export type OperationResult =
    | { success: true }
    | { success: false; error: string };

// For operations that can be unavailable (Expo Go limitations)
export type AvailabilityResult<T> =
    | { available: true; success: true; data: T }
    | { available: true; success: false; error: string; fallback: T }
    | { available: false; reason: string };
```

**Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/results.ts
git commit -m "feat: add generic result types for consistent error handling

Add ServiceResult<T>, OperationResult, and AvailabilityResult<T> types
to standardize how services report success, failure, and unavailability."
```

---

### Task 5: Fix calendarService Silent Failures

**Problem:** `getEvents` and other functions return empty arrays on error, making it impossible to distinguish "no events" from "error occurred".

**Files:**
- Modify: `src/services/calendarService.ts`

**Step 1: Add imports and new return types**

At top of file, add:

```typescript
import { ServiceResult, AvailabilityResult } from '../types/results';
```

**Step 2: Create safe versions of key functions**

Add new functions that return result types (keep old functions for backward compatibility):

```typescript
/**
 * Get events with explicit success/failure reporting
 */
export async function getEventsSafe(
    startDate: Date,
    endDate: Date,
    calendarIds?: string[]
): Promise<AvailabilityResult<CalendarEvent[]>> {
    const cal = await getCalendarModule();
    if (!cal) {
        return { available: false, reason: 'Calendar not available in Expo Go' };
    }

    try {
        const hasPermission = await requestCalendarPermissions();
        if (hasPermission !== 'granted') {
            return {
                available: true,
                success: false,
                error: 'Calendar permission not granted',
                fallback: []
            };
        }

        let ids = calendarIds;
        if (!ids) {
            const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);
            ids = calendars.map(c => c.id);
        }

        if (ids.length === 0) {
            return { available: true, success: true, data: [] };
        }

        const events = await cal.getEventsAsync(ids, startDate, endDate);

        const mappedEvents: CalendarEvent[] = events.map(event => ({
            id: event.id,
            title: event.title || 'Untitled',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            allDay: event.allDay || false,
            calendarId: event.calendarId,
            notes: event.notes,
            location: event.location ?? undefined,
        }));

        return { available: true, success: true, data: mappedEvents };
    } catch (error) {
        console.error('[CalendarService] Error getting events:', error);
        return {
            available: true,
            success: false,
            error: `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: [],
        };
    }
}

/**
 * Get available slots with explicit success/failure reporting
 */
export async function getAvailableSlotsSafe(
    date: Date,
    minDuration: number = 15,
    workHoursStart: number = 9,
    workHoursEnd: number = 18
): Promise<AvailabilityResult<TimeSlot[]>> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursStart, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workHoursEnd, 0, 0);

    const eventsResult = await getEventsSafe(startOfDay, endOfDay);

    if (!eventsResult.available) {
        return eventsResult;
    }

    if (!eventsResult.success) {
        return {
            available: true,
            success: false,
            error: eventsResult.error,
            fallback: [],
        };
    }

    const events = eventsResult.data;
    const sortedEvents = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const availableSlots: TimeSlot[] = [];
    let currentTime = startOfDay;

    for (const event of sortedEvents) {
        if (event.allDay) continue;

        const eventStart = event.startDate;
        const eventEnd = event.endDate;

        if (currentTime < eventStart) {
            const duration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
            if (duration >= minDuration) {
                availableSlots.push({
                    startTime: new Date(currentTime),
                    endTime: new Date(eventStart),
                    duration: Math.floor(duration),
                });
            }
        }

        if (eventEnd > currentTime) {
            currentTime = new Date(eventEnd);
        }
    }

    if (currentTime < endOfDay) {
        const duration = (endOfDay.getTime() - currentTime.getTime()) / (1000 * 60);
        if (duration >= minDuration) {
            availableSlots.push({
                startTime: new Date(currentTime),
                endTime: new Date(endOfDay),
                duration: Math.floor(duration),
            });
        }
    }

    return { available: true, success: true, data: availableSlots };
}
```

**Step 3: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/services/calendarService.ts
git commit -m "feat: add safe calendar functions with explicit error reporting

Add getEventsSafe and getAvailableSlotsSafe that return AvailabilityResult
type to distinguish between: no data, permission denied, and errors.
Original functions preserved for backward compatibility."
```

---

### Task 6: Fix notifications.ts Silent Failures

**Problem:** All notification functions return `void` or `boolean`, with silent try-catch blocks that swallow errors.

**Files:**
- Modify: `src/services/notifications.ts`

**Step 1: Add imports**

```typescript
import { OperationResult, AvailabilityResult } from '../types/results';
```

**Step 2: Add NotificationResult type**

```typescript
export type NotificationResult =
    | { available: true; success: true; notificationId?: string }
    | { available: true; success: false; error: string }
    | { available: false; reason: string };
```

**Step 3: Create safe versions of key functions**

```typescript
/**
 * Send session complete notification with explicit result
 */
export async function sendSessionCompleteNotificationSafe(
    animal: Animal,
    language: Language
): Promise<NotificationResult> {
    if (isAppInForeground()) {
        return { available: true, success: true }; // Skipped intentionally, not an error
    }

    const notif = await getNotificationsModule();
    if (!notif) {
        return { available: false, reason: 'Notifications not available in Expo Go' };
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            return {
                available: true,
                success: false,
                error: 'Notification permission not granted'
            };
        }

        const animalName = getAnimalName(animal.id, language);
        const title = `${animal.emoji} ${t('newAnimalTitle', language)}`;
        const body = `${animalName} - ${t('sessionCompleteBody', language)}`;

        const notificationId = await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { animalId: animal.id },
                categoryIdentifier: 'session',
            },
            trigger: null,
        });

        return { available: true, success: true, notificationId };
    } catch (error) {
        console.error('[Notifications] Error sending session notification:', error);
        return {
            available: true,
            success: false,
            error: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Cancel all notifications with explicit result
 */
export async function cancelAllNotificationsSafe(): Promise<NotificationResult> {
    const notif = await getNotificationsModule();
    if (!notif) {
        return { available: false, reason: 'Notifications not available in Expo Go' };
    }

    try {
        await notif.cancelAllScheduledNotificationsAsync();
        return { available: true, success: true };
    } catch (error) {
        console.error('[Notifications] Error canceling notifications:', error);
        return {
            available: true,
            success: false,
            error: `Failed to cancel notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
```

**Step 4: Verify compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/services/notifications.ts
git commit -m "feat: add safe notification functions with explicit error reporting

Add sendSessionCompleteNotificationSafe and cancelAllNotificationsSafe
that return NotificationResult to distinguish between unavailable,
permission denied, and actual errors."
```

---

### Task 7: Fix dailyRewards.ts Silent Failures

**Problem:** `loadDailyRewardsState` returns default state on error, hiding failures.

**Files:**
- Modify: `src/utils/dailyRewards.ts`

**Step 1: Add safe load function**

```typescript
import { ServiceResult } from '../types/results';

/**
 * Load daily rewards state with explicit success/failure
 */
export async function loadDailyRewardsStateSafe(): Promise<ServiceResult<DailyRewardsState>> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (!data) {
            return { success: true, data: getDefaultState() };
        }
        return { success: true, data: { ...getDefaultState(), ...JSON.parse(data) } };
    } catch (error) {
        console.error('[DailyRewards] Failed to load state:', error);
        return {
            success: false,
            error: `Failed to load daily rewards: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: getDefaultState(),
        };
    }
}
```

**Step 2: Verify and commit**

```bash
git add src/utils/dailyRewards.ts
git commit -m "feat: add loadDailyRewardsStateSafe with explicit error reporting"
```

---

### Task 8: Fix goalTracking.ts Caller Doesn't Check saveAllGoals

**Problem:** `saveAllGoals` returns boolean but callers don't check it.

**Files:**
- Modify: `src/utils/goalTracking.ts`

**Step 1: Update callers to check return value**

In `createGoal`, `updateGoalProgress`, and `deleteGoal`, check the return value:

```typescript
export async function createGoal(type: GoalType, target: number): Promise<Goal> {
    if (target < 1) {
        throw new Error('Goal target must be at least 1');
    }

    const now = new Date().toISOString();
    const goal: Goal = {
        id: generateId(),
        type,
        target,
        progress: 0,
        createdAt: now,
        completedAt: null,
        lastUpdatedAt: now,
    };

    const goals = await getAllGoals();
    goals.push(goal);
    const saved = await saveAllGoals(goals);

    if (!saved) {
        throw new Error('Failed to save goal');
    }

    console.log(`[GoalTracking] Created ${type} goal with target ${target}`);
    return goal;
}
```

Apply similar pattern to `updateGoalProgress` and `deleteGoal`.

**Step 2: Commit**

```bash
git add src/utils/goalTracking.ts
git commit -m "fix: check saveAllGoals return value and throw on failure

Callers now properly handle save failures instead of silently continuing
with potentially inconsistent state."
```

---

## Phase 3: Edge Case Fixes (Select High-Impact)

### Task 9: Fix getAnimalNotes Ambiguous Return

**Problem:** Returns `null` for both "not found" and "error" - already partially addressed, verify complete.

**Files:**
- Read: `src/utils/storage.ts`

**Step 1: Verify implementation**

Check if `getAnimalNotes` or `getAnimalNotesSafe` exists with proper result type.

**Step 2: If missing, add safe version**

```typescript
export type AnimalNotesResult =
    | { status: 'found'; notes: string }
    | { status: 'not_found' }
    | { status: 'error'; error: string };

export async function getAnimalNotesSafe(animalId: string): Promise<AnimalNotesResult> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ANIMAL_NOTES);
        if (!data) {
            return { status: 'not_found' };
        }
        const notes: Record<string, string> = JSON.parse(data);
        if (animalId in notes) {
            return { status: 'found', notes: notes[animalId] };
        }
        return { status: 'not_found' };
    } catch (error) {
        console.error('[Storage] Failed to get animal notes:', error);
        return {
            status: 'error',
            error: `Failed to get notes: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
```

**Step 3: Commit**

```bash
git add src/utils/storage.ts
git commit -m "feat: add getAnimalNotesSafe with discriminated union result"
```

---

### Task 10: Fix loadOnboarding Silent Failure

**Problem:** Returns default state on error without indication.

**Files:**
- Modify: `src/utils/storage.ts`

**Step 1: Add safe version**

```typescript
export async function loadOnboardingSafe(): Promise<ServiceResult<OnboardingState>> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
        const defaultState: OnboardingState = {
            hasCompletedTutorial: false,
            hasSeenGestureHints: false,
            hasSeenCollectionIntro: false,
        };
        if (!data) {
            return { success: true, data: defaultState };
        }
        return { success: true, data: { ...defaultState, ...JSON.parse(data) } };
    } catch (error) {
        console.error('[Storage] Failed to load onboarding state:', error);
        return {
            success: false,
            error: `Failed to load onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: {
                hasCompletedTutorial: false,
                hasSeenGestureHints: false,
                hasSeenCollectionIntro: false,
            },
        };
    }
}
```

**Step 2: Commit**

```bash
git add src/utils/storage.ts
git commit -m "feat: add loadOnboardingSafe with explicit error reporting"
```

---

## Phase 4: Final Verification

### Task 11: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Run linting**

```bash
npm run lint
```

Expected: No errors

---

### Task 12: Manual Smoke Test

**Step 1: Start app**

```bash
npm start
```

**Step 2: Test critical flows**

- [ ] Start and complete a focus session
- [ ] View collection
- [ ] Open animal detail modal, verify cooldowns update
- [ ] Background and foreground app
- [ ] Check settings persistence

**Step 3: Final commit if any issues found**

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-3 | Hook bugs (re-subscription, stale closures) |
| 2 | 4-8 | Silent failure patterns (result types) |
| 3 | 9-10 | Edge case fixes |
| 4 | 11-12 | Verification |

**Total: 12 tasks**

Each task is a focused, atomic change that can be tested and committed independently.
