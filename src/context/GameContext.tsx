import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Animal, getRandomAnimal } from '../data/animals';
import {
    CollectedAnimal,
    Stats,
    Settings,
    getCollection,
    addToCollection,
    getStats,
    incrementSession,
    getSettings,
    updateSettings,
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
    isLoading: boolean;
}

type GameAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'LOAD_DATA'; payload: { collection: CollectedAnimal[]; stats: Stats; settings: Settings } }
    | { type: 'START_SESSION' }
    | { type: 'COMPLETE_SESSION'; payload: { animal: Animal; focusMinutes: number } }
    | { type: 'FAIL_SESSION'; payload: { focusMinutes: number } }
    | { type: 'RESET_SESSION' }
    | { type: 'ADD_TO_COLLECTION'; payload: CollectedAnimal }
    | { type: 'UPDATE_STATS'; payload: Stats }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> };

interface GameContextType {
    state: GameState;
    startSession: () => void;
    completeSession: (focusMinutes: number) => Promise<Animal>;
    failSession: (focusMinutes: number) => Promise<void>;
    resetSession: () => void;
    updateUserSettings: (settings: Partial<Settings>) => Promise<void>;
    i18n: (key: TranslationKey) => string;
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
    },
    isLoading: true,
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
                isLoading: false,
            };

        case 'START_SESSION':
            return {
                ...state,
                sessionState: 'active',
                currentAnimal: null,
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
                const [collection, stats, settings] = await Promise.all([
                    getCollection(),
                    getStats(),
                    getSettings(),
                ]);
                dispatch({ type: 'LOAD_DATA', payload: { collection, stats, settings } });
            } catch (error) {
                console.error('Failed to load data:', error);
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        }
        loadData();
    }, []);

    const startSession = () => {
        dispatch({ type: 'START_SESSION' });
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

    // Translation helper
    const i18n = useCallback((key: TranslationKey): string => {
        return t(key, state.settings.language);
    }, [state.settings.language]);

    return (
        <GameContext.Provider
            value={{
                state,
                startSession,
                completeSession,
                failSession,
                resetSession,
                updateUserSettings,
                i18n,
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
