import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
export const STREAK_FREEZE_CONSTANTS = {
    MAX_FREEZES: 3,                    // Maximum freezes user can hold
    STREAK_MILESTONE_DAYS: 7,          // Earn 1 freeze every 7 days of streak
};

// Storage key
const STORAGE_KEY = '@ovofocus/streak_freeze';

// Types
export interface StreakFreezeData {
    freezeCount: number;               // Number of available freezes (0-3)
    lastFreezeUsedDate: string | null; // ISO date string when last freeze was used
    lastMilestoneStreak: number;       // Last streak value when a freeze was earned
}

const defaultStreakFreezeData: StreakFreezeData = {
    freezeCount: 0,
    lastFreezeUsedDate: null,
    lastMilestoneStreak: 0,
};

// Helper to get today's date string (YYYY-MM-DD)
function getTodayString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get the current streak freeze data from storage
 */
export async function getStreakFreezeData(): Promise<StreakFreezeData> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        return data ? { ...defaultStreakFreezeData, ...JSON.parse(data) } : defaultStreakFreezeData;
    } catch (error) {
        console.error('[StreakFreeze] Failed to read streak freeze data:', error);
        return defaultStreakFreezeData;
    }
}

/**
 * Save streak freeze data to storage
 * @returns true on success, false on failure
 */
async function saveStreakFreezeData(data: StreakFreezeData): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('[StreakFreeze] Failed to save streak freeze data:', error);
        return false;
    }
}

/**
 * Get the number of available freezes
 */
export async function getAvailableFreezes(): Promise<number> {
    const data = await getStreakFreezeData();
    return data.freezeCount;
}

/**
 * Check if a freeze was already used today
 */
export async function wasFreezeUsedToday(): Promise<boolean> {
    const data = await getStreakFreezeData();
    if (!data.lastFreezeUsedDate) return false;
    return data.lastFreezeUsedDate === getTodayString();
}

/**
 * Use a streak freeze for today
 * @returns true if freeze was successfully used, false otherwise
 */
export async function consumeStreakFreeze(): Promise<boolean> {
    const data = await getStreakFreezeData();

    // Check if user has freezes available
    if (data.freezeCount <= 0) {
        console.log('[StreakFreeze] No freezes available');
        return false;
    }

    // Check if freeze was already used today
    if (data.lastFreezeUsedDate === getTodayString()) {
        console.log('[StreakFreeze] Freeze already used today');
        return false;
    }

    // Use the freeze
    const updatedData: StreakFreezeData = {
        ...data,
        freezeCount: data.freezeCount - 1,
        lastFreezeUsedDate: getTodayString(),
    };

    await saveStreakFreezeData(updatedData);
    console.log(`[StreakFreeze] Freeze used. Remaining: ${updatedData.freezeCount}`);
    return true;
}

/**
 * Check and award freezes based on streak milestones
 * Call this after completing a session
 * @param currentStreak - The user's current streak after session completion
 * @returns The number of new freezes awarded (0 or 1)
 */
export async function checkAndAwardFreeze(currentStreak: number): Promise<number> {
    const data = await getStreakFreezeData();

    // Check if we're already at max freezes
    if (data.freezeCount >= STREAK_FREEZE_CONSTANTS.MAX_FREEZES) {
        return 0;
    }

    // Calculate the next milestone threshold
    const nextMilestone = data.lastMilestoneStreak + STREAK_FREEZE_CONSTANTS.STREAK_MILESTONE_DAYS;

    // Check if current streak has reached the next milestone
    if (currentStreak >= nextMilestone) {
        const updatedData: StreakFreezeData = {
            ...data,
            freezeCount: Math.min(data.freezeCount + 1, STREAK_FREEZE_CONSTANTS.MAX_FREEZES),
            lastMilestoneStreak: currentStreak,
        };

        await saveStreakFreezeData(updatedData);
        console.log(`[StreakFreeze] Freeze awarded! Streak: ${currentStreak}, Total freezes: ${updatedData.freezeCount}`);
        return 1;
    }

    return 0;
}

/**
 * Check if user can use a freeze right now
 * Conditions:
 * - Has at least 1 freeze
 * - Haven't used a freeze today
 * - Haven't completed a session today
 * @param hasCompletedSessionToday - Whether user has completed a session today
 */
export async function canUseFreeze(hasCompletedSessionToday: boolean): Promise<boolean> {
    if (hasCompletedSessionToday) {
        return false;
    }

    const data = await getStreakFreezeData();

    if (data.freezeCount <= 0) {
        return false;
    }

    if (data.lastFreezeUsedDate === getTodayString()) {
        return false;
    }

    return true;
}

/**
 * Reset streak freeze data (for debug/clear all data)
 */
export async function clearStreakFreezeData(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('[StreakFreeze] Failed to clear streak freeze data:', error);
    }
}

/**
 * Add a freeze directly (for testing/debug purposes)
 */
export async function addFreezeDirectly(): Promise<StreakFreezeData> {
    const data = await getStreakFreezeData();
    const updatedData: StreakFreezeData = {
        ...data,
        freezeCount: Math.min(data.freezeCount + 1, STREAK_FREEZE_CONSTANTS.MAX_FREEZES),
    };
    await saveStreakFreezeData(updatedData);
    return updatedData;
}
