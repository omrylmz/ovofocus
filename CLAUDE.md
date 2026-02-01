# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ovo Focus is a React Native/Expo gamified productivity app. Users complete focus sessions to hatch virtual animals from eggs, building a collection over time. The app uses rich animations, haptic feedback, and a rarity-based collection system to incentivize focus.

## Development Commands

```bash
# Start Expo dev server
npm start

# Run on specific platforms
npm run android    # Build and run on Android
npm run ios        # Build and run on iOS
npm run web        # Run web version

# Build APK for testing
eas build --profile preview --platform android
```

## Architecture

### State Management

The app uses React Context with useReducer for global state (`src/context/GameContext.tsx`):

- **GameProvider** wraps the app in `app/_layout.tsx`
- **useGame()** hook provides access to state and actions
- State includes: `sessionState`, `currentAnimal`, `collection`, `stats`, `settings`
- Actions: `startSession`, `completeSession`, `failSession`, `resetSession`, `updateUserSettings`
- The `i18n(key)` function is exposed via context for translations

### Session States

Sessions follow this state machine: `idle` -> `active` (can pause) -> `completed` | `failed` -> `idle`

The state includes `isPaused` and `pauseCount` for pause/resume functionality (max 3 pauses per session).

### Navigation

Expo Router file-based navigation in `/app`:
- `index.tsx` - Main focus timer screen (no header)
- `collection.tsx` - Animal collection modal
- `settings.tsx` - Settings modal

### Key Patterns

**Animations**: All animations use React Native Reanimated with spring physics. The `Egg.tsx` component has state-based animations (idle wobble, active intensifying, completed burst, failed sad shake).

**Persistence**: AsyncStorage via `src/utils/storage.ts` handles collection, stats, and settings. Data loads on mount in GameContext.

**Rarity System**: Animals in `src/data/animals.ts` have weighted probabilities (common: 60%, rare: 25%, epic: 12%, legendary: 3%).

**Internationalization**: Turkish/English support via `src/i18n/translations.ts`. Use `i18n('key')` from useGame() hook.

**Theme**: Centralized design tokens in `src/styles/theme.ts` (colors, spacing, typography, shadows).

### Directory Structure

```
app/              # Expo Router screens
src/
  components/     # Animated UI components (Egg, HatchModal, AnimalCard, etc.)
  context/        # GameContext (global state)
  hooks/          # useTimer, useAppState
  services/       # Push notifications
  utils/          # AsyncStorage persistence
  styles/         # Theme tokens
  data/           # Animal definitions
  i18n/           # Translation strings
```

## Important Implementation Details

- Debug mode (in settings) reduces focus duration to 10 seconds for testing
- Background tolerance allows configurable grace period before session fails
- Timer uses `Date.now()` calculations for accuracy, not just interval counting
- Egg interactions: single tap (encouragement), double tap (time remaining), long press (motivation)
- Pause/resume: Users get 3 pauses per session; timer pauses via `pauseSession()`/`resumeSession()`
- Favorites: Stored in AsyncStorage, accessed via `toggleFavorite(animalId)` from GameContext

## UI/UX Features

- **Pause/Resume**: Sessions can be paused up to 3 times with visual indicator
- **Give Up Confirmation**: Alert dialog before failing a session
- **Gesture Hints**: First-time overlay teaching tap/double-tap/long-press
- **Collection Filtering**: Filter by all/collected/uncollected/favorites, sort by rarity/recent/name
- **Collection Search**: Search animals by name
- **Favorites System**: Tap heart in animal detail modal to favorite
- **Stats Bar**: Shows "BEST" badge when current streak equals best streak
- **Haptic Feedback**: All buttons trigger haptics via PixelButton component
- **Staggered Animations**: HatchModal text cascades in with spring animations
- **Dynamic Confetti**: Legendary=15 gold, Epic=12 purple, Rare=8 blue, Common=5 particles

---

## Layout & Spacing Guidelines

### CRITICAL: Proportional Layout System

The Home screen uses a **proportional height system** where each section gets a percentage of available screen height. This ensures consistent layout across all device sizes with NO GAPS.

