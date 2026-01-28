import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animal } from '../data/animals';
import { UnlockedAchievement } from '../data/achievements';
import { Language, getDeviceLanguage } from '../i18n/translations';
import { ReducedMotionPreference } from '../hooks/useReducedMotion';
import { ThemeMode } from '../styles/theme';

// Result type for storage operations - allows callers to distinguish success from failure
export type StorageResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; fallback: T };

export const STORAGE_KEYS = {
    COLLECTION: '@ovofocus/collection',
    STATS: '@ovofocus/stats',
    SETTINGS: '@ovofocus/settings',
    FAVORITES: '@ovofocus/favorites',
    DAILY_PROGRESS: '@ovofocus/daily_progress',
    SHIELD_INVENTORY: '@ovofocus/shield_inventory',
    ANIMAL_INTERACTIONS: '@ovofocus/animal_interactions',
    STREAK_FREEZE: '@ovofocus/streak_freeze',
    ACTIVE_SESSION: '@ovofocus/active_session',
    ACHIEVEMENTS: '@ovofocus/achievements',
};

export interface CollectedAnimal extends Animal {
    collectedAt: string;
    sessionId: string;
    notes?: string;
}

export interface Stats {
    totalSessions: number;
    completedSessions: number;
    failedSessions: number;
    totalFocusMinutes: number;
    currentStreak: number;
    bestStreak: number;
    lastSessionDate: string | null;
}

export interface Settings {
    focusDuration: number; // in minutes
    toleranceSeconds: number; // grace period for backgrounding
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    notificationsEnabled: boolean;
    language: Language;
    debugMode: boolean; // for testing with shorter duration
    hasSeenGestureHints: boolean;
    lastGestureHintSession: number; // Session number when hints were last shown
    gestureHintIntervalSessions: number; // Show hints every N sessions (0 = only first time)
    maxPausesPerSession: number;
    hasCompletedOnboarding: boolean;
    dailyGoal: number; // number of sessions per day
    emergencyPauseDuration: number; // extended pause duration in seconds
    reducedMotion: ReducedMotionPreference; // accessibility: reduce animations
    themeMode: ThemeMode; // light, dark, or system
    // Ambient sound settings
    ambientSoundEnabled: boolean; // whether to play ambient sounds during sessions
    selectedAmbientSound: string; // 'rain' | 'forest' | 'ocean' | 'white_noise' | 'cafe'
    ambientSoundVolume: number; // volume level 0-100
    // Pomodoro settings
    pomodoroEnabled: boolean; // whether to use Pomodoro technique with work/break cycles
    pomodoroWorkDuration: number; // work session duration in minutes (default: 25)
    pomodoroBreakDuration: number; // short break duration in minutes (default: 5)
    pomodoroLongBreakDuration: number; // long break duration in minutes (default: 15)
    sessionsBeforeLongBreak: number; // number of work sessions before long break (default: 4)
    // Egg customization
    selectedEggStyle: string; // ID of the selected egg style (default: 'classic')
}

export interface DailyProgress {
    date: string; // YYYY-MM-DD
    completedSessions: number;
    goalAchieved: boolean;
}

// Active Session persistence for app kill recovery
export interface PersistedSession {
    startTime: string;           // ISO timestamp when session started
    duration: number;            // Total session duration in seconds
    pauseCount: number;          // Number of pauses used
    isPaused: boolean;           // Whether session is currently paused
    pausedAt: string | null;     // ISO timestamp when paused (if isPaused is true)
    accumulatedPauseTime: number; // Total time spent paused in milliseconds
    focusDuration: number;       // Focus duration setting in minutes (for stats)
}

// Discriminated union for session restore results
export type SessionRestoreResult =
    | { status: 'restored'; session: PersistedSession; remainingTime: number }
    | { status: 'expired'; focusMinutes: number }
    | { status: 'none' }
    | { status: 'error'; error: string };

export interface ShieldItem {
    animalId: string;
    animalName: string;
    rarity: string;
    durationSeconds: number;
}

