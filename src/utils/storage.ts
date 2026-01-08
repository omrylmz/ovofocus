import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animal } from '../data/animals';
import { Language, getDeviceLanguage } from '../i18n/translations';

const STORAGE_KEYS = {
    COLLECTION: '@ovofocus/collection',
    STATS: '@ovofocus/stats',
    SETTINGS: '@ovofocus/settings',
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
};

// Collection
export async function getCollection(): Promise<CollectedAnimal[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTION);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
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
    await AsyncStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
}

export async function clearCollection(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.COLLECTION);
}

// Stats
export async function getStats(): Promise<Stats> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
        return data ? { ...defaultStats, ...JSON.parse(data) } : defaultStats;
    } catch {
        return defaultStats;
    }
}

export async function updateStats(updates: Partial<Stats>): Promise<Stats> {
    const current = await getStats();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
    return updated;
}

export async function incrementSession(completed: boolean, focusMinutes: number): Promise<Stats> {
    const stats = await getStats();
    const today = new Date().toISOString().split('T')[0];
    const lastDate = stats.lastSessionDate?.split('T')[0];

    // Check if streak continues
    let newStreak = stats.currentStreak;
    if (completed) {
        if (lastDate === today) {
            // Same day, keep streak
        } else if (lastDate && isYesterday(lastDate)) {
            // Previous day, increment streak
            newStreak = stats.currentStreak + 1;
        } else {
            // New streak starts
            newStreak = 1;
        }
    } else if (!completed && lastDate !== today) {
        // Failed session breaks streak if it's a new day
        newStreak = 0;
    }

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
}

function isYesterday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

// Settings
export async function getSettings(): Promise<Settings> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
}

// Debug
export async function clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
        STORAGE_KEYS.COLLECTION,
        STORAGE_KEYS.STATS,
        STORAGE_KEYS.SETTINGS,
    ]);
}
