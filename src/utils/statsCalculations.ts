// Stats Calculations - Helper functions to aggregate and analyze focus statistics
// This is a READ-ONLY utility that computes derived stats from GameContext.state.stats

import { Stats, CollectedAnimal } from './storage';

// Types for calculated statistics
export interface WeeklyData {
    day: string;          // Day name abbreviation (Mon, Tue, etc.)
    date: string;         // YYYY-MM-DD format
    sessions: number;     // Number of completed sessions
    focusMinutes: number; // Total focus minutes
}

export interface MonthlyTrend {
    weekLabel: string;    // "Week 1", "Week 2", etc.
    weekStart: string;    // YYYY-MM-DD of week start
    totalMinutes: number; // Total focus minutes for the week
}

export interface TimeOfDayData {
    hour: number;         // 0-23
    label: string;        // "Morning", "Afternoon", etc.
    sessions: number;     // Sessions completed in this time range
}

export interface DayOfWeekData {
    day: string;          // Full day name
    dayIndex: number;     // 0 = Sunday, 6 = Saturday
    sessions: number;     // Sessions completed on this day
}

export interface CompletionRateData {
    completed: number;
    failed: number;
    rate: number;         // Percentage (0-100)
}

export interface StatsSummary {
    totalFocusTimeToday: number;      // Minutes focused today
    totalFocusTimeWeek: number;       // Minutes focused this week
    totalFocusTimeAllTime: number;    // All-time focus minutes
    sessionCountToday: number;        // Sessions completed today
    sessionCountWeek: number;         // Sessions completed this week
    sessionCountAllTime: number;      // All-time sessions
    averageSessionDuration: number;   // Average minutes per session
    completionRate: CompletionRateData;
    currentStreak: number;
    bestStreak: number;
    mostProductiveDay: DayOfWeekData | null;
    mostProductiveTime: TimeOfDayData | null;
}

// Helper function to get day name
function getDayName(date: Date, short = false): string {
    const days = short
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// Helper function to get day name in Turkish
function getDayNameTR(date: Date, short = false): string {
    const days = short
        ? ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt']
        : ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
    return days[date.getDay()];
}

// Get localized day name
export function getLocalizedDayName(date: Date, language: 'en' | 'tr' | 'es', short = false): string {
    return language === 'tr' ? getDayNameTR(date, short) : getDayName(date, short);
}

// Helper to get start of day
function getStartOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper to get start of week (Sunday)
function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper to format date as local YYYY-MM-DD
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate weekly session data (last 7 days)
export function calculateWeeklyData(
    collection: CollectedAnimal[],
    language: 'en' | 'tr' | 'es' = 'en',
    avgDuration: number = 25
): WeeklyData[] {
    const today = getStartOfDay(new Date());
    const weekData: WeeklyData[] = [];

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);

        // Count sessions for this day
        const daySessions = collection.filter(animal => {
            if (!animal.collectedAt) return false;
            const animalDate = formatDate(new Date(animal.collectedAt));
            return animalDate === dateStr;
        });

        weekData.push({
            day: getLocalizedDayName(date, language, true),
            date: dateStr,
            sessions: daySessions.length,
            focusMinutes: daySessions.length * avgDuration,
        });
    }

    return weekData;
}

