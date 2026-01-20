import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Animal, getRandomAnimal } from '../data/animals';
import { audioManager } from '../services/audioManager';
import {
    CollectedAnimal,
    Stats,
    Settings,
    DailyProgress,
    AnimalInteraction,
    PetResult,
    FeedResult,
    PersistedSession,
    SessionRestoreResult,
    getCollection,
    addToCollection,
    getStats,
    incrementSession,
    getSettings,
    updateSettings,
    getFavorites,
    toggleFavorite as toggleFavoriteStorage,
    getDailyProgress,
    incrementDailyProgress,
    getAnimalInteraction,
    petAnimal as petAnimalStorage,
    feedAnimal as feedAnimalStorage,
    getPetCooldownRemaining,
    getFeedCooldownRemaining,
    getHappinessLevel,
    saveActiveSession,
    clearActiveSession,
    restoreActiveSession,
} from '../utils/storage';
import { checkAndAwardFreeze } from '../utils/streakFreeze';
import { t, TranslationKey, getDeviceLanguage } from '../i18n/translations';

// Types
export type SessionState = 'idle' | 'active' | 'completed' | 'failed';

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
    // Session timing state for persistence
    sessionStartTime: string | null;      // ISO timestamp when session started
    sessionPausedAt: string | null;       // ISO timestamp when paused (if isPaused)
    accumulatedPauseTime: number;         // Total time spent paused in milliseconds
    // Restored session data (when app restores an interrupted session)
    restoredSession: { session: PersistedSession; remainingTime: number } | null;
}

type GameAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'LOAD_DATA'; payload: { collection: CollectedAnimal[]; stats: Stats; settings: Settings; favorites: string[]; dailyProgress: DailyProgress } }
    | { type: 'START_SESSION'; payload: { startTime: string; duration: number } }
    | { type: 'PAUSE_SESSION'; payload: { pausedAt: string } }
    | { type: 'EMERGENCY_PAUSE'; payload: { pausedAt: string } }
    | { type: 'RESUME_SESSION'; payload: { accumulatedPauseTime: number } }
    | { type: 'COMPLETE_SESSION'; payload: { animal: Animal; focusMinutes: number } }
    | { type: 'FAIL_SESSION'; payload: { focusMinutes: number } }
    | { type: 'RESET_SESSION' }
    | { type: 'ADD_TO_COLLECTION'; payload: CollectedAnimal }
    | { type: 'UPDATE_STATS'; payload: Stats }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
    | { type: 'UPDATE_DAILY_PROGRESS'; payload: DailyProgress }
    | { type: 'TOGGLE_FAVORITE'; payload: string[] }
    | { type: 'SET_GESTURE_HINTS_SEEN' }
    | { type: 'SET_ONBOARDING_COMPLETE' }
    | { type: 'RESTORE_SESSION'; payload: { session: PersistedSession; remainingTime: number } }
    | { type: 'CLEAR_RESTORED_SESSION' };

export interface CompleteSessionResult {
    animal: Animal;
    updatedStats: Stats;
}

interface GameContextType {
    state: GameState;
    startSession: (duration: number) => void;
    pauseSession: () => void;
    emergencyPause: () => void;
    resumeSession: () => void;
    completeSession: (focusMinutes: number) => Promise<CompleteSessionResult>;
    failSession: (focusMinutes: number) => Promise<void>;
    resetSession: () => void;
    updateUserSettings: (settings: Partial<Settings>) => Promise<void>;
    toggleFavorite: (animalId: string) => Promise<void>;
    setGestureHintsSeen: () => Promise<void>;
    setOnboardingComplete: () => Promise<void>;
    i18n: (key: TranslationKey) => string;
    // Animal interaction functions
    getInteraction: (animalId: string) => Promise<AnimalInteraction>;
    petAnimal: (animalId: string) => Promise<PetResult>;
    feedAnimal: (animalId: string) => Promise<FeedResult>;
    getPetCooldown: (interaction: AnimalInteraction) => number;
    getFeedCooldown: (interaction: AnimalInteraction) => number;
    getHappinessLevel: (happiness: number) => 'sad' | 'neutral' | 'happy' | 'ecstatic';
    // Session restore functions
    clearRestoredSession: () => void;
}