export interface AnimalInteraction {
    animalId: string;
    happiness: number;        // 0-100
    lastPetTime: string | null;
    lastFeedTime: string | null;
    lastPlayTime: string | null;
    lastTrainTime: string | null;
    lastGroomTime: string | null;
    lastTalkTime: string | null;
    petCount: number;
    feedCount: number;
    playCount: number;
    trainCount: number;
    groomCount: number;
    talkCount: number;
}

const defaultStats: Stats = {
    totalSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: null,
};

const defaultSettings: Settings = {
    focusDuration: 25,
    toleranceSeconds: 20,
    soundEnabled: true,
    hapticsEnabled: true,
    notificationsEnabled: true,
    language: getDeviceLanguage(),
    debugMode: false,
    hasSeenGestureHints: false,
    lastGestureHintSession: 0,
    gestureHintIntervalSessions: 5, // Show hints every 5 sessions by default
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
};

// Collection
export async function getCollection(): Promise<CollectedAnimal[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTION);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[Storage] Failed to read collection:', error);
        return [];
    }
}

// Safe version that reports success/failure - use this when error handling matters
export async function getCollectionSafe(): Promise<StorageResult<CollectedAnimal[]>> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTION);
        return { success: true, data: data ? JSON.parse(data) : [] };
    } catch (error) {
        console.error('[Storage] Failed to read collection:', error);
        return {
            success: false,
            error: `Failed to load collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: [],
        };
    }
}

export async function addToCollection(animal: Animal, sessionId: string): Promise<CollectedAnimal[]> {
    const collection = await getCollection();
    const newAnimal: CollectedAnimal = {
        ...animal,
        collectedAt: new Date().toISOString(),
        sessionId,
    };
    collection.push(newAnimal);

    try {
        await AsyncStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
        return collection;
    } catch (error) {
        console.error('[Storage] Failed to add to collection:', error);
        // Re-throw so caller can handle the failure (e.g., show retry option, rollback UI)
        throw new Error(`Failed to save animal to collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function clearCollection(): Promise<boolean> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.COLLECTION);
        return true;
    } catch (error) {
        console.error('[Storage] Failed to clear collection:', error);
        return false;
    }
}

// Update notes for the most recently collected animal
// Returns true on success, false on failure or if collection is empty
export async function updateLastAnimalNotes(notes: string): Promise<boolean> {
    try {
        const collection = await getCollection();
        if (collection.length === 0) {
            console.warn('[Storage] Cannot update notes: collection is empty');
            return false;
        }
        const lastAnimal = collection[collection.length - 1];
        lastAnimal.notes = notes.trim();
        await AsyncStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
        return true;
    } catch (error) {
        console.error("[Storage] Failed to update animal notes:", error);
        return false;
    }
}

// Stats
export async function getStats(): Promise<Stats> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
        return data ? { ...defaultStats, ...JSON.parse(data) } : defaultStats;
    } catch (error) {
        console.error('[Storage] Failed to read stats:', error);
        return defaultStats;
    }
}