// Calculate monthly trend (last 4 weeks)
export function calculateMonthlyTrend(
    collection: CollectedAnimal[],
    language: 'en' | 'tr' | 'es' = 'en',
    avgDuration: number = 25
): MonthlyTrend[] {
    const today = new Date();
    const trends: MonthlyTrend[] = [];

    // Get last 4 weeks
    for (let week = 3; week >= 0; week--) {
        const weekStart = getStartOfWeek(new Date(today));
        weekStart.setDate(weekStart.getDate() - (week * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Count sessions in this week
        const weekSessions = collection.filter(animal => {
            if (!animal.collectedAt) return false;
            const animalDate = new Date(animal.collectedAt);
            return animalDate >= weekStart && animalDate <= weekEnd;
        });

        const weekLabel = language === 'tr' ? `Hafta ${4 - week}` : `Week ${4 - week}`;

        trends.push({
            weekLabel,
            weekStart: formatDate(weekStart),
            totalMinutes: weekSessions.length * avgDuration,
        });
    }

    return trends;
}

// Calculate completion rate
export function calculateCompletionRate(stats: Stats): CompletionRateData {
    const total = stats.completedSessions + stats.failedSessions;
    const rate = total > 0 ? Math.round((stats.completedSessions / total) * 100) : 0;

    return {
        completed: stats.completedSessions,
        failed: stats.failedSessions,
        rate,
    };
}

// Calculate most productive day of week
export function calculateMostProductiveDay(
    collection: CollectedAnimal[],
    language: 'en' | 'tr' | 'es' = 'en'
): DayOfWeekData | null {
    if (collection.length === 0) return null;

    const dayData: Record<number, number> = {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    };

    collection.forEach(animal => {
        if (animal.collectedAt) {
            const date = new Date(animal.collectedAt);
            dayData[date.getDay()]++;
        }
    });

    // Find max
    let maxDay = 0;
    let maxSessions = 0;
    Object.entries(dayData).forEach(([day, sessions]) => {
        if (sessions > maxSessions) {
            maxSessions = sessions;
            maxDay = parseInt(day, 10);
        }
    });

    if (maxSessions === 0) return null;

    const dayNames = language === 'tr'
        ? ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
        day: dayNames[maxDay],
        dayIndex: maxDay,
        sessions: maxSessions,
    };
}

// Calculate most productive time of day
export function calculateMostProductiveTime(
    collection: CollectedAnimal[],
    language: 'en' | 'tr' | 'es' = 'en'
): TimeOfDayData | null {
    if (collection.length === 0) return null;

    // Group by time periods (morning, afternoon, evening, night)
    const timeRanges = {
        morning: { start: 5, end: 11, sessions: 0 },
        afternoon: { start: 12, end: 16, sessions: 0 },
        evening: { start: 17, end: 20, sessions: 0 },
        night: { start: 21, end: 4, sessions: 0 },
    };

    const labels = language === 'tr'
        ? { morning: 'Sabah', afternoon: 'Ogle', evening: 'Aksam', night: 'Gece' }
        : { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };

    collection.forEach(animal => {
        if (animal.collectedAt) {
            const hour = new Date(animal.collectedAt).getHours();
            if (hour >= 5 && hour <= 11) timeRanges.morning.sessions++;
            else if (hour >= 12 && hour <= 16) timeRanges.afternoon.sessions++;
            else if (hour >= 17 && hour <= 20) timeRanges.evening.sessions++;
            else timeRanges.night.sessions++;
        }
    });

    // Find max
    let maxPeriod: keyof typeof timeRanges = 'morning';
    let maxSessions = 0;
    (Object.keys(timeRanges) as (keyof typeof timeRanges)[]).forEach(period => {
        if (timeRanges[period].sessions > maxSessions) {
            maxSessions = timeRanges[period].sessions;
            maxPeriod = period;
        }
    });

    if (maxSessions === 0) return null;

    return {
        hour: timeRanges[maxPeriod].start,
        label: labels[maxPeriod],
        sessions: maxSessions,
    };
}

// Calculate today's stats from collection
export function calculateTodayStats(
    collection: CollectedAnimal[],
    avgDuration: number = 25
): { sessions: number; minutes: number } {
    const today = formatDate(new Date());

    const todaySessions = collection.filter(animal => {
        if (!animal.collectedAt) return false;
        return formatDate(new Date(animal.collectedAt)) === today;
    });

    return {
        sessions: todaySessions.length,
        minutes: todaySessions.length * avgDuration,
    };
}

// Calculate this week's stats from collection
export function calculateWeekStats(
    collection: CollectedAnimal[],
    avgDuration: number = 25
): { sessions: number; minutes: number } {
    const weekStart = getStartOfWeek(new Date());

    const weekSessions = collection.filter(animal => {
        if (!animal.collectedAt) return false;
        return new Date(animal.collectedAt) >= weekStart;
    });

    return {
        sessions: weekSessions.length,
        minutes: weekSessions.length * avgDuration,
    };
}

// Main function to calculate all stats summary
export function calculateStatsSummary(
    stats: Stats,
    collection: CollectedAnimal[],
    language: 'en' | 'tr' | 'es' = 'en'
): StatsSummary {
    // Calculate average session duration from actual stats, fallback to 25 minutes
    const averageSessionDuration = stats.completedSessions > 0
        ? Math.round(stats.totalFocusMinutes / stats.completedSessions)
        : 25;

    // Pass average duration to helper functions for accurate calculations
    const todayStats = calculateTodayStats(collection, averageSessionDuration);
    const weekStats = calculateWeekStats(collection, averageSessionDuration);
    const completionRate = calculateCompletionRate(stats);
    const mostProductiveDay = calculateMostProductiveDay(collection, language);
    const mostProductiveTime = calculateMostProductiveTime(collection, language);

    return {
        totalFocusTimeToday: todayStats.minutes,
        totalFocusTimeWeek: weekStats.minutes,
        totalFocusTimeAllTime: stats.totalFocusMinutes,
        sessionCountToday: todayStats.sessions,
        sessionCountWeek: weekStats.sessions,
        sessionCountAllTime: stats.completedSessions,
        averageSessionDuration,
        completionRate,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        mostProductiveDay,
        mostProductiveTime,
    };
}

// Format minutes as hours and minutes string
export function formatDuration(minutes: number, language: 'en' | 'tr' | 'es' = 'en'): string {
    if (minutes < 60) {
        return language === 'tr' ? `${minutes} dk` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return language === 'tr' ? `${hours} sa` : `${hours}h`;
    }

    return language === 'tr' ? `${hours} sa ${mins} dk` : `${hours}h ${mins}m`;
}

// Get time period icon
export function getTimePeriodIcon(label: string): string {
    const icons: Record<string, string> = {
        'Morning': '🌅',
        'Sabah': '🌅',
        'Afternoon': '☀️',
        'Ogle': '☀️',
        'Evening': '🌆',
        'Aksam': '🌆',
        'Night': '🌙',
        'Gece': '🌙',
    };
    return icons[label] || '⏰';
}

// Get day icon
export function getDayIcon(dayIndex: number): string {
    const icons = ['🌞', '🌙', '🔥', '💪', '⭐', '🎉', '🌈'];
    return icons[dayIndex] || '📅';
}
