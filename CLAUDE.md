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