// Safe version that reports success/failure
export async function getStatsSafe(): Promise<StorageResult<Stats>> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
        return { success: true, data: data ? { ...defaultStats, ...JSON.parse(data) } : defaultStats };
    } catch (error) {
        console.error('[Storage] Failed to read stats:', error);
        return {
            success: false,
            error: `Failed to load stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: defaultStats,
        };
    }
}

export async function updateStats(updates: Partial<Stats>): Promise<Stats> {
    try {
        const current = await getStats();
        const updated = { ...current, ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('[Storage] Failed to update stats:', error);
        return await getStats();
    }
}

export async function incrementSession(completed: boolean, focusMinutes: number): Promise<Stats> {
    try {
        const stats = await getStats();
        const today = new Date().toISOString().split('T')[0];
        const lastDate = stats.lastSessionDate?.split('T')[0];

        // Check if streak continues
        // Note: Failed sessions should NOT break streaks. Streaks only break when
        // an entire calendar day passes without any completed sessions.
        let newStreak = stats.currentStreak;
        if (completed) {
            if (lastDate === today) {
                // Same day, keep streak
            } else if (lastDate && isYesterday(lastDate)) {
                // Previous day, increment streak
                newStreak = stats.currentStreak + 1;
            } else if (!lastDate || isMoreThanOneDayAgo(lastDate)) {
                // No previous session OR more than one day has passed - start fresh
                newStreak = 1;
            }
        }
        // Note: We intentionally do NOT reset streak on failed sessions.
        // Streak only resets when a new day starts AND no completed session exists from yesterday.

        const updated: Stats = {
            totalSessions: stats.totalSessions + 1,
            completedSessions: stats.completedSessions + (completed ? 1 : 0),
            failedSessions: stats.failedSessions + (completed ? 0 : 1),
            totalFocusMinutes: stats.totalFocusMinutes + focusMinutes,
            currentStreak: newStreak,
            bestStreak: Math.max(stats.bestStreak, newStreak),
            lastSessionDate: new Date().toISOString(),
        };

        await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('[Storage] Failed to increment session:', error);
        return await getStats();
    }
}

// Helper to get local date string (YYYY-MM-DD) without timezone issues
function getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isYesterday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Use local date strings to avoid timezone issues near midnight
    return getLocalDateString(date) === getLocalDateString(yesterday);
}

function isMoreThanOneDayAgo(dateStr: string): boolean {
    const date = new Date(dateStr);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    // Use local date strings to avoid timezone issues near midnight
    // If the date is on or before two days ago, it's more than one day ago
    return getLocalDateString(date) <= getLocalDateString(twoDaysAgo);
}

// Valid theme mode values
const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

// Helper to validate themeMode value
function isValidThemeMode(value: unknown): value is ThemeMode {
    return typeof value === 'string' && VALID_THEME_MODES.includes(value as ThemeMode);
}

// Settings
export async function getSettings(): Promise<Settings> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!data) {
            return defaultSettings;
        }

        const parsed = JSON.parse(data);
        const settings = { ...defaultSettings, ...parsed };

        // Validate themeMode - reset to default if invalid
        if (!isValidThemeMode(settings.themeMode)) {
            console.warn(`[Storage] Invalid themeMode "${settings.themeMode}", resetting to default`);
            settings.themeMode = defaultSettings.themeMode;
        }

        return settings;
    } catch (error) {
        console.error('[Storage] Failed to read settings:', error);
        return defaultSettings;
    }
}

// Safe version that reports success/failure
export async function getSettingsSafe(): Promise<StorageResult<Settings>> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!data) {
            return { success: true, data: defaultSettings };
        }

        const parsed = JSON.parse(data);
        const settings = { ...defaultSettings, ...parsed };

        // Validate themeMode - reset to default if invalid
        if (!isValidThemeMode(settings.themeMode)) {
            console.warn(`[Storage] Invalid themeMode "${settings.themeMode}", resetting to default`);
            settings.themeMode = defaultSettings.themeMode;
        }

        return { success: true, data: settings };
    } catch (error) {
        console.error('[Storage] Failed to read settings:', error);
        return {
            success: false,
            error: `Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallback: defaultSettings,
        };
    }
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
    try {
        // Validate settings values to prevent invalid data
        if (updates.focusDuration !== undefined) {
            updates.focusDuration = Math.max(1, Math.min(120, updates.focusDuration));
        }
        if (updates.dailyGoal !== undefined) {
            updates.dailyGoal = Math.max(1, Math.min(20, updates.dailyGoal));
        }
        if (updates.toleranceSeconds !== undefined) {
            updates.toleranceSeconds = Math.max(0, Math.min(300, updates.toleranceSeconds));
        }
        if (updates.emergencyPauseDuration !== undefined) {
            updates.emergencyPauseDuration = Math.max(10, Math.min(300, updates.emergencyPauseDuration));
        }
        if (updates.maxPausesPerSession !== undefined) {
            updates.maxPausesPerSession = Math.max(0, Math.min(10, updates.maxPausesPerSession));
        }
        if (updates.ambientSoundVolume !== undefined) {
            updates.ambientSoundVolume = Math.max(0, Math.min(100, updates.ambientSoundVolume));
        }
        // Validate Pomodoro settings
        if (updates.pomodoroWorkDuration !== undefined) {
            updates.pomodoroWorkDuration = Math.max(1, Math.min(60, updates.pomodoroWorkDuration));
        }
        if (updates.pomodoroBreakDuration !== undefined) {
            updates.pomodoroBreakDuration = Math.max(1, Math.min(30, updates.pomodoroBreakDuration));
        }
        if (updates.pomodoroLongBreakDuration !== undefined) {
            updates.pomodoroLongBreakDuration = Math.max(1, Math.min(60, updates.pomodoroLongBreakDuration));
        }
        if (updates.sessionsBeforeLongBreak !== undefined) {
            updates.sessionsBeforeLongBreak = Math.max(2, Math.min(10, updates.sessionsBeforeLongBreak));
        }

        const current = await getSettings();
        const updated = { ...current, ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('[Storage] Failed to update settings:', error);
        return await getSettings();
    }
}