// Initial state
const initialState: GameState = {
    sessionState: 'idle',
    currentAnimal: null,
    collection: [],
    stats: {
        totalSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        totalFocusMinutes: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastSessionDate: null,
    },
    settings: {
        focusDuration: 25,
        toleranceSeconds: 20,
        soundEnabled: true,
        hapticsEnabled: true,
        notificationsEnabled: true,
        language: getDeviceLanguage(),
        debugMode: false,
        hasSeenGestureHints: false,
        maxPausesPerSession: 3,
        hasCompletedOnboarding: false,
        dailyGoal: 3,
        emergencyPauseDuration: 60,
        reducedMotion: 'system',
    },
    dailyProgress: {
        date: new Date().toISOString().split('T')[0],
        completedSessions: 0,
        goalAchieved: false,
    },
    isLoading: true,
    isPaused: false,
    pauseCount: 0,
    favorites: [],
    // Session timing state
    sessionStartTime: null,
    sessionPausedAt: null,
    accumulatedPauseTime: 0,
    restoredSession: null,
};

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'LOAD_DATA':
            return {
                ...state,
                collection: action.payload.collection,
                stats: action.payload.stats,
                settings: action.payload.settings,
                favorites: action.payload.favorites,
                dailyProgress: action.payload.dailyProgress,
                isLoading: false,
            };

        case 'START_SESSION':
            return {
                ...state,
                sessionState: 'active',
                currentAnimal: null,
                isPaused: false,
                pauseCount: 0,
                sessionStartTime: action.payload.startTime,
                sessionPausedAt: null,
                accumulatedPauseTime: 0,
            };

        case 'PAUSE_SESSION':
            // Guard: don't increment if already paused (prevents double-pause race condition)
            if (state.isPaused) return state;
            return {
                ...state,
                isPaused: true,
                pauseCount: state.pauseCount + 1,
                sessionPausedAt: action.payload.pausedAt,
            };

        case 'EMERGENCY_PAUSE':
            // Emergency pause sets isPaused but doesn't increment pauseCount
            if (state.isPaused) return state;
            return {
                ...state,
                isPaused: true,
                sessionPausedAt: action.payload.pausedAt,
            };

        case 'RESUME_SESSION':
            return {
                ...state,
                isPaused: false,
                sessionPausedAt: null,
                accumulatedPauseTime: action.payload.accumulatedPauseTime,
            };

        case 'COMPLETE_SESSION':
            return {
                ...state,
                sessionState: 'completed',
                currentAnimal: action.payload.animal,
                sessionStartTime: null,
                sessionPausedAt: null,
                accumulatedPauseTime: 0,
            };

        case 'FAIL_SESSION':
            return {
                ...state,
                sessionState: 'failed',
                currentAnimal: null,
                sessionStartTime: null,
                sessionPausedAt: null,
                accumulatedPauseTime: 0,
            };

        case 'RESET_SESSION':
            return {
                ...state,
                sessionState: 'idle',
                currentAnimal: null,
                isPaused: false,
                pauseCount: 0,
                sessionStartTime: null,
                sessionPausedAt: null,
                accumulatedPauseTime: 0,
                restoredSession: null,
            };

        case 'ADD_TO_COLLECTION':
            return {
                ...state,
                collection: [...state.collection, action.payload],
            };

        case 'UPDATE_STATS':
            return {
                ...state,
                stats: action.payload,
            };

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
            };

        case 'UPDATE_DAILY_PROGRESS':
            return {
                ...state,
                dailyProgress: action.payload,
            };

        case 'TOGGLE_FAVORITE':
            return {
                ...state,
                favorites: action.payload,
            };

        case 'SET_GESTURE_HINTS_SEEN':
            return {
                ...state,
                settings: { ...state.settings, hasSeenGestureHints: true },
            };

        case 'SET_ONBOARDING_COMPLETE':
            return {
                ...state,
                settings: { ...state.settings, hasCompletedOnboarding: true },
            };

        case 'RESTORE_SESSION':
            return {
                ...state,
                restoredSession: {
                    session: action.payload.session,
                    remainingTime: action.payload.remainingTime,
                },
            };

        case 'CLEAR_RESTORED_SESSION':
            return {
                ...state,
                restoredSession: null,
            };

        default:
            return state;
    }
}

