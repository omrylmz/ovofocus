import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animal } from '../data/animals';
import { Language, getDeviceLanguage } from '../i18n/translations';
import { ReducedMotionPreference } from '../hooks/useReducedMotion';

const STORAGE_KEYS = {
    COLLECTION: '@ovofocus/collection',
    STATS: '@ovofocus/stats',
    SETTINGS: '@ovofocus/settings',
    FAVORITES: '@ovofocus/favorites',
    DAILY_PROGRESS: '@ovofocus/daily_progress',
    SHIELD_INVENTORY: '@ovofocus/shield_inventory',
    ANIMAL_INTERACTIONS: '@ovofocus/animal_interactions',
    STREAK_FREEZE: '@ovofocus/streak_freeze',
};

export interface CollectedAnimal extends Animal {
    collectedAt: string;
    sessionId: string;
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
    maxPausesPerSession: number;
    hasCompletedOnboarding: boolean;
    dailyGoal: number; // number of sessions per day
    emergencyPauseDuration: number; // extended pause duration in seconds
    reducedMotion: ReducedMotionPreference; // accessibility: reduce animations
}

export interface DailyProgress {
    date: string; // YYYY-MM-DD
    completedSessions: number;
    goalAchieved: boolean;
}

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
    petCount: number;
    feedCount: number;
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
    maxPausesPerSession: 3,
    hasCompletedOnboarding: false,
    dailyGoal: 3,
    emergencyPauseDuration: 60,
    reducedMotion: 'system',
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

export async function addToCollection(animal: Animal, sessionId: string): Promise<CollectedAnimal[]> {
    try {
        const collection = await getCollection();
        const newAnimal: CollectedAnimal = {
            ...animal,
            collectedAt: new Date().toISOString(),
            sessionId,
        };
        collection.push(newAnimal);
        await AsyncStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
        return collection;
    } catch (error) {
        console.error('[Storage] Failed to add to collection:', error);
        return await getCollection();
    }
}

export async function clearCollection(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.COLLECTION);
    } catch (error) {
        console.error('[Storage] Failed to clear collection:', error);
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

function isYesterday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

function isMoreThanOneDayAgo(dateStr: string): boolean {
    const date = new Date(dateStr);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    // If the date is on or before two days ago, it's more than one day ago
    return date.toISOString().split('T')[0] <= twoDaysAgo.toISOString().split('T')[0];
}

// Settings
export async function getSettings(): Promise<Settings> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (error) {
        console.error('[Storage] Failed to read settings:', error);
        return defaultSettings;
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

export async function setFavorites(favoriteIds: string[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoriteIds));
    } catch (error) {
        console.error('[Storage] Failed to save favorites:', error);
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

export async function useShield(animalId: string): Promise<ShieldItem | null> {
    try {
        const inventory = await getShieldInventory();
        const shieldIndex = inventory.findIndex(s => s.animalId === animalId);
        if (shieldIndex === -1) return null;

        const shield = inventory[shieldIndex];
        inventory.splice(shieldIndex, 1);
        await AsyncStorage.setItem(STORAGE_KEYS.SHIELD_INVENTORY, JSON.stringify(inventory));
        return shield;
    } catch (error) {
        console.error('[Storage] Failed to use shield:', error);
        return null;
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
    PET_HAPPINESS_BONUS: 10,
    FEED_HAPPINESS_BONUS: 15,
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
        petCount: 0,
        feedCount: 0,
    };
}

function calculateHappinessDecay(interaction: AnimalInteraction): number {
    // Get the most recent interaction time (not first truthy value)
    const times = [interaction.lastPetTime, interaction.lastFeedTime]
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

export function getPetCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastPetTime, INTERACTION_CONSTANTS.PET_COOLDOWN_HOURS);
}

export function getFeedCooldownRemaining(interaction: AnimalInteraction): number {
    return getCooldownRemaining(interaction.lastFeedTime, INTERACTION_CONSTANTS.FEED_COOLDOWN_HOURS);
}

export function getHappinessLevel(happiness: number): 'sad' | 'neutral' | 'happy' | 'ecstatic' {
    if (happiness <= 30) return 'sad';
    if (happiness <= 60) return 'neutral';
    if (happiness <= 80) return 'happy';
    return 'ecstatic';
}

export { INTERACTION_CONSTANTS };

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
        ]);
    } catch (error) {
        console.error('[Storage] Failed to clear all data:', error);
    }
}