// Favorites
export async function getFavorites(): Promise<string[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[Storage] Failed to read favorites:', error);
        return [];
    }
}

export async function setFavorites(favoriteIds: string[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoriteIds));
        return true;
    } catch (error) {
        console.error('[Storage] Failed to save favorites:', error);
        return false;
    }
}

export async function toggleFavorite(animalId: string): Promise<string[]> {
    try {
        const favorites = await getFavorites();
        const index = favorites.indexOf(animalId);
        if (index === -1) {
            favorites.push(animalId);
        } else {
            favorites.splice(index, 1);
        }
        await setFavorites(favorites);
        return favorites;
    } catch (error) {
        console.error('[Storage] Failed to toggle favorite:', error);
        return await getFavorites();
    }
}

// Daily Progress
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

export async function getDailyProgress(): Promise<DailyProgress> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_PROGRESS);
        if (data) {
            const progress: DailyProgress = JSON.parse(data);
            // Check if it's still today
            if (progress.date === getTodayString()) {
                return progress;
            }
        }
        // Return fresh progress for today
        return {
            date: getTodayString(),
            completedSessions: 0,
            goalAchieved: false,
        };
    } catch (error) {
        console.error('[Storage] Failed to read daily progress:', error);
        return {
            date: getTodayString(),
            completedSessions: 0,
            goalAchieved: false,
        };
    }
}

export async function incrementDailyProgress(dailyGoal: number): Promise<DailyProgress> {
    try {
        const progress = await getDailyProgress();
        const updated: DailyProgress = {
            date: getTodayString(),
            completedSessions: progress.completedSessions + 1,
            goalAchieved: progress.completedSessions + 1 >= dailyGoal,
        };
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('[Storage] Failed to increment daily progress:', error);
        return await getDailyProgress();
    }
}

// Shield Inventory
export async function getShieldInventory(): Promise<ShieldItem[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SHIELD_INVENTORY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[Storage] Failed to read shield inventory:', error);
        return [];
    }
}

export async function addShield(shield: ShieldItem): Promise<ShieldItem[]> {
    try {
        const inventory = await getShieldInventory();
        // Check if we already have a shield from this animal
        const existingIndex = inventory.findIndex(s => s.animalId === shield.animalId);
        if (existingIndex === -1) {
            inventory.push(shield);
        }
        await AsyncStorage.setItem(STORAGE_KEYS.SHIELD_INVENTORY, JSON.stringify(inventory));
        return inventory;
    } catch (error) {
        console.error('[Storage] Failed to add shield:', error);
        return await getShieldInventory();
    }
}

// Result type for useShield - distinguishes "not found" from "error"
export type UseShieldResult =
    | { status: 'used'; shield: ShieldItem }
    | { status: 'not_found' }
    | { status: 'error'; error: string };