// Context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    // Track the current session duration for persistence
    const sessionDurationRef = useRef<number>(0);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            try {
                const [collection, stats, settings, favorites, dailyProgress] = await Promise.all([
                    getCollection(),
                    getStats(),
                    getSettings(),
                    getFavorites(),
                    getDailyProgress(),
                ]);
                dispatch({ type: 'LOAD_DATA', payload: { collection, stats, settings, favorites, dailyProgress } });

                // Sync audio manager with loaded settings
                audioManager.setEnabled(settings.soundEnabled);

                // Check for interrupted session to restore
                const restoreResult: SessionRestoreResult = await restoreActiveSession();

                if (restoreResult.status === 'restored') {
                    // Session can be restored - store data for UI to handle
                    dispatch({
                        type: 'RESTORE_SESSION',
                        payload: {
                            session: restoreResult.session,
                            remainingTime: restoreResult.remainingTime,
                        },
                    });
                    console.log(`[GameContext] Session can be restored with ${restoreResult.remainingTime}s remaining`);
                } else if (restoreResult.status === 'expired') {
                    // Session expired while app was killed - record as failed
                    console.log(`[GameContext] Interrupted session expired, recording as failed`);
                    const updatedStats = await incrementSession(false, restoreResult.focusMinutes);
                    dispatch({ type: 'UPDATE_STATS', payload: updatedStats });
                } else if (restoreResult.status === 'error') {
                    console.warn(`[GameContext] Session restore error: ${restoreResult.error}`);
                }
                // status === 'none' means no session to restore, which is normal
            } catch (error) {
                console.error('Failed to load data:', error);
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
        loadData();
    }, []);

    // Persist session state when it changes
    useEffect(() => {
        async function persistSession() {
            if (state.sessionState === 'active' && state.sessionStartTime) {
                const sessionData: PersistedSession = {
                    startTime: state.sessionStartTime,
                    duration: sessionDurationRef.current,
                    pauseCount: state.pauseCount,
                    isPaused: state.isPaused,
                    pausedAt: state.sessionPausedAt,
                    accumulatedPauseTime: state.accumulatedPauseTime,
                    focusDuration: state.settings.focusDuration,
                };
                await saveActiveSession(sessionData);
            } else if (state.sessionState !== 'active') {
                // Session ended (completed, failed, or reset) - clear persisted session
                await clearActiveSession();
            }
        }

        // Only persist if we're not in the initial loading state
        if (!state.isLoading) {
            persistSession();
        }
    }, [
        state.sessionState,
        state.sessionStartTime,
        state.isPaused,
        state.sessionPausedAt,
        state.pauseCount,
        state.accumulatedPauseTime,
        state.settings.focusDuration,
        state.isLoading,
    ]);

    // Sync audio manager when soundEnabled setting changes
    useEffect(() => {
        audioManager.setEnabled(state.settings.soundEnabled);
    }, [state.settings.soundEnabled]);

    const startSession = (duration: number) => {
        sessionDurationRef.current = duration;
        dispatch({
            type: 'START_SESSION',
            payload: {
                startTime: new Date().toISOString(),
                duration,
            },
        });
    };

    const pauseSession = () => {
        dispatch({
            type: 'PAUSE_SESSION',
            payload: { pausedAt: new Date().toISOString() },
        });
    };

    const emergencyPause = () => {
        dispatch({
            type: 'EMERGENCY_PAUSE',
            payload: { pausedAt: new Date().toISOString() },
        });
    };

    const resumeSession = () => {
        // Calculate accumulated pause time
        let newAccumulatedPauseTime = state.accumulatedPauseTime;
        if (state.sessionPausedAt) {
            const pausedAt = new Date(state.sessionPausedAt).getTime();
            const now = Date.now();
            newAccumulatedPauseTime += (now - pausedAt);
        }
        dispatch({
            type: 'RESUME_SESSION',
            payload: { accumulatedPauseTime: newAccumulatedPauseTime },
        });
    };

    const completeSession = async (focusMinutes: number): Promise<CompleteSessionResult> => {
        const animal = getRandomAnimal();
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        dispatch({ type: 'COMPLETE_SESSION', payload: { animal, focusMinutes } });

        // Persist to storage - storage functions have built-in error handling
        // and return fallback data on failure (see storage.ts)
        const updatedCollection = await addToCollection(animal, sessionId);
        dispatch({ type: 'ADD_TO_COLLECTION', payload: updatedCollection[updatedCollection.length - 1] });

        const updatedStats = await incrementSession(true, focusMinutes);
        dispatch({ type: 'UPDATE_STATS', payload: updatedStats });

        const updatedDailyProgress = await incrementDailyProgress(state.settings.dailyGoal);
        dispatch({ type: 'UPDATE_DAILY_PROGRESS', payload: updatedDailyProgress });

        // Check and award streak freeze based on streak milestone
        await checkAndAwardFreeze(updatedStats.currentStreak);

        return { animal, updatedStats };
    };

    const failSession = async (focusMinutes: number): Promise<void> => {
        dispatch({ type: 'FAIL_SESSION', payload: { focusMinutes } });

        const updatedStats = await incrementSession(false, focusMinutes);
        dispatch({ type: 'UPDATE_STATS', payload: updatedStats });
    };

    const resetSession = () => {
        dispatch({ type: 'RESET_SESSION' });
    };

    const updateUserSettings = async (newSettings: Partial<Settings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
        await updateSettings(newSettings);
    };

    const toggleFavorite = async (animalId: string) => {
        const updatedFavorites = await toggleFavoriteStorage(animalId);
        dispatch({ type: 'TOGGLE_FAVORITE', payload: updatedFavorites });
    };

    const setGestureHintsSeen = async () => {
        dispatch({ type: 'SET_GESTURE_HINTS_SEEN' });
        await updateSettings({ hasSeenGestureHints: true });
    };

    const setOnboardingComplete = async () => {
        dispatch({ type: 'SET_ONBOARDING_COMPLETE' });
        await updateSettings({ hasCompletedOnboarding: true });
    };

    const clearRestoredSession = () => {
        dispatch({ type: 'CLEAR_RESTORED_SESSION' });
        clearActiveSession();
    };

    // Animal interaction functions
    const getInteraction = async (animalId: string): Promise<AnimalInteraction> => {
        return getAnimalInteraction(animalId);
    };

    const petAnimal = async (animalId: string): Promise<PetResult> => {
        const result = await petAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('pet');
        }
        return result;
    };

    const feedAnimal = async (animalId: string): Promise<FeedResult> => {
        const result = await feedAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('feed');
        }
        return result;
    };

    const getPetCooldown = (interaction: AnimalInteraction): number => {
        return getPetCooldownRemaining(interaction);
    };

    const getFeedCooldown = (interaction: AnimalInteraction): number => {
        return getFeedCooldownRemaining(interaction);
    };

    // Translation helper
    const i18n = useCallback((key: TranslationKey): string => {
        return t(key, state.settings.language);
    }, [state.settings.language]);

    return (
        <GameContext.Provider
            value={{
                state,
                startSession,
                pauseSession,
                emergencyPause,
                resumeSession,
                completeSession,
                failSession,
                resetSession,
                updateUserSettings,
                toggleFavorite,
                setGestureHintsSeen,
                setOnboardingComplete,
                i18n,
                // Animal interaction functions
                getInteraction,
                petAnimal,
                feedAnimal,
                getPetCooldown,
                getFeedCooldown,
                getHappinessLevel,
                // Session restore functions
                clearRestoredSession,
            }}
        >
            {children}
        </GameContext.Provider>
    );
}

// Hook
export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}
