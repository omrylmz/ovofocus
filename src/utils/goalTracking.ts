// Goal Tracking Utility - Manages user goals for focus sessions
// Supports daily, weekly, and streak-based goals with progress tracking

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for goals
const STORAGE_KEY = '@ovofocus/goals';

// Goal types
export type GoalType = 'daily' | 'weekly' | 'streak';

// Goal interface
export interface Goal {
    id: string;
    type: GoalType;
    target: number;           // Target value (sessions for daily/weekly, days for streak)
    progress: number;         // Current progress
    createdAt: string;        // ISO date string
    completedAt: string | null; // ISO date string when goal was completed, null if not completed
    lastUpdatedAt: string;    // ISO date string of last progress update
}

// Session data used for progress calculation
export interface SessionData {
    completedAt: string;      // ISO date string when session was completed
    sessionId: string;
}

// Helper function to generate unique ID
function generateId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get today's date string (YYYY-MM-DD) in local time
function getTodayString(): string {
    const now = new Date();
    return formatDateString(now);
}

// Helper function to get date string from Date object (YYYY-MM-DD) in local time
// Uses local time to avoid timezone issues around midnight
function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get start of week (Sunday at 00:00:00)
function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper function to get end of week (Saturday at 23:59:59)
function getEndOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day));
    d.setHours(23, 59, 59, 999);
    return d;
}

// Helper function to get start of day
function getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper function to get end of day
function getEndOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
    return formatDateString(date1) === formatDateString(date2);
}

// Helper function to check if date1 is the day before date2
function isDayBefore(date1: Date, date2: Date): boolean {
    const day1 = getStartOfDay(date1);
    const day2 = getStartOfDay(date2);
    const diffTime = day2.getTime() - day1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

/**
 * Get all goals from storage
 */
export async function getAllGoals(): Promise<Goal[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('[GoalTracking] Failed to read goals:', error);
        return [];
    }
}

/**
 * Save all goals to storage
 * @returns true on success, false on failure
 */
async function saveAllGoals(goals: Goal[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
        return true;
    } catch (error) {
        console.error('[GoalTracking] Failed to save goals:', error);
        return false;
    }
}

/**
 * Create a new goal
 * @param type - The type of goal ('daily', 'weekly', or 'streak')
 * @param target - The target value (sessions for daily/weekly, days for streak)
 * @returns The newly created goal
 */
export async function createGoal(type: GoalType, target: number): Promise<Goal> {
    // Validate target
    if (target < 1) {
        throw new Error('Goal target must be at least 1');
    }

    const now = new Date().toISOString();
    const goal: Goal = {
        id: generateId(),
        type,
        target,
        progress: 0,
        createdAt: now,
        completedAt: null,
        lastUpdatedAt: now,
    };

    const goals = await getAllGoals();
    goals.push(goal);
    await saveAllGoals(goals);

    console.log(`[GoalTracking] Created ${type} goal with target ${target}`);
    return goal;
}

/**
 * Get a specific goal by ID
 * @param goalId - The ID of the goal to retrieve
 * @returns The goal or null if not found
 */
export async function getGoal(goalId: string): Promise<Goal | null> {
    const goals = await getAllGoals();
    return goals.find(g => g.id === goalId) || null;
}

/**
 * Update goal progress manually
 * @param goalId - The ID of the goal to update
 * @param progress - The new progress value
 * @returns The updated goal or null if not found
 */
export async function updateGoalProgress(goalId: string, progress: number): Promise<Goal | null> {
    const goals = await getAllGoals();
    const goalIndex = goals.findIndex(g => g.id === goalId);

    if (goalIndex === -1) {
        console.warn(`[GoalTracking] Goal not found: ${goalId}`);
        return null;
    }

    const goal = goals[goalIndex];

    // Don't update already completed goals
    if (goal.completedAt !== null) {
        console.log(`[GoalTracking] Goal already completed: ${goalId}`);
        return goal;
    }

    // Update progress
    goal.progress = Math.max(0, progress);
    goal.lastUpdatedAt = new Date().toISOString();

    // Check if goal is now completed
    if (goal.progress >= goal.target) {
        goal.completedAt = new Date().toISOString();
        console.log(`[GoalTracking] Goal completed: ${goalId}`);
    }

    goals[goalIndex] = goal;
    await saveAllGoals(goals);

    return goal;
}

/**
 * Check if a goal is completed
 * @param goal - The goal to check
 * @returns True if the goal is completed
 */
export function checkGoalCompletion(goal: Goal): boolean {
    return goal.completedAt !== null || goal.progress >= goal.target;
}

/**
 * Get all active (not completed) goals
 * @returns Array of active goals
 */
export async function getActiveGoals(): Promise<Goal[]> {
    const goals = await getAllGoals();
    return goals.filter(goal => !checkGoalCompletion(goal));
}

/**
 * Get all completed goals
 * @returns Array of completed goals
 */
export async function getCompletedGoals(): Promise<Goal[]> {
    const goals = await getAllGoals();
    return goals.filter(goal => checkGoalCompletion(goal));
}

/**
 * Calculate daily goal progress from sessions
 * @param sessions - Array of completed sessions
 * @param targetDate - The date to calculate progress for (defaults to today)
 * @returns Number of sessions completed on the target date
 */