```
Available Height = Screen - Header(56px) - StatsBar(60px) - SafeAreas

┌─────────────────────────────────────┐
│  Header (OvoFocus + nav icons)      │  ← Fixed 56px
├─────────────────────────────────────┤
│  Stats Bar (streak, duration, etc)  │  ← Fixed 60px
├─────────────────────────────────────┤
│                                     │
│  Timer Section       18%           │  ← height: timerSectionHeight
│      21:33 / 14%                    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Egg Section         60%           │  ← height: eggSectionHeight
│         🥚                          │     (main focal point)
│                                     │
├─────────────────────────────────────┤
│  Controls Section    22%           │  ← height: controlsSectionHeight
│  (Pause/Give Up + Power-ups)        │     (includes safe area padding)
└─────────────────────────────────────┘
```

**Key Rules:**
1. **NEVER use `flex: 1` for main sections** - causes gaps when content doesn't fill
2. **Use explicit heights from `useResponsive()`** - calculated proportionally
3. **Safe area padding goes in controlsSection** - protects against Android nav bar

### Spacing Values (Use Theme Constants)

```typescript
// Standard spacing scale - ALWAYS use these, never arbitrary values
theme.spacing.xs   // 4px  - Tight spacing (icon gaps, inline elements)
theme.spacing.sm   // 8px  - Small spacing (between related items)
theme.spacing.md   // 16px - Medium spacing (section padding, card padding)
theme.spacing.lg   // 24px - Large spacing (between sections)
theme.spacing.xl   // 32px - Extra large (major section breaks)
theme.spacing.xxl  // 48px - Maximum (screen-level padding)
```

### Gap Rules Between Elements

| Element A | Element B | Gap | Notes |
|-----------|-----------|-----|-------|
| Header | Stats Bar | 0 | Adjacent, no gap needed |
| Stats Bar | Timer Section | `xs` (4px) | Minimal gap |
| Timer Section | Egg Section | `sm`-`md` (8-16px) | Moderate visual separation |
| Egg Section | Controls | `md`-`lg` (16-24px) | Clear separation |
| Controls | Power-ups | `sm` (8px) | Related actions |
| Power-ups | Screen bottom | Safe area + `sm` | Android nav bar clearance |

### Z-Index Hierarchy (Mandatory)

**Always set BOTH `zIndex` AND `elevation` for Android compatibility:**

```typescript
// Correct
{ zIndex: theme.zIndex.floating, elevation: theme.zIndex.floating }

// Wrong - will fail on Android
{ zIndex: 10 }  // Missing elevation
```

**Layer order (bottom to top):**

| Level | zIndex | Use Case |
|-------|--------|----------|
| `background` | 0 | AnimatedBackground, FloatingParticles |
| `base` | 1 | Normal content (default) |
| `floating` | 10 | Badges, indicators, minor overlays |
| `sticky` | 20 | Headers, sticky elements |
| `overlay` | 100 | Dim backgrounds behind modals |
| `modal` | 200 | Modal dialogs, bottom sheets |
| `toast` | 300 | Toast notifications, snackbars |
| `tooltip` | 400 | Tooltips, popovers |
| `debug` | 500 | Debug overlays |

### Safe Area Handling

**iOS:** Use `SafeAreaView` for status bar and home indicator.

**Android:** Virtual navigation keys require explicit handling:

```typescript
// Bottom padding for Android virtual nav bar
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
const bottomPadding = Math.max(insets.bottom, 16); // Minimum 16px
```

### Android-Specific Issues

1. **Virtual Navigation Keys**: The transparent nav bar overlaps content. Always add `paddingBottom` to the outermost container using safe area insets.

2. **Elevation vs zIndex**: Android ignores `zIndex` for native views. Use `elevation` property alongside zIndex:
   ```typescript
   { zIndex: 10, elevation: 10 }
   ```

3. **Overflow Clipping**: Android clips overflow by default. If animations extend beyond container:
   ```typescript
   { overflow: 'visible' }  // May not work on all Android versions
   ```

