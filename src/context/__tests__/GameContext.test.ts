/**
 * Unit tests for GameContext Reducer
 *
 * Tests the core reducer logic for state management in OvoFocus.
 * The reducer handles session lifecycle, collection management,
 * stats tracking, settings, and various UI state.
 */

import { Animal, Rarity } from '../../data/animals';
import {
  CollectedAnimal,
  Stats,
  Settings,
  DailyProgress,
  PersistedSession,
} from '../../utils/storage';
import { Achievement, UnlockedAchievement } from '../../data/achievements';
import { gameReducer } from '../GameContext';

// ============================================================================
// Type Definitions (matching GameContext.tsx)
// ============================================================================

type SessionState = 'idle' | 'active' | 'completed' | 'failed';

interface GameState {
  sessionState: SessionState;
  currentAnimal: Animal | null;
  collection: CollectedAnimal[];
  stats: Stats;
  settings: Settings;
  dailyProgress: DailyProgress;
  isLoading: boolean;
  isPaused: boolean;
  pauseCount: number;
  favorites: string[];
  sessionStartTime: string | null;
  sessionPausedAt: string | null;
  accumulatedPauseTime: number;
  restoredSession: { session: PersistedSession; remainingTime: number } | null;
  unlockedAchievements: UnlockedAchievement[];
  pendingAchievement: Achievement | null;
  pendingMilestone: Achievement | null;
}

type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | {
      type: 'LOAD_DATA';
      payload: {
        collection: CollectedAnimal[];
        stats: Stats;
        settings: Settings;
        favorites: string[];
        dailyProgress: DailyProgress;
        unlockedAchievements: UnlockedAchievement[];
      };
    }
  | { type: 'START_SESSION'; payload: { startTime: string; duration: number } }
  | { type: 'PAUSE_SESSION'; payload: { pausedAt: string } }
  | { type: 'EMERGENCY_PAUSE'; payload: { pausedAt: string } }
  | { type: 'RESUME_SESSION'; payload: { accumulatedPauseTime: number } }
  | { type: 'COMPLETE_SESSION'; payload: { animal: Animal; focusMinutes: number } }
  | { type: 'FAIL_SESSION'; payload: { focusMinutes: number } }
  | { type: 'RESET_SESSION' }
  | { type: 'ADD_TO_COLLECTION'; payload: CollectedAnimal }
  | { type: 'SET_COLLECTION'; payload: CollectedAnimal[] }
  | { type: 'UPDATE_STATS'; payload: Stats }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'UPDATE_DAILY_PROGRESS'; payload: DailyProgress }
  | { type: 'TOGGLE_FAVORITE'; payload: string[] }
  | { type: 'SET_GESTURE_HINTS_SEEN' }
  | { type: 'SET_ONBOARDING_COMPLETE' }
  | { type: 'RESTORE_SESSION'; payload: { session: PersistedSession; remainingTime: number } }
  | { type: 'CLEAR_RESTORED_SESSION' }
  | { type: 'SET_PENDING_ACHIEVEMENT'; payload: Achievement | null }
  | { type: 'ADD_UNLOCKED_ACHIEVEMENT'; payload: UnlockedAchievement }
  | { type: 'SET_PENDING_MILESTONE'; payload: Achievement | null };

// ============================================================================
// Factory Functions for Test Data
// ============================================================================

function createDefaultSettings(): Settings {
  return {
    focusDuration: 25,
    toleranceSeconds: 20,
    soundEnabled: true,
    hapticsEnabled: true,
    notificationsEnabled: true,
    language: 'en',
    debugMode: false,
    hasSeenGestureHints: false,
    lastGestureHintSession: 0,
    gestureHintIntervalSessions: 5,
    maxPausesPerSession: 3,
    hasCompletedOnboarding: false,
    dailyGoal: 3,
    emergencyPauseDuration: 60,
    reducedMotion: 'system',
    themeMode: 'system',
    ambientSoundEnabled: false,
    selectedAmbientSound: 'rain',
    ambientSoundVolume: 50,
    // Pomodoro settings
    pomodoroEnabled: false,
    pomodoroWorkDuration: 25,
    pomodoroBreakDuration: 5,
    pomodoroLongBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    // Egg customization
    selectedEggStyle: 'classic',
  };
}

function createDefaultStats(): Stats {
  return {
    totalSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: null,
  };
}

function createDefaultDailyProgress(): DailyProgress {
  return {
    date: new Date().toISOString().split('T')[0],
    completedSessions: 0,
    goalAchieved: false,
  };
}

function createInitialState(overrides?: Partial<GameState>): GameState {
  return {
    sessionState: 'idle',
    currentAnimal: null,
    collection: [],
    stats: createDefaultStats(),
    settings: createDefaultSettings(),
    dailyProgress: createDefaultDailyProgress(),
    isLoading: true,
    isPaused: false,
    pauseCount: 0,
    favorites: [],
    sessionStartTime: null,
    sessionPausedAt: null,
    accumulatedPauseTime: 0,
    restoredSession: null,
    unlockedAchievements: [],
    pendingAchievement: null,
    pendingMilestone: null,
    ...overrides,
  };
}

function createMockAnimal(overrides?: Partial<Animal>): Animal {
  return {
    id: 'test-animal',
    name: 'Test Animal',
    emoji: '🐤',
    rarity: 'common' as Rarity,
    description: 'A test animal for unit tests',
    ...overrides,
  };
}

function createCollectedAnimal(animal: Animal, sessionId: string): CollectedAnimal {
  return {
    ...animal,
    collectedAt: new Date().toISOString(),
    sessionId,
  };
}

