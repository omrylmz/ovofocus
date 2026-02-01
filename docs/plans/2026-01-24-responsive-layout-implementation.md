# Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create consistent UI layouts across all phone sizes with no overlapping views.

**Architecture:** Create a `useResponsive` hook providing screen-aware dimensions and scaling utilities. Refactor the Home screen to a **stacked vertical layout** where timer and egg are in separate sections (not overlapping). Apply same patterns to Collection and Modals.

**Tech Stack:** React Native, React Native Reanimated, Expo, useWindowDimensions

**CRITICAL LAYOUT CHANGE:** Timer and Egg must be **stacked vertically** (timer above, egg below), NOT layered on top of each other. This is the key fix for the overlap issue.

```
┌─────────────────────────┐
│  Header (OvoFocus)      │  ← Fixed
├─────────────────────────┤
│  Stats Bar              │  ← Fixed
├─────────────────────────┤
│  Timer + Progress Ring  │  ← Flex section (separate from egg!)
│      17:52 / 29%        │
├─────────────────────────┤
│    Egg + Glow Effects   │  ← Flex section (separate from timer!)
│     "Keep going!"       │
├─────────────────────────┤
│  Pause / Give Up        │  ← Fixed
├─────────────────────────┤
│  Emergency / Shield     │  ← Fixed
└─────────────────────────┘
```

---

## Task 1: Create useResponsive Hook

**Files:**
- Create: `src/hooks/useResponsive.ts`
- Create: `src/hooks/__tests__/useResponsive.test.ts`

**Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useResponsive.test.ts
import { renderHook } from '@testing-library/react-native';
import { useResponsive } from '../useResponsive';

// Mock useWindowDimensions
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useWindowDimensions: () => ({ width: 375, height: 812 }),
}));

