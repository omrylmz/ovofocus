# Development Guide

This document provides comprehensive guidance for developers working on the Ovo Focus codebase.

## Project Overview

Ovo Focus is a React Native/Expo gamified productivity app. Users complete focus sessions to hatch virtual animals from eggs, building a collection over time. The app features rich animations, haptic feedback, and a rarity-based collection system to incentivize focus.

### Key Features

- Focus timer with pause/resume functionality (max 3 pauses per session)
- Virtual animal collection with rarity system (Common, Rare, Epic, Legendary)
- Streak tracking and daily goals
- Interactive egg with gesture-based interactions
- Multi-language support (Turkish/English)
- Dark/Light/System theme modes
- Pomodoro technique support
- Ambient sounds during sessions

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.x or later recommended
- **npm**: Comes with Node.js
- **Expo CLI**: Installed via npm
- **iOS Simulator** (macOS only) or **Android Emulator**
- **Expo Go** app on physical devices (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ovofocus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Running on Devices

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Web browser
npm run web
```

### Building for Distribution

```bash
# Build APK for testing
eas build --profile preview --platform android

# Build for production (requires EAS configuration)
eas build --profile production --platform android
eas build --profile production --platform ios
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Build and run on iOS Simulator |
| `npm run android` | Build and run on Android Emulator |
| `npm run web` | Run web version in browser |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

## Directory Structure

```
ovofocus/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with providers
│   ├── index.tsx           # Main focus timer screen
│   ├── collection.tsx      # Animal collection modal
│   ├── settings.tsx        # Settings modal
│   └── stats.tsx           # Statistics modal
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── session/        # Session-related components
│   │   ├── stats/          # Statistics components
│   │   ├── __tests__/      # Component tests
│   │   ├── Egg.tsx         # Main animated egg component
│   │   ├── HatchModal.tsx  # Animal hatching celebration
│   │   ├── AnimalCard.tsx  # Collection item display
│   │   └── PixelButton.tsx # Haptic-enabled button
│   ├── context/            # React Context providers
│   │   ├── GameContext.tsx # Main app state management
│   │   └── ThemeContext.tsx# Theme state management
│   ├── hooks/              # Custom React hooks
│   │   ├── useTimer.ts     # Timer logic
│   │   ├── useAppState.ts  # App lifecycle handling
│   │   └── __tests__/      # Hook tests
│   ├── services/           # External service integrations
│   │   ├── notifications.ts# Push notifications
│   │   ├── audioManager.ts # Sound effects
│   │   └── ambientSoundService.ts
│   ├── utils/              # Utility functions
│   │   ├── storage.ts      # AsyncStorage persistence
│   │   ├── logger.ts       # Structured logging
│   │   └── __tests__/      # Utility tests
│   ├── styles/             # Design tokens and themes
│   │   └── theme.ts        # Colors, spacing, typography
│   ├── data/               # Static data definitions
│   │   ├── animals.ts      # Animal collection data
│   │   └── eggStyles.ts    # Egg customization options
│   └── i18n/               # Internationalization
│       └── translations.ts # Language strings
├── assets/                 # Static assets (images, sounds)
├── jest.config.js          # Jest test configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## State Management

The app uses React Context with `useReducer` for global state management.

### GameContext

Located at `src/context/GameContext.tsx`, this is the central state container.

#### State Shape

```typescript
interface GameState {
  sessionState: 'idle' | 'active' | 'completed' | 'failed';
  currentAnimal: Animal | null;
  collection: CollectedAnimal[];
  stats: Stats;
  settings: Settings;
  dailyProgress: DailyProgress;
  isLoading: boolean;
  isPaused: boolean;
  pauseCount: number;
  favorites: string[];
  // Session timing for persistence
  sessionStartTime: string | null;
  sessionPausedAt: string | null;
  accumulatedPauseTime: number;
  restoredSession: {...} | null;
}
```

#### Available Actions

| Action | Description |
|--------|-------------|
| `startSession(duration)` | Begin a new focus session |
| `pauseSession()` | Pause current session (increments pauseCount) |
| `emergencyPause()` | Pause without incrementing pauseCount |
| `resumeSession()` | Resume paused session |
| `completeSession(focusMinutes)` | Mark session complete, award animal |
| `failSession(focusMinutes)` | Mark session as failed |
| `resetSession()` | Reset to idle state |
| `updateUserSettings(settings)` | Update app settings |
| `toggleFavorite(animalId)` | Toggle animal favorite status |
| `setGestureHintsSeen()` | Mark gesture hints as shown |
| `setOnboardingComplete()` | Mark onboarding as complete |
| `i18n(key)` | Get translated string |

#### Usage Example

```typescript
import { useGame } from '../context/GameContext';

function MyComponent() {
  const { state, startSession, i18n } = useGame();

  const handleStart = () => {
    const duration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;
    startSession(duration);
  };

  return (
    <Button onPress={handleStart}>
      {i18n('startSession')}
    </Button>
  );
}
```

### Session State Machine

Sessions follow a defined state flow:

```
idle -> active -> completed -> idle
          |           |
          v           |
       (pause) -------+
          |
          v
       failed -> idle
```

- **idle**: Ready to start a new session
- **active**: Timer running (can be paused, max 3 times)
- **completed**: Session finished successfully, animal awarded
- **failed**: Session abandoned or interrupted beyond tolerance

## Component Patterns and Conventions

### Animation Patterns

All animations use React Native Reanimated with spring physics:

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function AnimatedComponent() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  return <Animated.View style={animatedStyle} />;
}
```

### Haptic Feedback

Use the `PixelButton` component for consistent haptic feedback:

```typescript
import { PixelButton } from '../components/PixelButton';

<PixelButton onPress={handlePress} variant="primary">
  {buttonLabel}
</PixelButton>
```

### Theme Usage

Access theme tokens via the `useTheme` hook:

```typescript
import { useTheme } from '../context/ThemeContext';

function ThemedComponent() {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>
        Hello
      </Text>
    </View>
  );
}
```

### Internationalization

Use the `i18n` function from GameContext:

```typescript
const { i18n } = useGame();

// In JSX
<Text>{i18n('focusTitle')}</Text>
```

### Error Boundaries

Wrap component trees with `ErrorBoundary`:

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

<ErrorBoundary language={settings.language}>
  <ChildComponents />
</ErrorBoundary>
```

## Testing Approach

### Test Framework

- **Jest** with `jest-expo` preset
- **React Native Testing Library** for component tests

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test File Organization

Tests are co-located with their source files in `__tests__` directories:

```
src/
  utils/
    storage.ts
    __tests__/
      storage.test.ts
  hooks/
    useTimer.ts
    __tests__/
      useTimer.test.ts
```

### Writing Tests

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  it('should start with correct initial values', () => {
    const { result } = renderHook(() =>
      useTimer({ duration: 60 })
    );

    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });
});
```

### Mocking

AsyncStorage and other native modules are mocked in `jest.setup.js`:

```javascript
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

## Debug Mode

Enable debug mode in Settings to reduce focus duration to 10 seconds for rapid testing:

```typescript
const duration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;
```

## Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Using expo eslint config
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Group by external, internal, then relative paths

## Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [CLAUDE.md](../CLAUDE.md) - AI assistant context