4. **Status Bar**: Use `expo-status-bar` with `translucent` style and account for status bar height in layout.

### Responsive Sizing with useResponsive

**Always use `useResponsive()` hook for dynamic sizing:**

```typescript
const responsive = useResponsive();

// Proportional section heights (CRITICAL for layout)
responsive.timerSectionHeight    // 18% of available height
responsive.eggSectionHeight      // 60% of available height
responsive.controlsSectionHeight // 22% of available height
responsive.safeAreaBottom        // Min 24px for Android nav bar

// Element sizes (calculated from section heights)
responsive.eggSize         // 65% of egg section, clamped 150-320px
responsive.progressRingSize // 85% of timer section, clamped 120-200px
responsive.timerFontSize   // 35% of progress ring, clamped 24-48px

// Other values
responsive.gridColumns     // 2-4 based on screen width
responsive.horizontalPadding // 12-16px based on screen size
```

**Proportional Sizing Formula:**

| Element | Based On | Ratio | Min | Max |
|---------|----------|-------|-----|-----|
| Timer Section | Available height | 18% | - | - |
| Egg Section | Available height | 60% | - | - |
| Controls Section | Available height | 22% | - | - |
| Progress Ring | Timer section | 85% | 120px | 200px |
| Egg | Egg section | 65% | 150px | 320px |
| Timer Font | Progress ring | 35% | 24px | 48px |

---

## Anti-Patterns to Avoid

### ❌ Absolute Positioning for Main Content

```typescript
// WRONG - causes overlap on different screen sizes
container: {
    position: 'relative',
},
timer: {
    position: 'absolute',
    top: 100,
},
egg: {
    position: 'absolute',
    top: 200,  // Will overlap timer on small screens!
},

// CORRECT - proportional heights from useResponsive()
timerSection: {
    height: responsive.timerSectionHeight,  // 18% of available
},
eggSection: {
    height: responsive.eggSectionHeight,    // 60% of available
},
controlsSection: {
    height: responsive.controlsSectionHeight, // 22% of available
},
```

### ❌ Using flex: 1 for Layout Sections

```typescript
// WRONG - creates gaps when content doesn't fill the space
eggSection: {
    flex: 1,  // Takes ALL remaining space, centers content, creates gaps
    justifyContent: 'center',
},

// CORRECT - explicit proportional height
eggSection: {
    height: responsive.eggSectionHeight,  // Exact size, no gaps
    justifyContent: 'center',
},
```

### ❌ Fixed Pixel Values Without Bounds

```typescript
// WRONG - doesn't adapt to screen sizes
{ width: 280, height: 280 }

// CORRECT - responsive with bounds
const { eggSize } = useResponsive();
{ width: eggSize, height: eggSize }
```

### ❌ justifyContent: 'center' for Main Layout

```typescript
// WRONG - creates huge gaps at top/bottom
content: {
    flex: 1,
    justifyContent: 'center',  // Pushes content to middle
}

// CORRECT - distributes space properly
content: {
    flex: 1,
    justifyContent: 'space-between',  // Or 'flex-start' with explicit spacing
}
```

### ❌ Forgetting Android Elevation

```typescript
// WRONG - zIndex ignored on Android
{ zIndex: 10 }

// CORRECT - both properties
{ zIndex: 10, elevation: 10 }

// BEST - use theme values
{ zIndex: theme.zIndex.floating, elevation: theme.zIndex.floating }
```

### ❌ Hardcoding Margins/Padding

```typescript
// WRONG - magic numbers
{ marginTop: 23, paddingBottom: 17 }

// CORRECT - theme constants
{ marginTop: theme.spacing.lg, paddingBottom: theme.spacing.md }
```

### ❌ Animation Views Escaping Containers

```typescript
// WRONG - glow extends beyond container, may overlap other elements
glowStyle: {
    width: 400,  // Larger than container
    height: 400,
}

// CORRECT - size relative to container, use overflow: 'hidden' on parent
const glowSize = Math.round(eggSize * 1.4);  // Bounded expansion
containerStyle: {
    overflow: 'hidden',  // Clips animations
}
```