function createMockPersistedSession(overrides?: Partial<PersistedSession>): PersistedSession {
  return {
    startTime: new Date().toISOString(),
    duration: 1500, // 25 minutes
    pauseCount: 0,
    isPaused: false,
    pausedAt: null,
    accumulatedPauseTime: 0,
    focusDuration: 25,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('GameContext Reducer', () => {
  // --------------------------------------------------------------------------
  // SET_LOADING
  // --------------------------------------------------------------------------
  describe('SET_LOADING', () => {
    it('should set loading to true', () => {
      const state = createInitialState({ isLoading: false });
      const action: GameAction = { type: 'SET_LOADING', payload: true };

      const newState = gameReducer(state, action);

      expect(newState.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const state = createInitialState({ isLoading: true });
      const action: GameAction = { type: 'SET_LOADING', payload: false };

      const newState = gameReducer(state, action);

      expect(newState.isLoading).toBe(false);
    });

    it('should not affect other state properties', () => {
      const state = createInitialState({
        isLoading: true,
        sessionState: 'active',
        pauseCount: 2,
      });
      const action: GameAction = { type: 'SET_LOADING', payload: false };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('active');
      expect(newState.pauseCount).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // LOAD_DATA (Hydration from storage)
  // --------------------------------------------------------------------------
  describe('LOAD_DATA', () => {
    it('should hydrate state from persisted data', () => {
      const state = createInitialState();
      const mockCollection = [createCollectedAnimal(createMockAnimal(), 'session-1')];
      const mockStats: Stats = {
        ...createDefaultStats(),
        totalSessions: 10,
        completedSessions: 8,
        currentStreak: 5,
      };
      const mockSettings: Settings = {
        ...createDefaultSettings(),
        focusDuration: 30,
        soundEnabled: false,
      };
      const mockFavorites = ['animal-1', 'animal-2'];
      const mockDailyProgress: DailyProgress = {
        date: '2024-01-15',
        completedSessions: 2,
        goalAchieved: false,
      };

      const action: GameAction = {
        type: 'LOAD_DATA',
        payload: {
          collection: mockCollection,
          stats: mockStats,
          settings: mockSettings,
          favorites: mockFavorites,
          dailyProgress: mockDailyProgress,
          unlockedAchievements: [],
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(mockCollection);
      expect(newState.stats).toEqual(mockStats);
      expect(newState.settings).toEqual(mockSettings);
      expect(newState.favorites).toEqual(mockFavorites);
      expect(newState.dailyProgress).toEqual(mockDailyProgress);
      expect(newState.isLoading).toBe(false);
    });

    it('should set isLoading to false after loading data', () => {
      const state = createInitialState({ isLoading: true });
      const action: GameAction = {
        type: 'LOAD_DATA',
        payload: {
          collection: [],
          stats: createDefaultStats(),
          settings: createDefaultSettings(),
          favorites: [],
          dailyProgress: createDefaultDailyProgress(),
          unlockedAchievements: [],
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.isLoading).toBe(false);
    });

    it('should preserve session state when loading data', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 2,
      });
      const action: GameAction = {
        type: 'LOAD_DATA',
        payload: {
          collection: [],
          stats: createDefaultStats(),
          settings: createDefaultSettings(),
          favorites: [],
          dailyProgress: createDefaultDailyProgress(),
          unlockedAchievements: [],
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('active');
      expect(newState.isPaused).toBe(true);
      expect(newState.pauseCount).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // START_SESSION
  // --------------------------------------------------------------------------
  describe('START_SESSION', () => {
    it('should start a new session with active state', () => {
      const state = createInitialState();
      const startTime = '2024-01-15T10:00:00.000Z';
      const action: GameAction = {
        type: 'START_SESSION',
        payload: { startTime, duration: 1500 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('active');
      expect(newState.sessionStartTime).toBe(startTime);
    });

    it('should reset session-related state when starting', () => {
      const state = createInitialState({
        sessionState: 'completed',
        currentAnimal: createMockAnimal(),
        isPaused: true,
        pauseCount: 3,
        accumulatedPauseTime: 60000,
        sessionPausedAt: '2024-01-15T09:55:00.000Z',
      });
      const startTime = '2024-01-15T10:00:00.000Z';
      const action: GameAction = {
        type: 'START_SESSION',
        payload: { startTime, duration: 1500 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('active');
      expect(newState.currentAnimal).toBeNull();
      expect(newState.isPaused).toBe(false);
      expect(newState.pauseCount).toBe(0);
      expect(newState.accumulatedPauseTime).toBe(0);
      expect(newState.sessionPausedAt).toBeNull();
    });

    it('should clear current animal when starting new session', () => {
      const state = createInitialState({
        currentAnimal: createMockAnimal(),
      });
      const action: GameAction = {
        type: 'START_SESSION',
        payload: { startTime: new Date().toISOString(), duration: 1500 },
      };

      const newState = gameReducer(state, action);

      expect(newState.currentAnimal).toBeNull();
    });

    it('should preserve collection and stats when starting session', () => {
      const existingCollection = [createCollectedAnimal(createMockAnimal(), 'old-session')];
      const existingStats: Stats = {
        ...createDefaultStats(),
        totalSessions: 5,
        completedSessions: 4,
      };
      const state = createInitialState({
        collection: existingCollection,
        stats: existingStats,
      });
      const action: GameAction = {
        type: 'START_SESSION',
        payload: { startTime: new Date().toISOString(), duration: 1500 },
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(existingCollection);
      expect(newState.stats).toEqual(existingStats);
    });
  });

  // --------------------------------------------------------------------------
  // PAUSE_SESSION
  // --------------------------------------------------------------------------
  describe('PAUSE_SESSION', () => {
    it('should pause an active session', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: false,
        pauseCount: 0,
      });
      const pausedAt = '2024-01-15T10:05:00.000Z';
      const action: GameAction = {
        type: 'PAUSE_SESSION',
        payload: { pausedAt },
      };

      const newState = gameReducer(state, action);

      expect(newState.isPaused).toBe(true);
      expect(newState.pauseCount).toBe(1);
      expect(newState.sessionPausedAt).toBe(pausedAt);
    });

    it('should increment pause count on each pause', () => {
      let state = createInitialState({
        sessionState: 'active',
        isPaused: false,
        pauseCount: 0,
      });

      // First pause
      state = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:05:00.000Z' },
      });
      expect(state.pauseCount).toBe(1);

      // Resume
      state = gameReducer(state, {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 60000 },
      });

      // Second pause
      state = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:10:00.000Z' },
      });
      expect(state.pauseCount).toBe(2);
    });

    it('should not increment pause count if already paused (race condition guard)', () => {
      const pausedAt = '2024-01-15T10:05:00.000Z';
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 2,
        sessionPausedAt: pausedAt,
      });
      const action: GameAction = {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:06:00.000Z' },
      };

      const newState = gameReducer(state, action);

      // State should be unchanged due to guard
      expect(newState).toBe(state);
      expect(newState.pauseCount).toBe(2);
      expect(newState.sessionPausedAt).toBe(pausedAt);
    });

    it('should preserve session start time when pausing', () => {
      const sessionStartTime = '2024-01-15T10:00:00.000Z';
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime,
      });
      const action: GameAction = {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:05:00.000Z' },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionStartTime).toBe(sessionStartTime);
    });
  });

  // --------------------------------------------------------------------------
  // EMERGENCY_PAUSE
  // --------------------------------------------------------------------------
  describe('EMERGENCY_PAUSE', () => {
    it('should pause session without incrementing pause count', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: false,
        pauseCount: 1,
      });
      const pausedAt = '2024-01-15T10:05:00.000Z';
      const action: GameAction = {
        type: 'EMERGENCY_PAUSE',
        payload: { pausedAt },
      };

      const newState = gameReducer(state, action);

      expect(newState.isPaused).toBe(true);
      expect(newState.pauseCount).toBe(1); // Should NOT increment
      expect(newState.sessionPausedAt).toBe(pausedAt);
    });

    it('should not affect state if already paused', () => {
      const existingPausedAt = '2024-01-15T10:03:00.000Z';
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 2,
        sessionPausedAt: existingPausedAt,
      });
      const action: GameAction = {
        type: 'EMERGENCY_PAUSE',
        payload: { pausedAt: '2024-01-15T10:05:00.000Z' },
      };

      const newState = gameReducer(state, action);

      // State should be unchanged
      expect(newState).toBe(state);
      expect(newState.sessionPausedAt).toBe(existingPausedAt);
    });
  });

  // --------------------------------------------------------------------------
  // RESUME_SESSION
  // --------------------------------------------------------------------------
  describe('RESUME_SESSION', () => {
    it('should resume a paused session', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 1,
        sessionPausedAt: '2024-01-15T10:05:00.000Z',
        accumulatedPauseTime: 30000,
      });
      const action: GameAction = {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 90000 },
      };

      const newState = gameReducer(state, action);

      expect(newState.isPaused).toBe(false);
      expect(newState.sessionPausedAt).toBeNull();
      expect(newState.accumulatedPauseTime).toBe(90000);
    });

    it('should preserve pause count when resuming', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 2,
        sessionPausedAt: '2024-01-15T10:05:00.000Z',
      });
      const action: GameAction = {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 60000 },
      };

      const newState = gameReducer(state, action);

      expect(newState.pauseCount).toBe(2);
    });

    it('should update accumulated pause time correctly', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        accumulatedPauseTime: 60000, // 1 minute from previous pause
      });
      const action: GameAction = {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 180000 }, // Now total 3 minutes
      };

      const newState = gameReducer(state, action);

      expect(newState.accumulatedPauseTime).toBe(180000);
    });
  });

  // --------------------------------------------------------------------------
  // COMPLETE_SESSION
  // --------------------------------------------------------------------------
  describe('COMPLETE_SESSION', () => {
    it('should transition to completed state with animal', () => {
      const animal = createMockAnimal({ id: 'hatched-chick', name: 'Hatched Chick' });
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
      });
      const action: GameAction = {
        type: 'COMPLETE_SESSION',
        payload: { animal, focusMinutes: 25 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('completed');
      expect(newState.currentAnimal).toEqual(animal);
    });

    it('should clear session timing state on completion', () => {
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
        sessionPausedAt: '2024-01-15T10:15:00.000Z',
        accumulatedPauseTime: 60000,
      });
      const action: GameAction = {
        type: 'COMPLETE_SESSION',
        payload: { animal: createMockAnimal(), focusMinutes: 25 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionStartTime).toBeNull();
      expect(newState.sessionPausedAt).toBeNull();
      expect(newState.accumulatedPauseTime).toBe(0);
    });

    it('should preserve collection when completing session', () => {
      const existingCollection = [createCollectedAnimal(createMockAnimal({ id: 'old' }), 'old-session')];
      const state = createInitialState({
        sessionState: 'active',
        collection: existingCollection,
      });
      const action: GameAction = {
        type: 'COMPLETE_SESSION',
        payload: { animal: createMockAnimal({ id: 'new' }), focusMinutes: 25 },
      };

      const newState = gameReducer(state, action);

      // Collection is NOT modified by COMPLETE_SESSION
      // ADD_TO_COLLECTION is dispatched separately
      expect(newState.collection).toEqual(existingCollection);
    });

    it('should handle completion with different rarity animals', () => {
      const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

      for (const rarity of rarities) {
        const animal = createMockAnimal({ id: `${rarity}-animal`, rarity });
        const state = createInitialState({ sessionState: 'active' });
        const action: GameAction = {
          type: 'COMPLETE_SESSION',
          payload: { animal, focusMinutes: 25 },
        };

        const newState = gameReducer(state, action);

        expect(newState.currentAnimal?.rarity).toBe(rarity);
      }
    });
  });

  // --------------------------------------------------------------------------
  // FAIL_SESSION
  // --------------------------------------------------------------------------
  describe('FAIL_SESSION', () => {
    it('should transition to failed state', () => {
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
      });
      const action: GameAction = {
        type: 'FAIL_SESSION',
        payload: { focusMinutes: 10 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('failed');
      expect(newState.currentAnimal).toBeNull();
    });

    it('should clear session timing state on failure', () => {
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
        sessionPausedAt: '2024-01-15T10:05:00.000Z',
        accumulatedPauseTime: 30000,
        isPaused: true,
      });
      const action: GameAction = {
        type: 'FAIL_SESSION',
        payload: { focusMinutes: 5 },
      };

      const newState = gameReducer(state, action);

      expect(newState.sessionStartTime).toBeNull();
      expect(newState.sessionPausedAt).toBeNull();
      expect(newState.accumulatedPauseTime).toBe(0);
    });

    it('should not affect isPaused state directly (handled elsewhere)', () => {
      // Note: FAIL_SESSION doesn't reset isPaused - that's handled by RESET_SESSION
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
      });
      const action: GameAction = {
        type: 'FAIL_SESSION',
        payload: { focusMinutes: 5 },
      };

      const newState = gameReducer(state, action);

      // isPaused is not reset by FAIL_SESSION
      expect(newState.isPaused).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // RESET_SESSION
  // --------------------------------------------------------------------------
  describe('RESET_SESSION', () => {
    it('should reset to idle state', () => {
      const state = createInitialState({
        sessionState: 'completed',
        currentAnimal: createMockAnimal(),
      });
      const action: GameAction = { type: 'RESET_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('idle');
      expect(newState.currentAnimal).toBeNull();
    });

    it('should clear all session-related state', () => {
      const state = createInitialState({
        sessionState: 'active',
        currentAnimal: createMockAnimal(),
        isPaused: true,
        pauseCount: 3,
        sessionStartTime: '2024-01-15T10:00:00.000Z',
        sessionPausedAt: '2024-01-15T10:15:00.000Z',
        accumulatedPauseTime: 120000,
        restoredSession: {
          session: createMockPersistedSession(),
          remainingTime: 600,
        },
      });
      const action: GameAction = { type: 'RESET_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.sessionState).toBe('idle');
      expect(newState.currentAnimal).toBeNull();
      expect(newState.isPaused).toBe(false);
      expect(newState.pauseCount).toBe(0);
      expect(newState.sessionStartTime).toBeNull();
      expect(newState.sessionPausedAt).toBeNull();
      expect(newState.accumulatedPauseTime).toBe(0);
      expect(newState.restoredSession).toBeNull();
    });

    it('should preserve collection, stats, and settings', () => {
      const collection = [createCollectedAnimal(createMockAnimal(), 'session-1')];
      const stats: Stats = {
        ...createDefaultStats(),
        totalSessions: 10,
        completedSessions: 8,
        currentStreak: 5,
      };
      const settings = {
        ...createDefaultSettings(),
        focusDuration: 45,
      };
      const state = createInitialState({
        sessionState: 'completed',
        collection,
        stats,
        settings,
      });
      const action: GameAction = { type: 'RESET_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(collection);
      expect(newState.stats).toEqual(stats);
      expect(newState.settings).toEqual(settings);
    });

    it('should clear restored session on reset', () => {
      const state = createInitialState({
        restoredSession: {
          session: createMockPersistedSession(),
          remainingTime: 900,
        },
      });
      const action: GameAction = { type: 'RESET_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.restoredSession).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // ADD_TO_COLLECTION
  // --------------------------------------------------------------------------
  describe('ADD_TO_COLLECTION', () => {
    it('should add animal to empty collection', () => {
      const state = createInitialState({ collection: [] });
      const newAnimal = createCollectedAnimal(createMockAnimal(), 'session-1');
      const action: GameAction = {
        type: 'ADD_TO_COLLECTION',
        payload: newAnimal,
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toHaveLength(1);
      expect(newState.collection[0]).toEqual(newAnimal);
    });

    it('should append animal to existing collection', () => {
      const existingAnimal = createCollectedAnimal(
        createMockAnimal({ id: 'existing' }),
        'session-1'
      );
      const state = createInitialState({
        collection: [existingAnimal],
      });
      const newAnimal = createCollectedAnimal(
        createMockAnimal({ id: 'new' }),
        'session-2'
      );
      const action: GameAction = {
        type: 'ADD_TO_COLLECTION',
        payload: newAnimal,
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toHaveLength(2);
      expect(newState.collection[0]).toEqual(existingAnimal);
      expect(newState.collection[1]).toEqual(newAnimal);
    });

    it('should allow duplicate animals (same species, different sessions)', () => {
      const animal1 = createCollectedAnimal(createMockAnimal({ id: 'chick' }), 'session-1');
      const animal2 = createCollectedAnimal(createMockAnimal({ id: 'chick' }), 'session-2');
      const state = createInitialState({
        collection: [animal1],
      });
      const action: GameAction = {
        type: 'ADD_TO_COLLECTION',
        payload: animal2,
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toHaveLength(2);
      // Both should have the same animal id but different sessionIds
      expect(newState.collection[0].sessionId).toBe('session-1');
      expect(newState.collection[1].sessionId).toBe('session-2');
    });

    it('should not mutate original collection array', () => {
      const existingCollection = [
        createCollectedAnimal(createMockAnimal({ id: 'existing' }), 'session-1'),
      ];
      const state = createInitialState({
        collection: existingCollection,
      });
      const newAnimal = createCollectedAnimal(createMockAnimal({ id: 'new' }), 'session-2');
      const action: GameAction = {
        type: 'ADD_TO_COLLECTION',
        payload: newAnimal,
      };

      const newState = gameReducer(state, action);

      // Original array should be unchanged
      expect(existingCollection).toHaveLength(1);
      expect(newState.collection).toHaveLength(2);
      expect(newState.collection).not.toBe(existingCollection);
    });
  });

  // --------------------------------------------------------------------------
  // SET_COLLECTION
  // --------------------------------------------------------------------------
  describe('SET_COLLECTION', () => {
    it('should replace entire collection', () => {
      const existingCollection = [
        createCollectedAnimal(createMockAnimal({ id: 'old1' }), 'session-1'),
        createCollectedAnimal(createMockAnimal({ id: 'old2' }), 'session-2'),
      ];
      const newCollection = [
        createCollectedAnimal(createMockAnimal({ id: 'new1' }), 'session-3'),
      ];
      const state = createInitialState({
        collection: existingCollection,
      });
      const action: GameAction = {
        type: 'SET_COLLECTION',
        payload: newCollection,
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(newCollection);
      expect(newState.collection).toHaveLength(1);
    });

    it('should allow setting empty collection', () => {
      const state = createInitialState({
        collection: [createCollectedAnimal(createMockAnimal(), 'session-1')],
      });
      const action: GameAction = {
        type: 'SET_COLLECTION',
        payload: [],
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // UPDATE_STATS
  // --------------------------------------------------------------------------
  describe('UPDATE_STATS', () => {
    it('should replace entire stats object', () => {
      const state = createInitialState();
      const newStats: Stats = {
        totalSessions: 15,
        completedSessions: 12,
        failedSessions: 3,
        totalFocusMinutes: 300,
        currentStreak: 7,
        bestStreak: 10,
        lastSessionDate: '2024-01-15T10:00:00.000Z',
      };
      const action: GameAction = {
        type: 'UPDATE_STATS',
        payload: newStats,
      };

      const newState = gameReducer(state, action);

      expect(newState.stats).toEqual(newStats);
    });

    it('should update streak correctly', () => {
      const state = createInitialState({
        stats: {
          ...createDefaultStats(),
          currentStreak: 5,
          bestStreak: 5,
        },
      });
      const newStats: Stats = {
        ...state.stats,
        currentStreak: 6,
        bestStreak: 6,
      };
      const action: GameAction = {
        type: 'UPDATE_STATS',
        payload: newStats,
      };

      const newState = gameReducer(state, action);

      expect(newState.stats.currentStreak).toBe(6);
      expect(newState.stats.bestStreak).toBe(6);
    });

    it('should update best streak when current exceeds it', () => {
      const state = createInitialState({
        stats: {
          ...createDefaultStats(),
          currentStreak: 10,
          bestStreak: 8,
        },
      });
      const newStats: Stats = {
        ...state.stats,
        currentStreak: 11,
        bestStreak: 11,
      };
      const action: GameAction = {
        type: 'UPDATE_STATS',
        payload: newStats,
      };

      const newState = gameReducer(state, action);

      expect(newState.stats.currentStreak).toBe(11);
      expect(newState.stats.bestStreak).toBe(11);
    });

    it('should accumulate total focus minutes', () => {
      const state = createInitialState({
        stats: {
          ...createDefaultStats(),
          totalFocusMinutes: 100,
        },
      });
      const newStats: Stats = {
        ...state.stats,
        totalFocusMinutes: 125,
      };
      const action: GameAction = {
        type: 'UPDATE_STATS',
        payload: newStats,
      };

      const newState = gameReducer(state, action);

      expect(newState.stats.totalFocusMinutes).toBe(125);
    });
  });

  // --------------------------------------------------------------------------
  // UPDATE_SETTINGS
  // --------------------------------------------------------------------------
  describe('UPDATE_SETTINGS', () => {
    it('should merge partial settings', () => {
      const state = createInitialState({
        settings: createDefaultSettings(),
      });
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: { focusDuration: 45 },
      };

      const newState = gameReducer(state, action);

      expect(newState.settings.focusDuration).toBe(45);
      // Other settings should remain unchanged
      expect(newState.settings.soundEnabled).toBe(true);
      expect(newState.settings.hapticsEnabled).toBe(true);
    });

    it('should update multiple settings at once', () => {
      const state = createInitialState();
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: {
          focusDuration: 30,
          soundEnabled: false,
          language: 'tr',
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.settings.focusDuration).toBe(30);
      expect(newState.settings.soundEnabled).toBe(false);
      expect(newState.settings.language).toBe('tr');
    });

    it('should update debug mode', () => {
      const state = createInitialState({
        settings: { ...createDefaultSettings(), debugMode: false },
      });
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: { debugMode: true },
      };

      const newState = gameReducer(state, action);

      expect(newState.settings.debugMode).toBe(true);
    });

    it('should update ambient sound settings', () => {
      const state = createInitialState();
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: {
          ambientSoundEnabled: true,
          selectedAmbientSound: 'ocean',
          ambientSoundVolume: 75,
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.settings.ambientSoundEnabled).toBe(true);
      expect(newState.settings.selectedAmbientSound).toBe('ocean');
      expect(newState.settings.ambientSoundVolume).toBe(75);
    });

    it('should update theme mode', () => {
      const state = createInitialState();
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: { themeMode: 'dark' },
      };

      const newState = gameReducer(state, action);

      expect(newState.settings.themeMode).toBe('dark');
    });

    it('should preserve other state when updating settings', () => {
      const collection = [createCollectedAnimal(createMockAnimal(), 'session-1')];
      const state = createInitialState({
        collection,
        sessionState: 'active',
      });
      const action: GameAction = {
        type: 'UPDATE_SETTINGS',
        payload: { focusDuration: 50 },
      };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(collection);
      expect(newState.sessionState).toBe('active');
    });
  });

  // --------------------------------------------------------------------------
  // UPDATE_DAILY_PROGRESS
  // --------------------------------------------------------------------------
  describe('UPDATE_DAILY_PROGRESS', () => {
    it('should update daily progress', () => {
      const state = createInitialState();
      const newProgress: DailyProgress = {
        date: '2024-01-15',
        completedSessions: 3,
        goalAchieved: true,
      };
      const action: GameAction = {
        type: 'UPDATE_DAILY_PROGRESS',
        payload: newProgress,
      };

      const newState = gameReducer(state, action);

      expect(newState.dailyProgress).toEqual(newProgress);
    });

    it('should track goal achievement', () => {
      const state = createInitialState({
        dailyProgress: {
          date: '2024-01-15',
          completedSessions: 2,
          goalAchieved: false,
        },
      });
      const action: GameAction = {
        type: 'UPDATE_DAILY_PROGRESS',
        payload: {
          date: '2024-01-15',
          completedSessions: 3,
          goalAchieved: true,
        },
      };

      const newState = gameReducer(state, action);

      expect(newState.dailyProgress.goalAchieved).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TOGGLE_FAVORITE
  // --------------------------------------------------------------------------
  describe('TOGGLE_FAVORITE', () => {
    it('should set favorites array', () => {
      const state = createInitialState({ favorites: [] });
      const action: GameAction = {
        type: 'TOGGLE_FAVORITE',
        payload: ['animal-1'],
      };

      const newState = gameReducer(state, action);

      expect(newState.favorites).toEqual(['animal-1']);
    });

    it('should add animal to favorites', () => {
      const state = createInitialState({ favorites: ['animal-1'] });
      const action: GameAction = {
        type: 'TOGGLE_FAVORITE',
        payload: ['animal-1', 'animal-2'],
      };

      const newState = gameReducer(state, action);

      expect(newState.favorites).toEqual(['animal-1', 'animal-2']);
    });

    it('should remove animal from favorites', () => {
      const state = createInitialState({ favorites: ['animal-1', 'animal-2'] });
      const action: GameAction = {
        type: 'TOGGLE_FAVORITE',
        payload: ['animal-2'],
      };

      const newState = gameReducer(state, action);

      expect(newState.favorites).toEqual(['animal-2']);
    });

    it('should handle empty favorites', () => {
      const state = createInitialState({ favorites: ['animal-1'] });
      const action: GameAction = {
        type: 'TOGGLE_FAVORITE',
        payload: [],
      };

      const newState = gameReducer(state, action);

      expect(newState.favorites).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // SET_GESTURE_HINTS_SEEN
  // --------------------------------------------------------------------------
  describe('SET_GESTURE_HINTS_SEEN', () => {
    it('should set hasSeenGestureHints to true', () => {
      const state = createInitialState({
        settings: { ...createDefaultSettings(), hasSeenGestureHints: false },
      });
      const action: GameAction = { type: 'SET_GESTURE_HINTS_SEEN' };

      const newState = gameReducer(state, action);

      expect(newState.settings.hasSeenGestureHints).toBe(true);
    });

    it('should preserve other settings', () => {
      const state = createInitialState({
        settings: {
          ...createDefaultSettings(),
          hasSeenGestureHints: false,
          focusDuration: 45,
          soundEnabled: false,
        },
      });
      const action: GameAction = { type: 'SET_GESTURE_HINTS_SEEN' };

      const newState = gameReducer(state, action);

      expect(newState.settings.hasSeenGestureHints).toBe(true);
      expect(newState.settings.focusDuration).toBe(45);
      expect(newState.settings.soundEnabled).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // SET_ONBOARDING_COMPLETE
  // --------------------------------------------------------------------------
  describe('SET_ONBOARDING_COMPLETE', () => {
    it('should set hasCompletedOnboarding to true', () => {
      const state = createInitialState({
        settings: { ...createDefaultSettings(), hasCompletedOnboarding: false },
      });
      const action: GameAction = { type: 'SET_ONBOARDING_COMPLETE' };

      const newState = gameReducer(state, action);

      expect(newState.settings.hasCompletedOnboarding).toBe(true);
    });

    it('should preserve other settings', () => {
      const state = createInitialState({
        settings: {
          ...createDefaultSettings(),
          hasCompletedOnboarding: false,
          dailyGoal: 5,
        },
      });
      const action: GameAction = { type: 'SET_ONBOARDING_COMPLETE' };

      const newState = gameReducer(state, action);

      expect(newState.settings.hasCompletedOnboarding).toBe(true);
      expect(newState.settings.dailyGoal).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // RESTORE_SESSION
  // --------------------------------------------------------------------------
  describe('RESTORE_SESSION', () => {
    it('should store restored session data', () => {
      const state = createInitialState();
      const session = createMockPersistedSession({
        startTime: '2024-01-15T09:30:00.000Z',
        duration: 1500,
        pauseCount: 1,
      });
      const action: GameAction = {
        type: 'RESTORE_SESSION',
        payload: { session, remainingTime: 900 },
      };

      const newState = gameReducer(state, action);

      expect(newState.restoredSession).not.toBeNull();
      expect(newState.restoredSession?.session).toEqual(session);
      expect(newState.restoredSession?.remainingTime).toBe(900);
    });

    it('should not affect current session state', () => {
      const state = createInitialState({
        sessionState: 'idle',
        isPaused: false,
      });
      const action: GameAction = {
        type: 'RESTORE_SESSION',
        payload: {
          session: createMockPersistedSession({ isPaused: true, pauseCount: 2 }),
          remainingTime: 600,
        },
      };

      const newState = gameReducer(state, action);

      // Current session state should remain idle until user decides to restore
      expect(newState.sessionState).toBe('idle');
      expect(newState.isPaused).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // CLEAR_RESTORED_SESSION
  // --------------------------------------------------------------------------
  describe('CLEAR_RESTORED_SESSION', () => {
    it('should clear restored session data', () => {
      const state = createInitialState({
        restoredSession: {
          session: createMockPersistedSession(),
          remainingTime: 600,
        },
      });
      const action: GameAction = { type: 'CLEAR_RESTORED_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.restoredSession).toBeNull();
    });

    it('should not affect other state', () => {
      const collection = [createCollectedAnimal(createMockAnimal(), 'session-1')];
      const state = createInitialState({
        collection,
        restoredSession: {
          session: createMockPersistedSession(),
          remainingTime: 600,
        },
      });
      const action: GameAction = { type: 'CLEAR_RESTORED_SESSION' };

      const newState = gameReducer(state, action);

      expect(newState.collection).toEqual(collection);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should return same state for unknown action type', () => {
      const state = createInitialState();
      const action = { type: 'UNKNOWN_ACTION' } as unknown as GameAction;

      const newState = gameReducer(state, action);

      expect(newState).toBe(state);
    });

    it('should handle rapid pause/resume cycles', () => {
      let state = createInitialState({
        sessionState: 'active',
        isPaused: false,
        pauseCount: 0,
      });

      // Simulate 3 rapid pause/resume cycles
      for (let i = 0; i < 3; i++) {
        state = gameReducer(state, {
          type: 'PAUSE_SESSION',
          payload: { pausedAt: `2024-01-15T10:0${i}:00.000Z` },
        });
        expect(state.pauseCount).toBe(i + 1);

        state = gameReducer(state, {
          type: 'RESUME_SESSION',
          payload: { accumulatedPauseTime: (i + 1) * 60000 },
        });
        expect(state.isPaused).toBe(false);
      }

      expect(state.pauseCount).toBe(3);
      expect(state.accumulatedPauseTime).toBe(180000);
    });

    it('should handle session state transitions correctly', () => {
      // idle -> active -> paused -> resumed -> completed -> idle
      let state = createInitialState();
      expect(state.sessionState).toBe('idle');

      // Start session
      state = gameReducer(state, {
        type: 'START_SESSION',
        payload: { startTime: '2024-01-15T10:00:00.000Z', duration: 1500 },
      });
      expect(state.sessionState).toBe('active');

      // Pause
      state = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:10:00.000Z' },
      });
      expect(state.isPaused).toBe(true);

      // Resume
      state = gameReducer(state, {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 60000 },
      });
      expect(state.isPaused).toBe(false);

      // Complete
      state = gameReducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { animal: createMockAnimal(), focusMinutes: 25 },
      });
      expect(state.sessionState).toBe('completed');

      // Reset
      state = gameReducer(state, { type: 'RESET_SESSION' });
      expect(state.sessionState).toBe('idle');
    });

    it('should handle session failure flow correctly', () => {
      // idle -> active -> failed -> idle
      let state = createInitialState();

      state = gameReducer(state, {
        type: 'START_SESSION',
        payload: { startTime: '2024-01-15T10:00:00.000Z', duration: 1500 },
      });
      expect(state.sessionState).toBe('active');

      state = gameReducer(state, {
        type: 'FAIL_SESSION',
        payload: { focusMinutes: 5 },
      });
      expect(state.sessionState).toBe('failed');

      state = gameReducer(state, { type: 'RESET_SESSION' });
      expect(state.sessionState).toBe('idle');
    });

    it('should not modify state when already paused and pause is called', () => {
      const state = createInitialState({
        sessionState: 'active',
        isPaused: true,
        pauseCount: 2,
        sessionPausedAt: '2024-01-15T10:05:00.000Z',
      });

      const newState = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:06:00.000Z' },
      });

      // Should return exact same state object
      expect(newState).toBe(state);
    });

    it('should maintain immutability - original state should not be modified', () => {
      const originalSettings = createDefaultSettings();
      const state = createInitialState({
        settings: { ...originalSettings },
      });

      gameReducer(state, {
        type: 'UPDATE_SETTINGS',
        payload: { focusDuration: 99 },
      });

      // Original state should be unchanged
      expect(state.settings.focusDuration).toBe(25);
    });

    it('should handle large collection', () => {
      const largeCollection: CollectedAnimal[] = [];
      for (let i = 0; i < 100; i++) {
        largeCollection.push(
          createCollectedAnimal(createMockAnimal({ id: `animal-${i}` }), `session-${i}`)
        );
      }

      const state = createInitialState({ collection: largeCollection });
      const newAnimal = createCollectedAnimal(createMockAnimal({ id: 'new-animal' }), 'new-session');

      const newState = gameReducer(state, {
        type: 'ADD_TO_COLLECTION',
        payload: newAnimal,
      });

      expect(newState.collection).toHaveLength(101);
      expect(newState.collection[100]).toEqual(newAnimal);
    });
  });

  // --------------------------------------------------------------------------
  // State Calculations
  // --------------------------------------------------------------------------
  describe('State Calculations', () => {
    it('should correctly track total sessions through stats updates', () => {
      const state = createInitialState({
        stats: { ...createDefaultStats(), totalSessions: 5 },
      });

      const newState = gameReducer(state, {
        type: 'UPDATE_STATS',
        payload: { ...state.stats, totalSessions: 6, completedSessions: 5 },
      });

      expect(newState.stats.totalSessions).toBe(6);
    });

    it('should handle stats for streak increment', () => {
      const state = createInitialState({
        stats: { ...createDefaultStats(), currentStreak: 0 },
      });

      // Simulate first completed session incrementing streak to 1
      let newState = gameReducer(state, {
        type: 'UPDATE_STATS',
        payload: { ...state.stats, currentStreak: 1, bestStreak: 1 },
      });
      expect(newState.stats.currentStreak).toBe(1);

      // Simulate second session on consecutive day incrementing streak to 2
      newState = gameReducer(newState, {
        type: 'UPDATE_STATS',
        payload: { ...newState.stats, currentStreak: 2, bestStreak: 2 },
      });
      expect(newState.stats.currentStreak).toBe(2);
      expect(newState.stats.bestStreak).toBe(2);
    });

    it('should track best streak updates correctly', () => {
      const state = createInitialState({
        stats: { ...createDefaultStats(), currentStreak: 5, bestStreak: 10 },
      });

      // When current exceeds best, bestStreak should be updated
      const newState = gameReducer(state, {
        type: 'UPDATE_STATS',
        payload: { ...state.stats, currentStreak: 11, bestStreak: 11 },
      });

      expect(newState.stats.bestStreak).toBe(11);
    });

    it('should preserve best streak when current is reset', () => {
      const state = createInitialState({
        stats: { ...createDefaultStats(), currentStreak: 5, bestStreak: 10 },
      });

      // When streak is reset (e.g., missed day), bestStreak should remain
      const newState = gameReducer(state, {
        type: 'UPDATE_STATS',
        payload: { ...state.stats, currentStreak: 1, bestStreak: 10 },
      });

      expect(newState.stats.currentStreak).toBe(1);
      expect(newState.stats.bestStreak).toBe(10);
    });

    it('should accumulate focus time correctly', () => {
      const state = createInitialState({
        stats: { ...createDefaultStats(), totalFocusMinutes: 100 },
      });

      const newState = gameReducer(state, {
        type: 'UPDATE_STATS',
        payload: { ...state.stats, totalFocusMinutes: 125 },
      });

      expect(newState.stats.totalFocusMinutes).toBe(125);
    });
  });

  // --------------------------------------------------------------------------
  // Session Timing Tests
  // --------------------------------------------------------------------------
  describe('Session Timing', () => {
    it('should store session start time when starting', () => {
      const startTime = '2024-01-15T10:00:00.000Z';
      const state = createInitialState();

      const newState = gameReducer(state, {
        type: 'START_SESSION',
        payload: { startTime, duration: 1500 },
      });

      expect(newState.sessionStartTime).toBe(startTime);
    });

    it('should store pause timestamp when pausing', () => {
      const pausedAt = '2024-01-15T10:15:00.000Z';
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
      });

      const newState = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt },
      });

      expect(newState.sessionPausedAt).toBe(pausedAt);
    });

    it('should track accumulated pause time across multiple pauses', () => {
      let state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
      });

      // First pause - 1 minute
      state = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:05:00.000Z' },
      });
      state = gameReducer(state, {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 60000 },
      });
      expect(state.accumulatedPauseTime).toBe(60000);

      // Second pause - 2 minutes more
      state = gameReducer(state, {
        type: 'PAUSE_SESSION',
        payload: { pausedAt: '2024-01-15T10:10:00.000Z' },
      });
      state = gameReducer(state, {
        type: 'RESUME_SESSION',
        payload: { accumulatedPauseTime: 180000 },
      });
      expect(state.accumulatedPauseTime).toBe(180000);
    });

    it('should clear all timing state on session completion', () => {
      const state = createInitialState({
        sessionState: 'active',
        sessionStartTime: '2024-01-15T10:00:00.000Z',
        sessionPausedAt: '2024-01-15T10:20:00.000Z',
        accumulatedPauseTime: 120000,
      });

      const newState = gameReducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { animal: createMockAnimal(), focusMinutes: 25 },
      });

      expect(newState.sessionStartTime).toBeNull();
      expect(newState.sessionPausedAt).toBeNull();
      expect(newState.accumulatedPauseTime).toBe(0);
    });
  });
});