export async function useShield(animalId: string): Promise<UseShieldResult> {
    try {
        const inventory = await getShieldInventory();
        const shieldIndex = inventory.findIndex(s => s.animalId === animalId);
        if (shieldIndex === -1) {
            return { status: 'not_found' };
        }

        const shield = inventory[shieldIndex];
        inventory.splice(shieldIndex, 1);
        await AsyncStorage.setItem(STORAGE_KEYS.SHIELD_INVENTORY, JSON.stringify(inventory));
        return { status: 'used', shield };
    } catch (error) {
        console.error('[Storage] Failed to use shield:', error);
        return {
            status: 'error',
            error: `Failed to use shield: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

export async function grantShieldFromAnimal(animalId: string, animalName: string, rarity: string): Promise<ShieldItem[]> {
    try {
        const durationMap: Record<string, number> = {
            legendary: 60,
            epic: 30,
            rare: 20,
            common: 10,
        };
        const shield: ShieldItem = {
            animalId,
            animalName,
            rarity,
            durationSeconds: durationMap[rarity] || 10,
        };
        return addShield(shield);
    } catch (error) {
        console.error('[Storage] Failed to grant shield from animal:', error);
        return await getShieldInventory();
    }
}

// Animal Interactions
const INTERACTION_CONSTANTS = {
    PET_COOLDOWN_HOURS: 4,
    FEED_COOLDOWN_HOURS: 8,
    PLAY_COOLDOWN_HOURS: 2,
    TRAIN_COOLDOWN_HOURS: 12,
    GROOM_COOLDOWN_HOURS: 6,
    TALK_COOLDOWN_HOURS: 1,
    PET_HAPPINESS_BONUS: 10,
    FEED_HAPPINESS_BONUS: 15,
    PLAY_HAPPINESS_BONUS: 12,
    TRAIN_HAPPINESS_BONUS: 8,
    GROOM_HAPPINESS_BONUS: 10,
    TALK_HAPPINESS_BONUS: 5,
    DAILY_DECAY: 5,
    MAX_HAPPINESS: 100,
    MIN_HAPPINESS: 0,
};

function getDefaultInteraction(animalId: string): AnimalInteraction {
    return {
        animalId,
        happiness: 50, // Start at neutral happiness
        lastPetTime: null,
        lastFeedTime: null,
        lastPlayTime: null,
        lastTrainTime: null,
        lastGroomTime: null,
        lastTalkTime: null,
        petCount: 0,
        feedCount: 0,
        playCount: 0,
        trainCount: 0,
        groomCount: 0,
        talkCount: 0,
    };
}

function calculateHappinessDecay(interaction: AnimalInteraction): number {
    // Get the most recent interaction time from all interaction types
    const times = [
        interaction.lastPetTime,
        interaction.lastFeedTime,
        interaction.lastPlayTime,
        interaction.lastTrainTime,
        interaction.lastGroomTime,
        interaction.lastTalkTime,
    ]
        .filter(Boolean)
        .map(t => new Date(t!).getTime());

    if (times.length === 0) return interaction.happiness;

    const lastTime = Math.max(...times);
    const now = Date.now();
    const daysSinceInteraction = Math.floor((now - lastTime) / (1000 * 60 * 60 * 24));

    if (daysSinceInteraction <= 0) return interaction.happiness;

    const decay = daysSinceInteraction * INTERACTION_CONSTANTS.DAILY_DECAY;
    return Math.max(INTERACTION_CONSTANTS.MIN_HAPPINESS, interaction.happiness - decay);
}

function getCooldownRemaining(lastTime: string | null, cooldownHours: number): number {
    if (!lastTime) return 0;
    const lastTimeMs = new Date(lastTime).getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const remaining = cooldownMs - (Date.now() - lastTimeMs);
    return Math.max(0, remaining);
}

export async function getAllInteractions(): Promise<AnimalInteraction[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ANIMAL_INTERACTIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[Storage] Failed to read animal interactions:', error);
        return [];
    }
}

export async function getAnimalInteraction(animalId: string): Promise<AnimalInteraction> {
    const interactions = await getAllInteractions();
    const existing = interactions.find(i => i.animalId === animalId);

    if (existing) {
        // Apply happiness decay
        const decayedHappiness = calculateHappinessDecay(existing);
        return { ...existing, happiness: decayedHappiness };
    }

    return getDefaultInteraction(animalId);
}

export async function updateAnimalInteraction(interaction: AnimalInteraction): Promise<AnimalInteraction[]> {
    try {
        const interactions = await getAllInteractions();
        const existingIndex = interactions.findIndex(i => i.animalId === interaction.animalId);

        if (existingIndex >= 0) {
            interactions[existingIndex] = interaction;
        } else {
            interactions.push(interaction);
        }

        await AsyncStorage.setItem(STORAGE_KEYS.ANIMAL_INTERACTIONS, JSON.stringify(interactions));
        return interactions;
    } catch (error) {
        console.error('[Storage] Failed to update animal interaction:', error);
        return await getAllInteractions();
    }
}

export interface PetResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number; // ms until next pet allowed
}

export async function petAnimal(animalId: string): Promise<PetResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastPetTime,
        INTERACTION_CONSTANTS.PET_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.PET_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastPetTime: new Date().toISOString(),
        petCount: interaction.petCount + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export interface FeedResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number; // ms until next feed allowed
}

export async function feedAnimal(animalId: string): Promise<FeedResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastFeedTime,
        INTERACTION_CONSTANTS.FEED_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.FEED_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastFeedTime: new Date().toISOString(),
        feedCount: interaction.feedCount + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export interface PlayResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number;
}

export async function playWithAnimal(animalId: string): Promise<PlayResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastPlayTime,
        INTERACTION_CONSTANTS.PLAY_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.PLAY_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastPlayTime: new Date().toISOString(),
        playCount: (interaction.playCount || 0) + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export interface TrainResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number;
}

export async function trainAnimal(animalId: string): Promise<TrainResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastTrainTime,
        INTERACTION_CONSTANTS.TRAIN_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.TRAIN_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastTrainTime: new Date().toISOString(),
        trainCount: (interaction.trainCount || 0) + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export interface GroomResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number;
}

export async function groomAnimal(animalId: string): Promise<GroomResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastGroomTime,
        INTERACTION_CONSTANTS.GROOM_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.GROOM_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastGroomTime: new Date().toISOString(),
        groomCount: (interaction.groomCount || 0) + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export interface TalkResult {
    success: boolean;
    interaction: AnimalInteraction;
    cooldownRemaining: number;
}

export async function talkToAnimal(animalId: string): Promise<TalkResult> {
    const interaction = await getAnimalInteraction(animalId);
    const cooldownRemaining = getCooldownRemaining(
        interaction.lastTalkTime,
        INTERACTION_CONSTANTS.TALK_COOLDOWN_HOURS
    );

    if (cooldownRemaining > 0) {
        return { success: false, interaction, cooldownRemaining };
    }

    const newHappiness = Math.min(
        INTERACTION_CONSTANTS.MAX_HAPPINESS,
        interaction.happiness + INTERACTION_CONSTANTS.TALK_HAPPINESS_BONUS
    );

    const updatedInteraction: AnimalInteraction = {
        ...interaction,
        happiness: newHappiness,
        lastTalkTime: new Date().toISOString(),
        talkCount: (interaction.talkCount || 0) + 1,
    };

    await updateAnimalInteraction(updatedInteraction);
    return { success: true, interaction: updatedInteraction, cooldownRemaining: 0 };
}

export function getPetCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastPetTime, INTERACTION_CONSTANTS.PET_COOLDOWN_HOURS);
}

export function getFeedCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastFeedTime, INTERACTION_CONSTANTS.FEED_COOLDOWN_HOURS);
}

export function getPlayCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastPlayTime, INTERACTION_CONSTANTS.PLAY_COOLDOWN_HOURS);
}

export function getTrainCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastTrainTime, INTERACTION_CONSTANTS.TRAIN_COOLDOWN_HOURS);
}

export function getGroomCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastGroomTime, INTERACTION_CONSTANTS.GROOM_COOLDOWN_HOURS);
}

export function getTalkCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastTalkTime, INTERACTION_CONSTANTS.TALK_COOLDOWN_HOURS);
}

export function getHappinessLevel(happiness: number): 'sad' | 'neutral' | 'happy' | 'ecstatic' {
    if (happiness <= 30) return 'sad';
    if (happiness <= 60) return 'neutral';
    if (happiness <= 80) return 'happy';
    return 'ecstatic';
}

export { INTERACTION_CONSTANTS };

// Active Session Persistence
// Save the current session state for recovery after app kill

export async function saveActiveSession(session: PersistedSession): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
        return true;
    } catch (error) {
        console.error('[Storage] Failed to save active session:', error);
        return false;
    }
}

export async function clearActiveSession(): Promise<boolean> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
        return true;
    } catch (error) {
        console.error('[Storage] Failed to clear active session:', error);
        return false;
    }
}

export async function getActiveSession(): Promise<PersistedSession | null> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
        if (!data) return null;
        return JSON.parse(data) as PersistedSession;
    } catch (error) {
        console.error('[Storage] Failed to get active session:', error);
        return null;
    }
}

export async function restoreActiveSession(): Promise<SessionRestoreResult> {
    try {
        const session = await getActiveSession();

        if (!session) {
            return { status: 'none' };
        }

        // Validate session data
        if (!session.startTime || typeof session.duration !== 'number' || session.duration <= 0) {
            console.warn('[Storage] Invalid session data, clearing...');
            await clearActiveSession();
            return { status: 'error', error: 'Invalid session data' };
        }

        const now = Date.now();
        const startTime = new Date(session.startTime).getTime();

        // Validate timestamp
        if (isNaN(startTime) || startTime > now) {
            console.warn('[Storage] Invalid session timestamp, clearing...');
            await clearActiveSession();
            return { status: 'error', error: 'Invalid session timestamp' };
        }

        // Calculate elapsed time, accounting for pauses
        let elapsedMs: number;

        if (session.isPaused && session.pausedAt) {
            // Session was paused when app was killed
            // Elapsed time = (pausedAt - startTime) - accumulatedPauseTime
            const pausedAt = new Date(session.pausedAt).getTime();
            elapsedMs = (pausedAt - startTime) - session.accumulatedPauseTime;
        } else {
            // Session was running when app was killed
            // Elapsed time = (now - startTime) - accumulatedPauseTime
            elapsedMs = (now - startTime) - session.accumulatedPauseTime;
        }

        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const remainingTime = Math.max(0, session.duration - elapsedSeconds);

        // Check if session would have expired
        if (remainingTime <= 0) {
            // Session expired while app was killed - treat as failed
            const focusMinutes = Math.floor(session.duration / 60);
            await clearActiveSession();
            return { status: 'expired', focusMinutes };
        }

        // Session can be restored
        return {
            status: 'restored',
            session,
            remainingTime,
        };
    } catch (error) {
        console.error('[Storage] Failed to restore active session:', error);
        await clearActiveSession();
        return { status: 'error', error: String(error) };
    }
}

// Achievements
export async function getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[Storage] Failed to read achievements:', error);
        return [];
    }
}

export async function unlockAchievement(achievementId: string): Promise<UnlockedAchievement[]> {
    try {
        const achievements = await getUnlockedAchievements();
        // Check if already unlocked
        if (achievements.some(a => a.id === achievementId)) {
            return achievements;
        }
        const newAchievement: UnlockedAchievement = {
            id: achievementId,
            unlockedAt: new Date().toISOString(),
        };
        achievements.push(newAchievement);
        await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
        return achievements;
    } catch (error) {
        console.error('[Storage] Failed to unlock achievement:', error);
        return await getUnlockedAchievements();
    }
}

export async function isAchievementUnlocked(achievementId: string): Promise<boolean> {
    const achievements = await getUnlockedAchievements();
    return achievements.some(a => a.id === achievementId);
}

// Debug
export async function clearAllData(): Promise<void> {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.COLLECTION,
            STORAGE_KEYS.STATS,
            STORAGE_KEYS.SETTINGS,
            STORAGE_KEYS.FAVORITES,
            STORAGE_KEYS.DAILY_PROGRESS,
            STORAGE_KEYS.SHIELD_INVENTORY,
            STORAGE_KEYS.ANIMAL_INTERACTIONS,
            STORAGE_KEYS.STREAK_FREEZE,
            STORAGE_KEYS.ACTIVE_SESSION,
            STORAGE_KEYS.ACHIEVEMENTS,
        ]);
    } catch (error) {
        console.error('[Storage] Failed to clear all data:', error);
    }
}
