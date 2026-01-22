# Ovo Focus Architecture

This document describes the high-level architecture and design decisions of the Ovo Focus app.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              App Layer                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   index     │  │  collection │  │  settings   │   (Expo Router)      │
│  │   (Home)    │  │   (Modal)   │  │   (Modal)   │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
└─────────┼────────────────┼────────────────┼─────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Component Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ Session Module  │  │ Collection UI   │  │ Common UI       │         │
│  │ - TimerDisplay  │  │ - AnimalCard    │  │ - PixelButton   │         │
│  │ - SessionCtrls  │  │ - AnimalDetail  │  │ - LoadingInd.   │         │
│  │ - InteractEgg   │  │ - HatchModal    │  │ - ProgressInd.  │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
└───────────┼────────────────────┼────────────────────┼───────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Context Layer                                   │
│  ┌───────────────────────────────────────────────────────────────┐      │
│  │                        GameContext                             │      │
│  │  State: sessionState, currentAnimal, collection, stats, etc.  │      │
│  │  Actions: startSession, completeSession, failSession, etc.    │      │
│  └───────────────────────────────────────────────────────────────┘      │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐      │
│  │      ThemeContext       │  │           i18n                   │      │
│  │  (colors, dark mode)    │  │   (translations: en/tr)          │      │
│  └─────────────────────────┘  └─────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Services Layer                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Analytics  │  │ Notif.     │  │ Audio      │  │ Share      │        │
│  │ Service    │  │ Service    │  │ Manager    │  │ Service    │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Utils Layer                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Storage   │  │  Logger    │  │  Goals     │  │  Offline   │        │
│  │ (Async)    │  │            │  │  Tracking  │  │  Queue     │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Data Layer                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐      │
│  │      AsyncStorage       │  │        animals.ts / eggStyles   │      │
│  │  (Persistent State)     │  │        (Static Data)            │      │
│  └─────────────────────────┘  └─────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Modules

### 1. State Management (GameContext)

The app uses React Context with `useReducer` for global state management.

**State Shape:**
```typescript
interface GameState {
  sessionState: 'idle' | 'active' | 'completed' | 'failed';
  currentAnimal: Animal | null;
  collection: CollectedAnimal[];
  stats: UserStats;
  settings: UserSettings;
  isPaused: boolean;   // Pause is a flag within 'active' state
  pauseCount: number;  // Max 3 pauses per session
}
```

**Data Flow:**
```
User Action → dispatch(action) → reducer → new state → re-render
                                    ↓
                              Side Effects
                         (storage, analytics)
```

### 2. Session State Machine

Note: Pausing is handled via `isPaused` flag within the ACTIVE state, not as a separate state.

```
                    ┌──────────┐
                    │   IDLE   │◄────────────────────────┐
                    └────┬─────┘                         │
                         │ startSession()                │
                         ▼                               │
                    ┌──────────────────┐                 │
                    │      ACTIVE      │                 │
                    │  ┌────────────┐  │                 │
                    │  │ isPaused:  │  │                 │
                    │  │ true/false │  │                 │
                    │  └────────────┘  │                 │
                    │ pause()/resume() │                 │
                    │ (max 3 pauses)   │                 │
                    └────────┬─────────┘                 │
                             │ timer ends / give up      │
         ┌───────────────────┴───────────────┐           │
         │ success                   failure │           │
         ▼                               ▼               │
    ┌──────────┐                   ┌──────────┐          │
    │COMPLETED │                   │  FAILED  │          │
    └────┬─────┘                   └────┬─────┘          │
         │ resetSession()               │ resetSession() │
         └──────────────────────────────┴────────────────┘
```

### 3. Storage Strategy

**Persistence Layer:**
- **AsyncStorage**: Primary persistence for all user data
- **Offline Queue**: Handles failed writes with exponential backoff
- **Keys**: Prefixed with `@ovofocus/` namespace

**Data Categories:**
| Key | Data | Update Frequency |
|-----|------|------------------|
| `collection` | Collected animals | On session complete |
| `stats` | User statistics | On session complete |
| `settings` | User preferences | On settings change |
| `favorites` | Favorite animals | On toggle |

### 4. Rarity System

Animals have weighted probabilities:
```
┌─────────────┬────────────┬──────────────┐
│   Rarity    │ Probability │   Example    │
├─────────────┼────────────┼──────────────┤
│  Common     │    60%     │  Chicken     │
│  Rare       │    25%     │  Fox         │
│  Epic       │    12%     │  Unicorn     │
│  Legendary  │     3%     │  Dragon      │
└─────────────┴────────────┴──────────────┘
```

### 5. Animation Architecture

All animations use React Native Reanimated with spring physics:

```
┌──────────────────┐     ┌──────────────────┐
│  Shared Values   │────►│  Animated Styles │
│  (useShared...)  │     │  (useAnimated..) │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │    ┌───────────────┐   │
         └───►│  withSpring   │◄──┘
              │  withTiming   │
              │  withRepeat   │
              └───────────────┘
```

**Key Animation Patterns:**
- **Idle**: Gentle wobble using `withRepeat` + `withSequence`
- **Active**: Intensifying shake as timer progresses
- **Completed**: Burst animation with confetti
- **Failed**: Sad shake with fade

## Directory Structure

```
/Users/omeryilmaz/Workspace/ovofocus/
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout with providers
│   ├── index.tsx            # Home screen (timer)
│   ├── collection.tsx       # Collection modal
│   └── settings.tsx         # Settings modal
├── src/
│   ├── components/          # UI components
│   │   ├── session/         # Session-related components
│   │   ├── stats/           # Statistics components
│   │   └── *.tsx            # Shared components
│   ├── context/             # React contexts
│   │   ├── GameContext.tsx  # Main app state
│   │   └── ThemeContext.tsx # Theme/dark mode
│   ├── hooks/               # Custom React hooks
│   │   ├── useTimer.ts      # Timer logic
│   │   └── useAppState.ts   # App state handling
│   ├── services/            # External integrations
│   │   ├── analyticsService.ts
│   │   ├── notifications.ts
│   │   └── shareService.ts
│   ├── utils/               # Utility functions
│   │   ├── storage.ts       # AsyncStorage wrapper
│   │   ├── offlineQueue.ts  # Failed write retry
│   │   └── goalTracking.ts  # Goal system
│   ├── data/                # Static data
│   │   ├── animals.ts       # Animal definitions
│   │   └── eggStyles.ts     # Egg appearance
│   ├── i18n/                # Internationalization
│   │   └── translations.ts  # EN/TR strings
│   └── styles/              # Design tokens
│       └── theme.ts         # Colors, spacing, etc.
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD
```

## Design Decisions

### Why React Context over Redux?

- App state is relatively simple and localized
- No need for middleware or complex async flows
- Built-in React feature, no extra dependencies
- `useReducer` provides Redux-like patterns when needed

### Why AsyncStorage over SQLite?

- Simple key-value storage is sufficient
- No complex queries needed
- Faster setup and smaller bundle size
- Offline queue handles reliability

### Why Reanimated over Animated API?

- Runs on UI thread for 60fps animations
- Better performance for complex animations
- Spring physics feel more natural
- Worklet support for gesture handling

## Performance Considerations

1. **Memoization**: Heavy components use `React.memo()`
2. **Lazy Loading**: Modals load content on demand
3. **Image Optimization**: Animal images are appropriately sized
4. **Animation Cleanup**: Animations cancel on unmount
5. **Storage Batching**: Writes are batched when possible