export function calculateDailyProgress(
    sessions: SessionData[],
    targetDate: Date = new Date()
): number {
    const dayStart = getStartOfDay(targetDate);
    const dayEnd = getEndOfDay(targetDate);

    return sessions.filter(session => {
        const sessionDate = new Date(session.completedAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
    }).length;
}

/**
 * Calculate weekly goal progress from sessions
 * @param sessions - Array of completed sessions
 * @param targetDate - Any date within the target week (defaults to today)
 * @returns Number of sessions completed in the target week
 */
export function calculateWeeklyProgress(
    sessions: SessionData[],
    targetDate: Date = new Date()
): number {
    const weekStart = getStartOfWeek(targetDate);
    const weekEnd = getEndOfWeek(targetDate);

    return sessions.filter(session => {
        const sessionDate = new Date(session.completedAt);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
    }).length;
}

/**
 * Calculate current streak from sessions
 * A streak is the number of consecutive days with at least one completed session
 * @param sessions - Array of completed sessions sorted by date (newest first or oldest first)
 * @returns Current streak in days
 */
export function calculateStreakProgress(sessions: SessionData[]): number {
    if (sessions.length === 0) {
        return 0;
    }

    // Sort sessions by date (newest first)
    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    // Get unique days with sessions (in reverse chronological order)
    const uniqueDays: string[] = [];
    for (const session of sortedSessions) {
        const dayStr = formatDateString(new Date(session.completedAt));
        if (!uniqueDays.includes(dayStr)) {
            uniqueDays.push(dayStr);
        }
    }

    if (uniqueDays.length === 0) {
        return 0;
    }

    const today = new Date();
    const todayStr = getTodayString();
    const mostRecentDay = uniqueDays[0];

    // Check if the most recent session is today or yesterday
    // If neither, streak is broken
    const mostRecentDate = new Date(mostRecentDay);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateString(yesterday);

    if (mostRecentDay !== todayStr && mostRecentDay !== yesterdayStr) {
        // Streak is broken - more than one day gap
        return 0;
    }

    // Count consecutive days starting from most recent
    let streak = 1;
    let currentDate = mostRecentDate;

    for (let i = 1; i < uniqueDays.length; i++) {
        const prevDayExpected = new Date(currentDate);
        prevDayExpected.setDate(prevDayExpected.getDate() - 1);
        const prevDayExpectedStr = formatDateString(prevDayExpected);

        if (uniqueDays[i] === prevDayExpectedStr) {
            streak++;
            currentDate = prevDayExpected;
        } else {
            // Gap found, streak ends
            break;
        }
    }

    return streak;
}

/**
 * Update a goal's progress based on session data
 * Automatically calculates the appropriate progress based on goal type
 * @param goalId - The ID of the goal to update
 * @param sessions - Array of all completed sessions
 * @returns The updated goal or null if not found
 */
export async function updateGoalFromSessions(
    goalId: string,
    sessions: SessionData[]
): Promise<Goal | null> {
    const goal = await getGoal(goalId);
    if (!goal) {
        return null;
    }

    let progress: number;

    switch (goal.type) {
        case 'daily':
            progress = calculateDailyProgress(sessions);
            break;
        case 'weekly':
            progress = calculateWeeklyProgress(sessions);
            break;
        case 'streak':
            progress = calculateStreakProgress(sessions);
            break;
        default:
            console.warn(`[GoalTracking] Unknown goal type: ${goal.type}`);
            return goal;
    }

    return updateGoalProgress(goalId, progress);
}

/**
 * Delete a goal
 * @param goalId - The ID of the goal to delete
 * @returns True if deleted, false if not found
 */
export async function deleteGoal(goalId: string): Promise<boolean> {
    const goals = await getAllGoals();
    const initialLength = goals.length;
    const filteredGoals = goals.filter(g => g.id !== goalId);

    if (filteredGoals.length === initialLength) {
        console.warn(`[GoalTracking] Goal not found for deletion: ${goalId}`);
        return false;
    }

    await saveAllGoals(filteredGoals);
    console.log(`[GoalTracking] Deleted goal: ${goalId}`);
    return true;
}

/**
 * Clear all goals (for debug/reset purposes)
 */
export async function clearAllGoals(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
        console.log('[GoalTracking] Cleared all goals');
    } catch (error) {
        console.error('[GoalTracking] Failed to clear goals:', error);
    }
}

/**
 * Get goals by type
 * @param type - The type of goals to retrieve
 * @returns Array of goals matching the type
 */
export async function getGoalsByType(type: GoalType): Promise<Goal[]> {
    const goals = await getAllGoals();
    return goals.filter(g => g.type === type);
}

/**
 * Check if a goal has expired based on its type
 * Daily goals expire at midnight, weekly goals expire at end of week
 * Streak goals don't expire but can be broken
 * @param goal - The goal to check
 * @returns True if the goal has expired
 */
export function isGoalExpired(goal: Goal): boolean {
    // Completed goals are not considered expired
    if (goal.completedAt !== null) {
        return false;
    }

    const now = new Date();
    const createdAt = new Date(goal.createdAt);

    switch (goal.type) {
        case 'daily': {
            // Daily goals expire at the end of the day they were created
            const createdDayEnd = getEndOfDay(createdAt);
            return now > createdDayEnd;
        }
        case 'weekly': {
            // Weekly goals expire at the end of the week they were created
            const createdWeekEnd = getEndOfWeek(createdAt);
            return now > createdWeekEnd;
        }
        case 'streak':
            // Streak goals don't expire in the traditional sense
            // They are broken if there's a gap, but that's handled by calculateStreakProgress
            return false;
        default:
            return false;
    }
}

/**
 * Get goal progress as a percentage
 * @param goal - The goal to calculate percentage for
 * @returns Progress percentage (0-100)
 */
export function getGoalProgressPercentage(goal: Goal): number {
    if (goal.target === 0) return 100;
    const percentage = (goal.progress / goal.target) * 100;
    return Math.min(100, Math.round(percentage));
}

/**
 * Get remaining amount to complete goal
 * @param goal - The goal to check
 * @returns Remaining amount (0 if completed or exceeded)
 */
export function getRemainingForGoal(goal: Goal): number {
    return Math.max(0, goal.target - goal.progress);
}
