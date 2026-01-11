import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
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
} from '../utils/storage';
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
}

type GameAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'LOAD_DATA'; payload: { collection: CollectedAnimal[]; stats: Stats; settings: Settings; favorites: string[]; dailyProgress: DailyProgress } }
    | { type: 'START_SESSION' }
    | { type: 'PAUSE_SESSION' }
    | { type: 'EMERGENCY_PAUSE' }
    | { type: 'RESUME_SESSION' }
    | { type: 'COMPLETE_SESSION'; payload: { animal: Animal; focusMinutes: number } }
    | { type: 'FAIL_SESSION'; payload: { focusMinutes: number } }
    | { type: 'RESET_SESSION' }
    | { type: 'ADD_TO_COLLECTION'; payload: CollectedAnimal }
    | { type: 'UPDATE_STATS'; payload: Stats }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
    | { type: 'UPDATE_DAILY_PROGRESS'; payload: DailyProgress }
    | { type: 'TOGGLE_FAVORITE'; payload: string[] }
    | { type: 'SET_GESTURE_HINTS_SEEN' }
    | { type: 'SET_ONBOARDING_COMPLETE' };

interface GameContextType {
    state: GameState;
    startSession: () => void;
    pauseSession: () => void;
    emergencyPause: () => void;
    resumeSession: () => void;
    completeSession: (focusMinutes: number) => Promise<Animal>;
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
            };

        case 'PAUSE_SESSION':
            // Guard: don't increment if already paused (prevents double-pause race condition)
            if (state.isPaused) return state;
            return {
                ...state,
                isPaused: true,
                pauseCount: state.pauseCount + 1,
            };

        case 'EMERGENCY_PAUSE':
            // Emergency pause sets isPaused but doesn't increment pauseCount
            if (state.isPaused) return state;
            return {
                ...state,
                isPaused: true,
            };

        case 'RESUME_SESSION':
            return {
                ...state,
                isPaused: false,
            };

        case 'COMPLETE_SESSION':
            return {
                ...state,
                sessionState: 'completed',
                currentAnimal: action.payload.animal,
            };

        case 'FAIL_SESSION':
            return {
                ...state,
                sessionState: 'failed',
                currentAnimal: null,
            };

        case 'RESET_SESSION':
            return {
                ...state,
                sessionState: 'idle',
                currentAnimal: null,
                isPaused: false,
                pauseCount: 0,
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

        default:
            return state;
    }
}

// Context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(gameReducer, initialState);

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
            } catch (error) {
                console.error('Failed to load data:', error);
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
        loadData();
    }, []);

    // Sync audio manager when soundEnabled setting changes
    useEffect(() => {
        audioManager.setEnabled(state.settings.soundEnabled);
    }, [state.settings.soundEnabled]);

    const startSession = () => {
        dispatch({ type: 'START_SESSION' });
    };

    const pauseSession = () => {
        dispatch({ type: 'PAUSE_SESSION' });
    };

    const emergencyPause = () => {
        dispatch({ type: 'EMERGENCY_PAUSE' });
    };

    const resumeSession = () => {
        dispatch({ type: 'RESUME_SESSION' });
    };

    const completeSession = async (focusMinutes: number): Promise<Animal> => {
        const animal = getRandomAnimal();
        const sessionId = Date.now().toString();

        // Update state
        dispatch({ type: 'COMPLETE_SESSION', payload: { animal, focusMinutes } });

        // Persist
        const updatedCollection = await addToCollection(animal, sessionId);
        dispatch({ type: 'ADD_TO_COLLECTION', payload: updatedCollection[updatedCollection.length - 1] });

        const updatedStats = await incrementSession(true, focusMinutes);
        dispatch({ type: 'UPDATE_STATS', payload: updatedStats });

        // Update daily progress
        const updatedDailyProgress = await incrementDailyProgress(state.settings.dailyGoal);
        dispatch({ type: 'UPDATE_DAILY_PROGRESS', payload: updatedDailyProgress });

        return animal;
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
