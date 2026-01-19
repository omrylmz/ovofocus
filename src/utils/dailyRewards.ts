import AsyncStorage from '@react-native-async-storage/async-storage';
import { addFreezeDirectly } from './streakFreeze';

const STORAGE_KEYS = {
    DAILY_REWARDS: '@ovofocus/daily_rewards',
};

export type RewardType = 'encouragement' | 'streak_freeze' | 'special_celebration';

export interface DailyReward {
    day: number; // 1-7
    type: RewardType;
    icon: string;
    claimed: boolean;
}

export interface DailyRewardsState {
    lastLoginDate: string | null; // YYYY-MM-DD format
    consecutiveLoginDays: number; // Current login streak (1-7, resets after 7)
    todayRewardClaimed: boolean;
    totalLoginDays: number; // Total lifetime login days
}

// 7-day reward cycle definition
export const REWARD_CYCLE: Omit<DailyReward, 'claimed'>[] = [
    { day: 1, type: 'encouragement', icon: '🌟' },
    { day: 2, type: 'encouragement', icon: '💪' },
    { day: 3, type: 'streak_freeze', icon: '🛡️' },
    { day: 4, type: 'encouragement', icon: '🔥' },
    { day: 5, type: 'encouragement', icon: '✨' },
    { day: 6, type: 'encouragement', icon: '🎯' },
    { day: 7, type: 'special_celebration', icon: '🏆' },
];

const defaultState: DailyRewardsState = {
    lastLoginDate: null,
    consecutiveLoginDays: 0,
    todayRewardClaimed: false,
    totalLoginDays: 0,
};

// Get today's date as YYYY-MM-DD string in local timezone
function getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Parse a YYYY-MM-DD string to Date at midnight local time
function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Check if a date string is yesterday in local timezone
function isYesterday(dateStr: string): boolean {
    const date = parseLocalDate(dateStr);
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === yesterday.getTime();
}

// Check if a date string is today in local timezone
function isToday(dateStr: string): boolean {
    return dateStr === getTodayString();
}

// Get the current daily rewards state
export async function getDailyRewardsState(): Promise<DailyRewardsState> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_REWARDS);
        if (data) {
            return { ...defaultState, ...JSON.parse(data) };
        }
        return defaultState;
    } catch (error) {
        console.error('[DailyRewards] Failed to read state:', error);
        return defaultState;
    }
}

// Save daily rewards state
async function saveDailyRewardsState(state: DailyRewardsState): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_REWARDS, JSON.stringify(state));
    } catch (error) {
        console.error('[DailyRewards] Failed to save state:', error);
    }
}

// Check if user should see the daily reward modal
// Returns the reward info if reward is available, null otherwise
export async function checkDailyReward(): Promise<{
    isNewDay: boolean;
    currentDay: number;
    reward: Omit<DailyReward, 'claimed'>;
    isStreakContinued: boolean;
} | null> {
    const state = await getDailyRewardsState();
    const today = getTodayString();

    // If already claimed today, no reward available
    if (state.lastLoginDate && isToday(state.lastLoginDate) && state.todayRewardClaimed) {
        return null;
    }

    // If it's still the same day and not claimed, show reward
    if (state.lastLoginDate && isToday(state.lastLoginDate) && !state.todayRewardClaimed) {
        const currentDay = state.consecutiveLoginDays;
        const reward = REWARD_CYCLE[currentDay - 1] || REWARD_CYCLE[0];
        return {
            isNewDay: false,
            currentDay,
            reward,
            isStreakContinued: true,
        };
    }

    // Calculate new streak
    let newConsecutiveDays: number;
    let isStreakContinued: boolean;

    if (state.lastLoginDate && isYesterday(state.lastLoginDate)) {
        // Streak continues - increment day (wrap from 7 back to 1)
        newConsecutiveDays = (state.consecutiveLoginDays % 7) + 1;
        isStreakContinued = true;
    } else if (!state.lastLoginDate) {
        // First ever login
        newConsecutiveDays = 1;
        isStreakContinued = false;
    } else {
        // Streak broken - reset to day 1
        newConsecutiveDays = 1;
        isStreakContinued = false;
    }

    const reward = REWARD_CYCLE[newConsecutiveDays - 1];

    return {
        isNewDay: true,
        currentDay: newConsecutiveDays,
        reward,
        isStreakContinued,
    };
}

// Claim the daily reward and update state
export async function claimDailyReward(): Promise<DailyRewardsState> {
    const state = await getDailyRewardsState();
    const today = getTodayString();

    // Check if already claimed today
    if (state.lastLoginDate && isToday(state.lastLoginDate) && state.todayRewardClaimed) {
        return state;
    }

    // Calculate new streak
    let newConsecutiveDays: number;

    if (state.lastLoginDate && isToday(state.lastLoginDate)) {
        // Same day, not yet claimed - keep current streak
        newConsecutiveDays = state.consecutiveLoginDays;
    } else if (state.lastLoginDate && isYesterday(state.lastLoginDate)) {
        // Streak continues
        newConsecutiveDays = (state.consecutiveLoginDays % 7) + 1;
    } else {
        // New streak or first login
        newConsecutiveDays = 1;
    }

    const newState: DailyRewardsState = {
        lastLoginDate: today,
        consecutiveLoginDays: newConsecutiveDays,
        todayRewardClaimed: true,
        totalLoginDays: state.totalLoginDays + (state.lastLoginDate === today ? 0 : 1),
    };

    // Award streak freeze if this is Day 3 reward
    const reward = REWARD_CYCLE[newConsecutiveDays - 1];
    if (reward && reward.type === 'streak_freeze') {
        await addFreezeDirectly();
    }

    await saveDailyRewardsState(newState);
    return newState;
}

// Get current reward for display (without claiming)
export function getCurrentDayReward(day: number): Omit<DailyReward, 'claimed'> {
    return REWARD_CYCLE[(day - 1) % 7] || REWARD_CYCLE[0];
}

// Reset daily rewards (for testing/debug)
export async function resetDailyRewards(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_REWARDS);
    } catch (error) {
        console.error('[DailyRewards] Failed to reset:', error);
    }
}