### ❌ Not Accounting for Safe Areas

```typescript
// WRONG - content under status bar or home indicator
<View style={{ flex: 1 }}>
    <Content />
</View>

// CORRECT - uses safe area
<SafeAreaView style={{ flex: 1 }}>
    <Content />
</SafeAreaView>

// For specific insets
const insets = useSafeAreaInsets();
<View style={{ paddingBottom: insets.bottom }}>
    <BottomContent />
</View>
```

### ❌ Nested ScrollViews Without Explicit Heights

```typescript
// WRONG - inner scroll won't work
<ScrollView>
    <ScrollView>  {/* This won't scroll */}
        <Content />
    </ScrollView>
</ScrollView>

// CORRECT - give inner scroll explicit height
<ScrollView>
    <View style={{ height: 300 }}>
        <ScrollView>
            <Content />
        </ScrollView>
    </View>
</ScrollView>
```

---

## Layout Debugging Checklist

When layout issues occur, check in this order:

1. **Is justifyContent correct?** (`space-between` not `center` for main layouts)
2. **Are elements in separate flex sections?** (not absolutely positioned on top of each other)
3. **Is elevation set alongside zIndex?** (Android compatibility)
4. **Are safe area insets applied?** (especially bottom for Android virtual keys)
5. **Are sizes using useResponsive()?** (not hardcoded pixels)
6. **Is overflow handled for animations?** (glow/particle effects bounded)
7. **Are spacing values from theme?** (not magic numbers)

---

## Modal and Overlay Layering

### React Native Modal Behavior

`<Modal>` components render in a **native layer above all app content**. Explicit zIndex is NOT needed for Modal components - they automatically appear on top.

### Nested Modals

Nested modals stack in render order (last rendered = on top). For GestureHint over other modals:

```typescript
// GestureHint must render AFTER the content it overlays
<View>
    <MainContent />
    <SomeModal visible={showModal} />
    <GestureHint visible={showHint} />  {/* Renders last = on top */}
</View>
```

### Custom Modal-Like Views

For views that act like modals but don't use `<Modal>`:

```typescript
{showOverlay && (
    <View style={{
        ...StyleSheet.absoluteFillObject,
        zIndex: theme.zIndex.overlay,
        elevation: theme.zIndex.overlay,
    }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={{
            zIndex: theme.zIndex.modal,
            elevation: theme.zIndex.modal,
        }}>
            <ModalContent />
        </View>
    </View>
)}
```

---

## Animation Containment Rules

### Glow Effects

Glow effects must be sized relative to their parent element and should not exceed 150% of parent size:

```typescript
const eggSize = responsive.eggSize;
const glowSize = Math.round(eggSize * 1.4);  // 140% - safe
const warningGlowSize = Math.round(eggSize * 1.55);  // Max allowed
```

### Particle Systems (FloatingParticles)

Particles must stay within their container bounds:

```typescript
// Container with explicit bounds
<View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden' }}>
    <FloatingParticles />
</View>
```

### Spring Animations

Use bounded spring configs to prevent overshoot beyond visible area:

```typescript
// Safe spring config
{ damping: 15, stiffness: 300 }  // Gentle, no overshoot

// Risky - may overshoot bounds
{ damping: 5, stiffness: 100 }   // Very bouncy
```

---

## Testing Layout on Different Devices

### Critical Test Devices

1. **iPhone SE (1st gen)** - 320px width, smallest iOS
2. **iPhone 15 Pro Max** - 430px width, largest iOS
3. **Android small** (360px width) - Galaxy A series
4. **Android large** (412px+ width) - Pixel Pro series
5. **Android with virtual nav** - Any device with gesture navigation

### What to Check

- [ ] No overlapping elements (timer/egg/controls)
- [ ] All text readable (not cut off or overlapping)
- [ ] Buttons accessible (not under virtual nav keys)
- [ ] Animations contained (no visual overflow)
- [ ] Modals don't extend beyond screen
- [ ] Safe areas respected (top and bottom)