describe('useResponsive', () => {
  it('returns screen dimensions', () => {
    const { result } = renderHook(() => useResponsive());

    expect(result.current.screenWidth).toBe(375);
    expect(result.current.screenHeight).toBe(812);
  });

  it('identifies small screens correctly', () => {
    const { result } = renderHook(() => useResponsive());

    // 375 is not a small screen (< 360)
    expect(result.current.isSmallScreen).toBe(false);
  });

  it('scales values proportionally', () => {
    const { result } = renderHook(() => useResponsive());

    // Base width is 375, so scale(100) should return 100
    expect(result.current.scale(100)).toBe(100);
  });

  it('clamps values within bounds', () => {
    const { result } = renderHook(() => useResponsive());

    expect(result.current.clamp(50, 100, 200)).toBe(100); // Below min
    expect(result.current.clamp(150, 100, 200)).toBe(150); // In range
    expect(result.current.clamp(300, 100, 200)).toBe(200); // Above max
  });

  it('calculates egg size within bounds', () => {
    const { result } = renderHook(() => useResponsive());

    const eggSize = result.current.eggSize;
    expect(eggSize).toBeGreaterThanOrEqual(150);
    expect(eggSize).toBeLessThanOrEqual(320);
  });

  it('provides correct column count for collection grid', () => {
    const { result } = renderHook(() => useResponsive());

    // 375 width should give 3 columns
    expect(result.current.gridColumns).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="useResponsive" --watchAll=false`
Expected: FAIL with "Cannot find module '../useResponsive'"

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useResponsive.ts
import { useWindowDimensions } from 'react-native';

// Base dimensions (iPhone 11/12/13)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Breakpoints
const SMALL_SCREEN_WIDTH = 360;
const LARGE_SCREEN_WIDTH = 428;

// Egg sizing bounds
const EGG_MIN_SIZE = 150;
const EGG_MAX_SIZE = 320;
const EGG_SCREEN_RATIO = 0.45; // 45% of screen width

// Grid column breakpoints
const GRID_2_COL_MAX = 360;
const GRID_4_COL_MIN = 500;

export interface ResponsiveValues {
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;

  // Screen size categories
  isSmallScreen: boolean;
  isLargeScreen: boolean;

  // Scaling utilities
  scale: (size: number) => number;
  scaleVertical: (size: number) => number;
  clamp: (value: number, min: number, max: number) => number;

  // Pre-calculated responsive values
  eggSize: number;
  timerFontSize: number;
  progressRingSize: number;
  gridColumns: number;
  modalMaxWidth: number;

  // Layout helpers
  horizontalPadding: number;
  contentMaxWidth: number;
}

export function useResponsive(): ResponsiveValues {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Screen size categories
  const isSmallScreen = screenWidth < SMALL_SCREEN_WIDTH;
  const isLargeScreen = screenWidth >= LARGE_SCREEN_WIDTH;

  // Scale factor based on screen width
  const widthScale = screenWidth / BASE_WIDTH;
  const heightScale = screenHeight / BASE_HEIGHT;

  // Utility functions
  const scale = (size: number): number => {
    return Math.round(size * widthScale);
  };

  const scaleVertical = (size: number): number => {
    return Math.round(size * heightScale);
  };

  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  // Pre-calculated responsive values
  const eggSize = clamp(
    Math.round(screenWidth * EGG_SCREEN_RATIO),
    EGG_MIN_SIZE,
    EGG_MAX_SIZE
  );

  // Timer font scales with egg
  const timerFontSize = clamp(
    Math.round(eggSize * 0.3),
    24,
    48
  );

  // Progress ring slightly larger than egg
  const progressRingSize = clamp(
    Math.round(eggSize * 1.4),
    210,
    400
  );

  // Grid columns based on width
  const gridColumns = screenWidth < GRID_2_COL_MAX
    ? 2
    : screenWidth >= GRID_4_COL_MIN
      ? 4
      : 3;

  // Modal max width for tablets
  const modalMaxWidth = Math.min(screenWidth - 32, 400);

  // Layout helpers
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const contentMaxWidth = Math.min(screenWidth, 600);

  return {
    screenWidth,
    screenHeight,
    isSmallScreen,
    isLargeScreen,
    scale,
    scaleVertical,
    clamp,
    eggSize,
    timerFontSize,
    progressRingSize,
    gridColumns,
    modalMaxWidth,
    horizontalPadding,
    contentMaxWidth,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="useResponsive" --watchAll=false`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/hooks/useResponsive.ts src/hooks/__tests__/useResponsive.test.ts
git commit -m "feat: add useResponsive hook for consistent layouts

Provides screen-aware dimensions, scaling utilities, and pre-calculated
responsive values for egg, timer, grid, and modal sizing."
```

---

## Task 2: Update Home Screen Layout Structure (CRITICAL - Stacked Layout)

**Files:**
- Modify: `app/index.tsx`

**This is the KEY task that fixes the overlap. Timer and Egg become separate stacked sections.**

**Step 1: Import useResponsive**

At the top of `app/index.tsx`, add the import:

```typescript
import { useResponsive } from '../src/hooks/useResponsive';
```

**Step 2: Add useResponsive to HomeScreen component**

Inside `HomeScreen()`, after the existing hooks, add:

```typescript
const responsive = useResponsive();
```

**Step 3: Add new styles for stacked layout**

Add these new styles to `createStyles`:

```typescript
const createStyles = (theme: Theme, responsive: { horizontalPadding: number }) => StyleSheet.create({
    // ... existing styles ...
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start', // Changed - stack from top
        paddingHorizontal: responsive.horizontalPadding,
        paddingTop: 8,
        paddingBottom: 16,
    },
    // NEW: Separate section for timer
    timerSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    // NEW: Separate section for egg
    eggSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    // ... rest of styles ...
});
```

**Step 4: Update the JSX to use stacked layout**

In the `{/* Main content */}` section, wrap Timer and Egg in separate Views:

```tsx
{/* Main content */}
<View style={styles.content}>
    {/* Timer Section - ABOVE egg, not overlapping */}
    <View style={styles.timerSection}>
        <EnhancedTimerDisplay
            formattedTime={formattedTime}
            isRunning={isRunning}
            progress={progress}
            sessionState={state.sessionState}
            isPaused={state.isPaused}
            language={state.settings.language}
            theme={theme}
            progressRingSize={responsive.progressRingSize}
            timerFontSize={responsive.timerFontSize}
        />
    </View>

    {/* Pomodoro Phase Indicator - between timer and egg */}
    {isPomodoroMode && state.sessionState === 'active' && (
        <View style={styles.pomodoroIndicator}>
            {/* ... existing pomodoro indicator content ... */}
        </View>
    )}

    {/* Egg Section - BELOW timer, not overlapping */}
    <View style={styles.eggSection}>
        <InteractiveEgg
            sessionState={state.sessionState}
            progress={progress}
            duration={duration}
            warningLevel={warningLevel as 0 | 1 | 2 | 3}
            language={state.settings.language}
            hapticsEnabled={state.settings.hapticsEnabled}
            hasSeenGestureHints={state.settings.hasSeenGestureHints}
            eggStyleId={state.settings.selectedEggStyle}
            onStart={handleStart}
            onShowGestureHints={() => setShowGestureHints(true)}
        />
    </View>

    {/* Session Controls */}
    <SessionControls ... />

    {/* Power-up Controls */}
    <PowerUpControls ... />
</View>
```

**Step 5: Update styles creation in component**

Change the useMemo for styles:

```typescript
const styles = useMemo(() => createStyles(theme, { horizontalPadding: responsive.horizontalPadding }), [theme, responsive.horizontalPadding]);
```

**Step 6: Run tests and verify no regressions**

Run: `npm test -- --watchAll=false`
Expected: All existing tests pass

**Step 7: Commit**

```bash
git add app/index.tsx
git commit -m "refactor: stack timer above egg to fix overlap

Timer and egg are now in separate flex sections that stack
vertically. This prevents any overlap between them."
```

---

## Task 3: Create Responsive Egg Container Component

**Files:**
- Create: `src/components/session/EggContainer.tsx`
- Modify: `src/components/session/index.ts`

**Step 1: Create EggContainer component**

```typescript
// src/components/session/EggContainer.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';

interface EggContainerProps {
  children: React.ReactNode;
}

/**
 * A responsive container for the egg and timer that:
 * - Centers content in available space
 * - Scales proportionally to screen size
 * - Never overlaps with header or controls
 */
export function EggContainer({ children }: EggContainerProps) {
  const { eggSize, progressRingSize } = useResponsive();

  return (
    <View style={[styles.container, { minHeight: progressRingSize + 60 }]}>
      <View style={[styles.content, { width: progressRingSize, height: progressRingSize }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Step 2: Export from index**

Add to `src/components/session/index.ts`:

```typescript
export { EggContainer } from './EggContainer';
```

**Step 3: Commit**

```bash
git add src/components/session/EggContainer.tsx src/components/session/index.ts
git commit -m "feat: add EggContainer for responsive egg sizing

Centers egg content and scales proportionally to screen size."
```

---

## Task 4: Update Egg Component with Responsive Sizing

**Files:**
- Modify: `src/components/Egg.tsx`

**Step 1: Add useResponsive import**

```typescript
import { useResponsive } from '../hooks/useResponsive';
```

**Step 2: Use responsive sizing in component**

Inside the `Egg` function, add:

```typescript
const { eggSize } = useResponsive();

// Calculate derived sizes
const glowSize = Math.round(eggSize * 1.4);
const innerGlowSize = Math.round(eggSize * 1.0);
const sparkleContainerSize = Math.round(eggSize * 1.25);
const warningGlowSize = Math.round(eggSize * 1.55);
```

**Step 3: Update styles to use dynamic values**

Replace the static StyleSheet with a function or inline styles:

```typescript
// Container height based on egg size
const containerHeight = Math.round(eggSize * 1.9);

// In return statement, update View styles:
<View
    style={[styles.container, { height: containerHeight }]}
    // ... rest of props
>
    {/* Outer glow */}
    <Animated.View
        style={[
            styles.glow,
            glowStyle,
            {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: currentEggStyle.primaryColor
            }
        ]}
        // ...
    />

    {/* Warning glow */}
    {warningLevel > 0 && (
        <Animated.View
            style={[
                styles.warningGlow,
                warningGlowStyle,
                {
                    width: warningGlowSize,
                    height: warningGlowSize,
                    borderRadius: warningGlowSize / 2,
                    backgroundColor: WARNING_COLORS[warningLevel]
                }
            ]}
            // ...
        />
    )}

    {/* Sparkle container */}
    {sessionState === 'active' && progress > 0.3 && (
        <Animated.View
            style={[
                styles.sparkleContainer,
                sparkleStyle,
                { width: sparkleContainerSize, height: sparkleContainerSize }
            ]}
            // ...
        >
            {/* sparkles */}
        </Animated.View>
    )}

    {/* Inner glow */}
    <Animated.View
        style={[
            styles.innerGlow,
            innerGlowStyle,
            {
                width: innerGlowSize,
                height: innerGlowSize,
                borderRadius: innerGlowSize / 2,
                backgroundColor: currentEggStyle.primaryColor
            }
        ]}
        // ...
    />

    {/* Egg - pass size to StyledEgg */}
    <Animated.View style={[styles.eggContainer, animatedStyle]}>
        {sessionState !== 'failed' && sessionState !== 'completed' && (
            <StyledEgg
                eggStyle={currentEggStyle}
                size={Math.round(eggSize * 0.5)} // Scaled from 80
                showPattern={true}
                glowColor={currentEggStyle.primaryColor}
                glowIntensity={progress * 0.5}
            />
        )}
        {/* ... rest of egg content */}
    </Animated.View>

    {/* ... status text */}
</View>
```

**Step 4: Simplify StyleSheet to only static properties**

```typescript
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        // height is now dynamic
    },
    glow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
    innerGlow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
    sparkleContainer: {
        position: 'absolute',
        // width, height are now dynamic
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkle: {
        position: 'absolute',
        fontSize: 20,
        top: 0,
    },
    // ... keep other static styles
    warningGlow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
});
```

**Step 5: Run tests**

Run: `npm test -- --watchAll=false`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/components/Egg.tsx
git commit -m "refactor: make Egg component responsive

Egg now scales proportionally based on screen dimensions using
useResponsive hook. Glow effects and container scale with egg."
```

---

## Task 5: Update EnhancedTimerDisplay with Responsive Sizing (Standalone)

**Files:**
- Modify: `app/index.tsx` (EnhancedTimerDisplay component within file)

**NOTE:** Since timer is now ABOVE the egg (not surrounding it), we can simplify this component. It just needs to render the progress ring and timer text, centered in its own section.

**Step 1: Add responsive sizing to EnhancedTimerDisplay**

Update the component to accept responsive values:

```typescript
interface EnhancedTimerDisplayProps {
    formattedTime: string;
    isRunning: boolean;
    progress: number;
    sessionState: 'idle' | 'active' | 'completed' | 'failed';
    isPaused: boolean;
    language?: 'en' | 'tr' | 'es';
    theme: Theme;
    progressRingSize: number;  // Add this
    timerFontSize: number;     // Add this
}
```

**Step 2: Replace PROGRESS_RING constants with props**

Inside the component, calculate derived values from props:

```typescript
function EnhancedTimerDisplay({
    formattedTime,
    isRunning,
    progress,
    sessionState,
    isPaused,
    language = 'en',
    theme,
    progressRingSize,
    timerFontSize,
}: EnhancedTimerDisplayProps) {
    // Calculate ring geometry from prop
    const STROKE_WIDTH = Math.round(progressRingSize * 0.043); // ~12 at 280
    const RADIUS = (progressRingSize - STROKE_WIDTH) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    // ... rest of component, using these calculated values
    // Replace PROGRESS_RING_SIZE with progressRingSize
    // Replace PROGRESS_RING_STROKE_WIDTH with STROKE_WIDTH
    // Replace PROGRESS_RING_RADIUS with RADIUS
    // Replace PROGRESS_RING_CIRCUMFERENCE with CIRCUMFERENCE
```

**Step 3: Update timer text style**

```typescript
const timerStyle = {
    fontSize: timerFontSize,
    fontWeight: theme.fontWeight.bold,
    fontVariant: ['tabular-nums'] as const,
    color: timerColor,
};

// In return:
<Animated.Text
    style={[timerStyle, timerGlowStyle]}
>
    {formattedTime}
</Animated.Text>
```

**Step 4: Update enhancedTimerStyles**

```typescript
const enhancedTimerStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        // Remove fixed marginTop/marginBottom
        // minHeight should be based on progressRingSize
    },
    ringContainer: {
        // Change from position: 'absolute' to relative positioning
        // since timer is now standalone (not overlaid on egg)
        alignItems: 'center',
        justifyContent: 'center',
        // width/height now come from props
    },
    // ... rest of styles without fixed PROGRESS_RING_SIZE references
});
```

**Step 5: IMPORTANT - Timer is now standalone**

The timer text and percentage should now be INSIDE the progress ring (centered), since there's no egg behind it. Update the return JSX:

```tsx
return (
    <Animated.View style={[enhancedTimerStyles.container, containerStyle]}>
        {/* Progress Ring */}
        {sessionState === 'active' && (
            <View style={[enhancedTimerStyles.ringContainer, { width: progressRingSize, height: progressRingSize }]}>
                {/* SVG progress ring */}
                <Svg width={progressRingSize} height={progressRingSize}>
                    {/* ... circle elements ... */}
                </Svg>

                {/* Timer text CENTERED in the ring */}
                <View style={enhancedTimerStyles.timerTextContainer}>
                    <Animated.Text style={[timerStyle, timerGlowStyle]}>
                        {formattedTime}
                    </Animated.Text>
                    <Text style={[enhancedTimerStyles.progressText, { color: ringColor }]}>
                        {Math.round(progress * 100)}%
                    </Text>
                    {isPaused && (
                        <Animated.Text style={[enhancedTimerStyles.pausedIndicator, pausedIndicatorStyle]}>
                            {language === 'tr' ? 'DURAKLATILDI' : 'PAUSED'}
                        </Animated.Text>
                    )}
                </View>
            </View>
        )}

        {/* Idle state - just show timer text */}
        {sessionState === 'idle' && (
            <Animated.Text style={[timerStyle, timerGlowStyle]}>
                {formattedTime}
            </Animated.Text>
        )}
    </Animated.View>
);
```

Add the new style:
```typescript
timerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
},
```

**Step 6: Run tests and verify**

Run: `npm test -- --watchAll=false`
Expected: All tests pass

**Step 7: Commit**

```bash
git add app/index.tsx
git commit -m "refactor: make EnhancedTimerDisplay standalone

Timer display is now a standalone component with progress ring
containing the timer text centered inside. No longer overlays egg."
```

---

## Task 6: Update Collection Grid with Dynamic Columns

**Files:**
- Modify: `app/collection.tsx`

**Step 1: Import useResponsive**

```typescript
import { useResponsive } from '../src/hooks/useResponsive';
```

**Step 2: Use responsive values in component**

```typescript
export default function CollectionScreen() {
    const responsive = useResponsive();
    // ... existing code
```

**Step 3: Update FlashList numColumns**

Find the FlashList component and update:

```typescript
<FlashList
    // ... existing props
    numColumns={responsive.gridColumns}
    estimatedItemSize={calculateCardHeight()}
    // ...
/>
```

**Step 4: Update card sizing**

Find where card dimensions are calculated and update:

```typescript
// Calculate card width based on grid columns and padding
const cardWidth = useMemo(() => {
    const totalPadding = responsive.horizontalPadding * 2;
    const gapSpace = (responsive.gridColumns - 1) * 12; // 12px gaps
    return Math.floor((responsive.screenWidth - totalPadding - gapSpace) / responsive.gridColumns);
}, [responsive]);
```

**Step 5: Run tests**

Run: `npm test -- --watchAll=false`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/collection.tsx
git commit -m "refactor: make Collection grid responsive

Grid uses dynamic column count based on screen width."
```

---

## Task 7: Add Modal Max-Width Constraints

**Files:**
- Modify: `src/components/HatchModal.tsx`
- Modify: `src/components/AnimalDetailModal.tsx`

**Step 1: Update HatchModal**

Add responsive import and max-width container:

```typescript
import { useResponsive } from '../hooks/useResponsive';

// Inside component:
const { modalMaxWidth } = useResponsive();

// Wrap content in constrained container:
<View style={[styles.modalContent, { maxWidth: modalMaxWidth }]}>
    {/* existing content */}
</View>
```

**Step 2: Update AnimalDetailModal similarly**

Apply same pattern to AnimalDetailModal.

**Step 3: Add ScrollView for short screens**

Wrap modal content in ScrollView with bounce:

```typescript
<ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={false}
    bounces={true}
>
    {/* modal content */}
</ScrollView>
```

**Step 4: Run tests**

Run: `npm test -- --watchAll=false`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/components/HatchModal.tsx src/components/AnimalDetailModal.tsx
git commit -m "refactor: add responsive constraints to modals

Modals now have max-width on tablets and scroll on short screens."
```

---

## Task 8: Integration Testing

**Files:**
- Modify: No files, testing only

**Step 1: Run full test suite**

Run: `npm test -- --watchAll=false`
Expected: All tests pass

**Step 2: Build and verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Verify app runs**

Run: `npm start`
Expected: Metro bundler starts without errors

**Step 4: Final commit if any fixes needed**

```bash
git status
# If any uncommitted fixes:
git add -A
git commit -m "fix: address integration issues from responsive layout"
```

---

## Summary

After completing all tasks:

1. **useResponsive hook** provides centralized responsive logic
2. **Home screen** uses **stacked vertical layout** - timer ABOVE egg, not overlapping
3. **Timer display** is standalone with progress ring containing timer text
4. **Egg component** scales proportionally (150-320px) in its own section
5. **Collection grid** uses dynamic columns (2-4)
6. **Modals** have max-width and scroll support

**Key architectural change:** Timer and Egg are now in separate flex sections that stack vertically. This guarantees no overlap on any screen size.

```
Before (broken):          After (fixed):
┌─────────────┐           ┌─────────────┐
│  [Timer]    │           │  [Timer]    │
│    ↓↓↓      │           │  17:52 29%  │
│  [Egg] ←overlap!        ├─────────────┤
│             │           │   [Egg]     │
└─────────────┘           │   🥚        │
                          └─────────────┘
```
