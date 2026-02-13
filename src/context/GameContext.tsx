import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Animal, getRandomAnimal, animals } from '../data/animals';
import {
    Achievement,
    UnlockedAchievement,
    checkSessionMilestone,
    checkStreakMilestone,
    checkFirstRarityAchievement,
    checkCollectionMilestone,
    checkFirstAnimalMilestone,
    checkCollectionCountMilestone,
    checkEarlyStreakMilestone,
    isMilestoneCelebration,
} from '../data/achievements';
import { audioManager } from '../services/audioManager';
import {
    CollectedAnimal,
    Stats,
    Settings,
    DailyProgress,
    AnimalInteraction,
    PetResult,
    FeedResult,
    PlayResult,
    TrainResult,
    GroomResult,
    TalkResult,
    PersistedSession,
    SessionRestoreResult,
    StorageResult,
    getCollection,
    getCollectionSafe,
    addToCollection,
    getStats,
    getStatsSafe,
    incrementSession,
    getSettings,
    getSettingsSafe,
    updateSettings,
    getFavorites,
    toggleFavorite as toggleFavoriteStorage,
    getDailyProgress,
    incrementDailyProgress,
    getAnimalInteraction,
    petAnimal as petAnimalStorage,
    feedAnimal as feedAnimalStorage,
    playWithAnimal as playWithAnimalStorage,
    trainAnimal as trainAnimalStorage,
    groomAnimal as groomAnimalStorage,
    talkToAnimal as talkToAnimalStorage,
    getPetCooldownRemaining,
    getFeedCooldownRemaining,
    getPlayCooldownRemaining,
    getTrainCooldownRemaining,
    getGroomCooldownRemaining,
    getTalkCooldownRemaining,
    getHappinessLevel,
    saveActiveSession,
    clearActiveSession,
    restoreActiveSession,
    getUnlockedAchievements,
    unlockAchievement,
} from '../utils/storage';
import { checkAndAwardFreeze } from '../utils/streakFreeze';
import { t, TranslationKey, getDeviceLanguage, getAnimalName } from '../i18n/translations';
import {
    announceSessionStart,
    announceSessionPause,
    announceSessionResume,
    announceSessionComplete,
    announceSessionFailed,
    announceStreakUpdate,
    announceAchievementUnlocked,
    announceMilestoneReached,
    announceDailyGoalComplete,
} from '../utils/accessibility';

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
    // Error state for data loading failures - null means no error
    loadError: string | null;
    isPaused: boolean;
    pauseCount: number;
    favorites: string[];
    // Session timing state for persistence
    sessionStartTime: string | null;      // ISO timestamp when session started
    sessionPausedAt: string | null;       // ISO timestamp when paused (if isPaused)
    accumulatedPauseTime: number;         // Total time spent paused in milliseconds
    // Restored session data (when app restores an interrupted session)
    restoredSession: { session: PersistedSession; remainingTime: number } | null;
    // Achievement state
    unlockedAchievements: UnlockedAchievement[];
    pendingAchievement: Achievement | null;
    // Milestone celebration state (for enhanced celebrations)
    pendingMilestone: Achievement | null;
}

type GameAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_LOAD_ERROR'; payload: string | null }
    | { type: 'LOAD_DATA'; payload: { collection: CollectedAnimal[]; stats: Stats; settings: Settings; favorites: string[]; dailyProgress: DailyProgress; unlockedAchievements: UnlockedAchievement[] } }
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
    playWithAnimal: (animalId: string) => Promise<PlayResult>;
    trainAnimal: (animalId: string) => Promise<TrainResult>;
    groomAnimal: (animalId: string) => Promise<GroomResult>;
    talkToAnimal: (animalId: string) => Promise<TalkResult>;
    getPetCooldown: (interaction: AnimalInteraction) => number;
    getFeedCooldown: (interaction: AnimalInteraction) => number;
    getPlayCooldown: (interaction: AnimalInteraction) => number;
    getTrainCooldown: (interaction: AnimalInteraction) => number;
    getGroomCooldown: (interaction: AnimalInteraction) => number;
    getTalkCooldown: (interaction: AnimalInteraction) => number;
    getHappinessLevel: (happiness: number) => 'sad' | 'neutral' | 'happy' | 'ecstatic';
    // Session restore functions
    clearRestoredSession: () => void;
    // Achievement functions
    dismissAchievement: () => void;
    // Milestone celebration functions
    dismissMilestone: () => void;
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
        lastGestureHintSession: 0,
        gestureHintIntervalSessions: 5,
        maxPausesPerSession: 3,
        hasCompletedOnboarding: false,
        dailyGoal: 3,
        emergencyPauseDuration: 60,
        reducedMotion: 'system',
        themeMode: 'system',
        // Ambient sound defaults
        ambientSoundEnabled: false,
        selectedAmbientSound: 'rain',
        ambientSoundVolume: 50,
        // Pomodoro defaults
        pomodoroEnabled: false,
        pomodoroWorkDuration: 25,
        pomodoroBreakDuration: 5,
        pomodoroLongBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        // Egg customization default
        selectedEggStyle: 'classic',
    },
    dailyProgress: (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
            date: `${year}-${month}-${day}`,
            completedSessions: 0,
            goalAchieved: false,
        };
    })(),
    isLoading: true,
    loadError: null,
    isPaused: false,
    pauseCount: 0,
    favorites: [],
    // Session timing state
    sessionStartTime: null,
    sessionPausedAt: null,
    accumulatedPauseTime: 0,
    restoredSession: null,
    // Achievement state
    unlockedAchievements: [],
    pendingAchievement: null,
    // Milestone celebration state
    pendingMilestone: null,
};

// Reducer
export function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_LOAD_ERROR':
            return { ...state, loadError: action.payload, isLoading: false };

        case 'LOAD_DATA':
            return {
                ...state,
                collection: action.payload.collection,
                stats: action.payload.stats,
                settings: action.payload.settings,
                favorites: action.payload.favorites,
                dailyProgress: action.payload.dailyProgress,
                unlockedAchievements: action.payload.unlockedAchievements,
                isLoading: false,
                // Note: loadError is set separately via SET_LOAD_ERROR if there were partial failures
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
            // Guard: reject corrupted negative pauseCount (should never happen, but defensive)
            if (state.pauseCount < 0) return state;
            // Guard: don't allow pausing beyond the configured limit
            if (state.pauseCount >= state.settings.maxPausesPerSession) return state;
            return {
                ...state,
                isPaused: true,
                pauseCount: state.pauseCount + 1,
                sessionPausedAt: action.payload.pausedAt,
            };

        case 'EMERGENCY_PAUSE':
            // Emergency pause sets isPaused but doesn't increment pauseCount
            // No pauseCount guard — emergency pause is a power-up that works regardless of regular pause limit
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
                isPaused: false,
                pauseCount: 0,
                sessionStartTime: null,
                sessionPausedAt: null,
                accumulatedPauseTime: 0,
            };

        case 'FAIL_SESSION':
            return {
                ...state,
                sessionState: 'failed',
                currentAnimal: null,
                isPaused: false,
                pauseCount: 0,
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

        case 'SET_COLLECTION':
            return {
                ...state,
                collection: action.payload,
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

        case 'SET_PENDING_ACHIEVEMENT':
            return {
                ...state,
                pendingAchievement: action.payload,
            };

        case 'ADD_UNLOCKED_ACHIEVEMENT':
            return {
                ...state,
                unlockedAchievements: [...state.unlockedAchievements, action.payload],
            };

        case 'SET_PENDING_MILESTONE':
            return {
                ...state,
                pendingMilestone: action.payload,
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
    // Lock to prevent concurrent completeSession calls (ref survives across renders)
    const isCompletingRef = useRef(false);
    // Lock to prevent concurrent failSession calls
    const isFailingRef = useRef(false);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            try {
                // Use safe versions for critical data to track load failures
                const [collectionResult, statsResult, settingsResult, favorites, dailyProgress, unlockedAchievements] = await Promise.all([
                    getCollectionSafe(),
                    getStatsSafe(),
                    getSettingsSafe(),
                    getFavorites(),
                    getDailyProgress(),
                    getUnlockedAchievements(),
                ]);

                // Check for any critical load failures
                const loadErrors: string[] = [];
                if (!collectionResult.success) loadErrors.push(collectionResult.error);
                if (!statsResult.success) loadErrors.push(statsResult.error);
                if (!settingsResult.success) loadErrors.push(settingsResult.error);

                // Extract data (using fallbacks if load failed)
                const collection = collectionResult.success ? collectionResult.data : collectionResult.fallback;
                const stats = statsResult.success ? statsResult.data : statsResult.fallback;
                const settings = settingsResult.success ? settingsResult.data : settingsResult.fallback;

                dispatch({ type: 'LOAD_DATA', payload: { collection, stats, settings, favorites, dailyProgress, unlockedAchievements } });

                // Set error state if any critical data failed to load
                if (loadErrors.length > 0) {
                    console.warn('[GameContext] Some data failed to load:', loadErrors);
                    dispatch({ type: 'SET_LOAD_ERROR', payload: loadErrors.join('; ') });
                }

                // Sync audio manager with loaded settings
                audioManager.setEnabled(settings.soundEnabled);

                // Check for interrupted session to restore
                const restoreResult: SessionRestoreResult = await restoreActiveSession();

                if (restoreResult.status === 'restored') {
                    // Session can be restored - store data for UI to handle
                    // Set the duration ref so the persistence effect writes the correct value
                    sessionDurationRef.current = restoreResult.session.duration;
                    dispatch({
                        type: 'RESTORE_SESSION',
                        payload: {
                            session: restoreResult.session,
                            remainingTime: restoreResult.remainingTime,
                        },
                    });
                    // TODO: Pomodoro state (isPomodoroMode, pomodoroPhase, pomodoroWorkSessionsCompleted)
                    // is available in restoreResult.session if persisted, but must be consumed by
                    // usePomodoroTimer hook in app/index.tsx via restoredSession state.
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
                dispatch({ type: 'SET_LOAD_ERROR', payload: `Critical error loading app data: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
                    // TODO: Pomodoro state (isPomodoroMode, pomodoroPhase, pomodoroWorkSessionsCompleted)
                    // is managed by usePomodoroTimer hook in app/index.tsx, not in GameContext.
                    // To persist Pomodoro state across app kills, the hook would need to write
                    // these fields into the persisted session data separately, or GameContext
                    // would need to be extended to track Pomodoro phase state.
                };
                const saved = await saveActiveSession(sessionData);
                if (!saved) {
                    console.warn('[GameContext] Session persistence failed - recovery may not work if app is killed');
                }
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

        // Announce session start to screen readers
        const durationMinutes = Math.round(duration / 60);
        announceSessionStart(durationMinutes, state.settings.language);
    };

    const pauseSession = () => {
        // Guard: don't announce or calculate if already paused (prevents off-by-one on rapid tap)
        if (state.isPaused) return;

        // Calculate remaining pauses (maxPauses - currentPauseCount - 1 because we're about to use one)
        const pausesRemaining = state.settings.maxPausesPerSession - state.pauseCount - 1;

        dispatch({
            type: 'PAUSE_SESSION',
            payload: { pausedAt: new Date().toISOString() },
        });

        // Announce pause to screen readers
        announceSessionPause(Math.max(0, pausesRemaining), state.settings.language);
    };

    const emergencyPause = () => {
        // Guard: only allow emergency pause when session is active
        if (state.sessionState !== 'active') return;

        dispatch({
            type: 'EMERGENCY_PAUSE',
            payload: { pausedAt: new Date().toISOString() },
        });
    };

    const resumeSession = () => {
        if (state.sessionState !== 'active') {
            console.warn('[resumeSession] Called when session not active, ignoring.');
            return;
        }

        // Calculate accumulated pause time, guarding against negative values
        // (could happen if system clock changed or pausedAt timestamp is corrupted)
        let newAccumulatedPauseTime = state.accumulatedPauseTime;
        if (state.sessionPausedAt) {
            const pausedAt = new Date(state.sessionPausedAt).getTime();
            const now = Date.now();
            newAccumulatedPauseTime += (now - pausedAt);
        }
        newAccumulatedPauseTime = Math.max(0, newAccumulatedPauseTime);
        dispatch({
            type: 'RESUME_SESSION',
            payload: { accumulatedPauseTime: newAccumulatedPauseTime },
        });

        // Announce resume to screen readers
        announceSessionResume(state.settings.language);
    };

    // Helper function to check and trigger achievements
    const checkAndTriggerAchievements = async (
        stats: Stats,
        collection: CollectedAnimal[],
        newAnimal: Animal,
        currentUnlocked: UnlockedAchievement[]
    ): Promise<void> => {
        const unlockedIds = currentUnlocked.map(a => a.id);
        const totalAnimalsHatched = collection.length;

        // PRIORITY 1: Check first animal milestone (very special celebration!)
        let achievement = checkFirstAnimalMilestone(totalAnimalsHatched, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return; // Only show one achievement at a time
        }

        // PRIORITY 2: Check first rarity achievement (exciting discovery!)
        achievement = checkFirstRarityAchievement(newAnimal.rarity, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }

        // PRIORITY 3: Check streak milestones (including early 3-day streak)
        achievement = checkEarlyStreakMilestone(stats.currentStreak, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }
        achievement = checkStreakMilestone(stats.currentStreak, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }

        // PRIORITY 4: Check collection count milestones (total hatched)
        achievement = checkCollectionCountMilestone(totalAnimalsHatched, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }

        // PRIORITY 5: Check session milestone
        achievement = checkSessionMilestone(stats.completedSessions, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }

        // PRIORITY 6: Check collection percentage milestones
        const uniqueAnimalIds = new Set(collection.map(a => a.id));
        const totalAnimals = animals.length;
        achievement = checkCollectionMilestone(uniqueAnimalIds.size, totalAnimals, unlockedIds);
        if (achievement) {
            await triggerAchievement(achievement);
            return;
        }
    };

    // Trigger an achievement celebration
    const triggerAchievement = async (achievement: Achievement): Promise<void> => {
        // Persist the unlock
        await unlockAchievement(achievement.id);

        // Update local state
        const newUnlockedAchievement: UnlockedAchievement = {
            id: achievement.id,
            unlockedAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_UNLOCKED_ACHIEVEMENT', payload: newUnlockedAchievement });

        // Get localized achievement name for screen reader
        const achievementNameKey = `achievement_${achievement.id}` as TranslationKey;
        const achievementName = t(achievementNameKey, state.settings.language) || achievement.id;

        // Check if this achievement deserves an enhanced milestone celebration
        if (isMilestoneCelebration(achievement)) {
            // Show the enhanced milestone celebration modal
            dispatch({ type: 'SET_PENDING_MILESTONE', payload: achievement });

            // Announce milestone to screen readers (with delay to not overlap with other announcements)
            setTimeout(() => {
                announceMilestoneReached(achievementName, state.settings.language);
            }, 500);
        } else {
            // Show the regular achievement modal
            dispatch({ type: 'SET_PENDING_ACHIEVEMENT', payload: achievement });

            // Announce achievement to screen readers (with delay to not overlap with other announcements)
            setTimeout(() => {
                announceAchievementUnlocked(achievementName, state.settings.language);
            }, 500);
        }
    };

    // Dismiss the currently displayed achievement
    const dismissAchievement = (): void => {
        dispatch({ type: 'SET_PENDING_ACHIEVEMENT', payload: null });
    };

    // Dismiss the currently displayed milestone celebration
    const dismissMilestone = (): void => {
        dispatch({ type: 'SET_PENDING_MILESTONE', payload: null });
    };

    const completeSession = async (focusMinutes: number): Promise<CompleteSessionResult> => {
        // Validate focusMinutes to prevent NaN/Infinity/negative values from corrupting stats
        if (typeof focusMinutes !== 'number' || !isFinite(focusMinutes) || focusMinutes < 0) {
            focusMinutes = 0;
        }

        // Ref-based lock prevents concurrent calls within the same render cycle.
        // React state (sessionState) is stale within a render, so two calls can both see 'active'.
        // The ref updates immediately and is shared across all closures.
        if (isCompletingRef.current) {
            console.warn('[completeSession] Already completing, ignoring concurrent call.');
            // A prior call already dispatched COMPLETE_SESSION, so currentAnimal is set
            return { animal: state.currentAnimal as Animal, updatedStats: state.stats };
        }

        // Guard against calling when not active (e.g., session already completed/failed)
        if (state.sessionState !== 'active') {
            console.warn('[completeSession] Called when session not active, ignoring. Current state:', state.sessionState);
            // currentAnimal is only set when sessionState is 'completed' (from a prior call).
            // For 'idle'/'failed' states, generate a fallback to prevent null crash in caller.
            const fallbackAnimal = state.currentAnimal ?? getRandomAnimal();
            return { animal: fallbackAnimal, updatedStats: state.stats };
        }

        isCompletingRef.current = true;

        const animal = getRandomAnimal();
        const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // Capture previous state for potential rollback.
        // This is safe because isCompletingRef prevents any parallel completeSession calls
        // from dispatching between our COMPLETE_SESSION and the async storage operations.
        // The only dispatches that could interleave are from other actions (e.g., settings),
        // but those don't affect collection/stats/dailyProgress, so rollback stays consistent.
        const previousCollection = [...state.collection];
        const previousStats = { ...state.stats };
        const previousDailyProgress = { ...state.dailyProgress };

        // Update UI state immediately for responsive UX
        dispatch({ type: 'COMPLETE_SESSION', payload: { animal, focusMinutes } });

        try {
            // Persist to storage with error handling
            const updatedCollection = await addToCollection(animal, sessionId);
            dispatch({ type: 'ADD_TO_COLLECTION', payload: updatedCollection[updatedCollection.length - 1] });

            const updatedStats = await incrementSession(true, focusMinutes);
            dispatch({ type: 'UPDATE_STATS', payload: updatedStats });

            // TODO: midnight reset handled in storage.incrementDailyProgress — if the current
            // date differs from state.dailyProgress.date, storage resets the count before incrementing.
            const updatedDailyProgress = await incrementDailyProgress(state.settings.dailyGoal);
            dispatch({ type: 'UPDATE_DAILY_PROGRESS', payload: updatedDailyProgress });

            // Announce session completion to screen readers
            const animalName = getAnimalName(animal.id, state.settings.language);
            announceSessionComplete(animalName, animal.rarity, state.settings.language);

            // Announce streak update if applicable
            if (updatedStats.currentStreak > 0) {
                const isBestStreak = updatedStats.currentStreak > state.stats.bestStreak;
                // Small delay to let the session complete announcement finish
                setTimeout(() => {
                    announceStreakUpdate(updatedStats.currentStreak, isBestStreak, state.settings.language);
                }, 1500);
            }

            // Announce daily goal completion if achieved
            if (updatedDailyProgress.goalAchieved && !state.dailyProgress.goalAchieved) {
                setTimeout(() => {
                    announceDailyGoalComplete(updatedDailyProgress.completedSessions, state.settings.language);
                }, 3000);
            }

            // Check and award streak freeze based on streak milestone (non-critical, don't fail session)
            try {
                await checkAndAwardFreeze(updatedStats.currentStreak);
            } catch (freezeError) {
                console.warn('[completeSession] Failed to check/award streak freeze:', freezeError);
                // Continue - streak freeze is a bonus feature, shouldn't fail the session
            }

            // Check for achievements (non-critical)
            try {
                await checkAndTriggerAchievements(
                    updatedStats,
                    updatedCollection,
                    animal,
                    state.unlockedAchievements
                );
            } catch (achievementError) {
                console.warn('[completeSession] Failed to check achievements:', achievementError);
            }

            return { animal, updatedStats };
        } catch (error) {
            // Wrap catch body in its own try-catch to guarantee the finally block
            // executes even if rollback dispatches or logging throw unexpectedly
            try {
                // Log error for debugging
                console.error('[completeSession] Failed to persist session data:', error);

                // Rollback all state to maintain consistency including sessionState,
                // so the user can retry or the session isn't stuck in 'completed' without persisted data
                dispatch({ type: 'SET_COLLECTION', payload: previousCollection });
                dispatch({ type: 'UPDATE_STATS', payload: previousStats });
                dispatch({ type: 'UPDATE_DAILY_PROGRESS', payload: previousDailyProgress });
                // Transition sessionState from 'completed' to 'failed' so it doesn't get stuck
                dispatch({ type: 'FAIL_SESSION', payload: { focusMinutes: 0 } });

                // Still return the animal so the user sees a reward for completing their session
                // This provides graceful degradation - user experience continues even if storage fails
                // The animal just won't be persisted to their permanent collection
                console.warn('[completeSession] Session completed but storage failed. State rolled back to failed.');
            } catch (rollbackError) {
                console.error('[completeSession] Rollback also failed:', rollbackError);
            }

            return { animal, updatedStats: previousStats };
        } finally {
            isCompletingRef.current = false;
        }
    };

    const failSession = async (focusMinutes: number): Promise<void> => {
        // Ref-based lock prevents concurrent failSession calls (same pattern as completeSession)
        if (isFailingRef.current) {
            console.warn('[failSession] Already failing, ignoring concurrent call.');
            return;
        }

        // Guard against calling failSession when not in active state
        if (state.sessionState !== 'active') {
            console.warn('[failSession] Called when session not active, ignoring. Current state:', state.sessionState);
            return;
        }

        isFailingRef.current = true;

        try {
            dispatch({ type: 'FAIL_SESSION', payload: { focusMinutes } });

            try {
                const updatedStats = await incrementSession(false, focusMinutes);
                dispatch({ type: 'UPDATE_STATS', payload: updatedStats });
            } catch (error) {
                console.error('[failSession] Failed to persist stats:', error);
                // Stats update failed but session state is already set to failed
                // This is acceptable - the UI state is correct even if persistence failed
            }

            // Announce session failure to screen readers
            announceSessionFailed(state.settings.language);
        } finally {
            isFailingRef.current = false;
        }
    };

    const resetSession = () => {
        dispatch({ type: 'RESET_SESSION' });
    };

    // Note: optimistic update may cause brief flicker on error rollback.
    // This is a known limitation — the alternative (waiting for persistence before updating UI)
    // would make settings feel sluggish. The flicker only occurs on storage failures.
    const updateUserSettings = async (newSettings: Partial<Settings>) => {
        const previousSettings = { ...state.settings };
        dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
        try {
            await updateSettings(newSettings);
        } catch (error) {
            console.error('[updateUserSettings] Failed to persist settings, rolling back:', error);
            // Rollback to previous settings so UI stays in sync with storage.
            // This rollback dispatch reverses the optimistic update above,
            // which may cause a brief flicker but ensures UI/storage consistency.
            dispatch({ type: 'UPDATE_SETTINGS', payload: previousSettings });
        }
    };

    const toggleFavorite = async (animalId: string) => {
        // Optimistic update for responsive UI
        const previousFavorites = [...state.favorites];
        const optimisticFavorites = previousFavorites.includes(animalId)
            ? previousFavorites.filter(id => id !== animalId)
            : [...previousFavorites, animalId];
        dispatch({ type: 'TOGGLE_FAVORITE', payload: optimisticFavorites });

        // Persist — toggleFavoriteStorage returns old favorites on error
        const actualFavorites = await toggleFavoriteStorage(animalId);
        // Sync state if storage result differs from optimistic (i.e., storage failed)
        // Use Set-based comparison to avoid O(n^2) every/includes pattern
        const actualSet = new Set(actualFavorites);
        const optimisticSet = new Set(optimisticFavorites);
        const needsRollback = actualSet.size !== optimisticSet.size ||
            [...actualSet].some(id => !optimisticSet.has(id));
        if (needsRollback) {
            dispatch({ type: 'TOGGLE_FAVORITE', payload: actualFavorites });
        }
    };

    const setGestureHintsSeen = async () => {
        dispatch({ type: 'SET_GESTURE_HINTS_SEEN' });
        await updateSettings({ hasSeenGestureHints: true });
    };

    const setOnboardingComplete = async () => {
        dispatch({ type: 'SET_ONBOARDING_COMPLETE' });
        await updateSettings({ hasCompletedOnboarding: true });
    };

    const clearRestoredSession = async () => {
        dispatch({ type: 'CLEAR_RESTORED_SESSION' });
        try {
            await clearActiveSession();
        } catch (error) {
            console.error('[clearRestoredSession] Failed to clear active session from storage:', error);
            // Non-critical - UI state is cleared even if storage clear failed
        }
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

    const playWithAnimal = async (animalId: string): Promise<PlayResult> => {
        const result = await playWithAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('play');
        }
        return result;
    };

    const trainAnimal = async (animalId: string): Promise<TrainResult> => {
        const result = await trainAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('train');
        }
        return result;
    };

    const groomAnimal = async (animalId: string): Promise<GroomResult> => {
        const result = await groomAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('groom');
        }
        return result;
    };

    const talkToAnimal = async (animalId: string): Promise<TalkResult> => {
        const result = await talkToAnimalStorage(animalId);
        if (result.success) {
            audioManager.playSound('talk');
        }
        return result;
    };

    const getPetCooldown = (interaction: AnimalInteraction): number => {
        return getPetCooldownRemaining(interaction);
    };

    const getFeedCooldown = (interaction: AnimalInteraction): number => {
        return getFeedCooldownRemaining(interaction);
    };

    const getPlayCooldown = (interaction: AnimalInteraction): number => {
        return getPlayCooldownRemaining(interaction);
    };

    const getTrainCooldown = (interaction: AnimalInteraction): number => {
        return getTrainCooldownRemaining(interaction);
    };

    const getGroomCooldown = (interaction: AnimalInteraction): number => {
        return getGroomCooldownRemaining(interaction);
    };

    const getTalkCooldown = (interaction: AnimalInteraction): number => {
        return getTalkCooldownRemaining(interaction);
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
                playWithAnimal,
                trainAnimal,
                groomAnimal,
                talkToAnimal,
                getPetCooldown,
                getFeedCooldown,
                getPlayCooldown,
                getTrainCooldown,
                getGroomCooldown,
                getTalkCooldown,
                getHappinessLevel,
                // Session restore functions
                clearRestoredSession,
                // Achievement functions
                dismissAchievement,
                // Milestone celebration functions
                dismissMilestone,
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
