/**
 * Achievement definitions for milestone celebrations
 *
 * This module defines all achievements available in the app,
 * organized by category (session, streak, collection, milestone).
 */

import { Rarity } from './animals';

// Achievement categories - added 'milestone' for special one-time celebrations
export type AchievementCategory = 'session' | 'streak' | 'collection' | 'milestone';

// Achievement tiers with increasing prestige
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

// Achievement definition
export interface Achievement {
    id: string;
    category: AchievementCategory;
    tier: AchievementTier;
    icon: string;
    threshold: number;
    // For collection achievements
    rarityRequired?: Rarity;
    percentRequired?: number;
}

// Structure for persisted unlocked achievements
export interface UnlockedAchievement {
    id: string;
    unlockedAt: string; // ISO date string
}

// Milestone definitions
export const SESSION_MILESTONES = [10, 25, 50, 100, 250, 500] as const;
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const; // Added 3-day streak
export const COLLECTION_PERCENTAGES = [25, 50, 75, 100] as const;
export const COLLECTION_COUNT_MILESTONES = [1, 10, 25, 50, 100] as const; // Total animals hatched

// Get tier based on threshold for session milestones
function getSessionTier(threshold: number): AchievementTier {
    if (threshold >= 250) return 'platinum';
    if (threshold >= 100) return 'gold';
    if (threshold >= 50) return 'silver';
    return 'bronze';
}

// Get tier based on threshold for streak milestones
function getStreakTier(threshold: number): AchievementTier {
    if (threshold >= 60) return 'platinum';
    if (threshold >= 30) return 'gold';
    if (threshold >= 14) return 'silver';
    return 'bronze';
}

// Get tier for collection count milestones
function getCollectionCountTier(count: number): AchievementTier {
    if (count >= 100) return 'platinum';
    if (count >= 50) return 'gold';
    if (count >= 25) return 'silver';
    return 'bronze';
}

// Get tier for first rarity achievements
function getFirstRarityTier(rarity: Rarity): AchievementTier {
    switch (rarity) {
        case 'legendary':
            return 'platinum';
        case 'epic':
            return 'gold';
        case 'rare':
            return 'silver';
        default:
            return 'bronze';
    }
}

// Get tier for collection percentage achievements
function getCollectionTier(percent: number): AchievementTier {
    if (percent >= 100) return 'platinum';
    if (percent >= 75) return 'gold';
    if (percent >= 50) return 'silver';
    return 'bronze';
}

// Session milestones icons
const SESSION_ICONS: Record<number, string> = {
    10: '\uD83C\uDF31',
    25: '\uD83C\uDF3F',
    50: '\uD83C\uDF33',
    100: '\uD83C\uDFC6',
    250: '\uD83D\uDC51',
    500: '\uD83D\uDC8E',
};

// Streak milestones icons
const STREAK_ICONS: Record<number, string> = {
    3: '\uD83D\uDD25',  // Fire for 3-day streak
    7: '\u26A1',        // Lightning for 7-day
    14: '\uD83D\uDCAA', // Muscle for 14-day
    30: '\uD83C\uDF1F', // Star for 30-day
    60: '\uD83D\uDCAB', // Dizzy for 60-day
    100: '\uD83C\uDF08', // Rainbow for 100-day
};

// Collection count milestone icons
const COLLECTION_COUNT_ICONS: Record<number, string> = {
    1: '\uD83D\uDC23',   // Baby chick - first animal!
    10: '\uD83C\uDF89',  // Party popper
    25: '\uD83C\uDF81',  // Wrapped gift
    50: '\uD83C\uDFC5',  // Medal
    100: '\uD83D\uDC51', // Crown
};

// Rarity icons for first catches
const RARITY_ICONS: Record<Rarity, string> = {
    common: '\uD83D\uDC23',
    rare: '\uD83D\uDC99',
    epic: '\uD83D\uDC9C',
    legendary: '\u2728',
};

// Collection percentage icons
const COLLECTION_ICONS: Record<number, string> = {
    25: '\uD83D\uDCD8',
    50: '\uD83D\uDCD7',
    75: '\uD83D\uDCD9',
    100: '\uD83D\uDCD5',
};

// All session achievements
const sessionAchievements: Achievement[] = SESSION_MILESTONES.map((threshold) => ({
    id: `session_${threshold}`,
    category: 'session' as AchievementCategory,
    tier: getSessionTier(threshold),
    icon: SESSION_ICONS[threshold] || '\uD83C\uDFAF',
    threshold,
}));

// All streak achievements
const streakAchievements: Achievement[] = STREAK_MILESTONES.map((threshold) => ({
    id: `streak_${threshold}`,
    category: 'streak' as AchievementCategory,
    tier: getStreakTier(threshold),
    icon: STREAK_ICONS[threshold] || '\uD83D\uDD25',
    threshold,
}));

// First rarity achievements
const firstRarityAchievements: Achievement[] = (
    ['common', 'rare', 'epic', 'legendary'] as Rarity[]
).map((rarity) => ({
    id: `first_${rarity}`,
    category: 'collection' as AchievementCategory,
    tier: getFirstRarityTier(rarity),
    icon: RARITY_ICONS[rarity],
    threshold: 1,
    rarityRequired: rarity,
}));

// Collection percentage achievements
const collectionPercentAchievements: Achievement[] = COLLECTION_PERCENTAGES.map(
    (percent) => ({
        id: `collection_${percent}`,
        category: 'collection' as AchievementCategory,
        tier: getCollectionTier(percent),
        icon: COLLECTION_ICONS[percent] || '\uD83D\uDCDA',
        threshold: percent,
        percentRequired: percent,
    })
);

// Collection count milestones (total animals hatched)
const collectionCountAchievements: Achievement[] = COLLECTION_COUNT_MILESTONES.map(
    (count) => ({
        id: count === 1 ? 'first_animal' : `hatch_${count}`,
        category: count === 1 ? ('milestone' as AchievementCategory) : ('collection' as AchievementCategory),
        tier: getCollectionCountTier(count),
        icon: COLLECTION_COUNT_ICONS[count] || '\uD83C\uDF89',
        threshold: count,
    })
);

// Export all achievements
export const ACHIEVEMENTS: Achievement[] = [
    ...sessionAchievements,
    ...streakAchievements,
    ...firstRarityAchievements,
    ...collectionPercentAchievements,
    ...collectionCountAchievements,
];

// Helper functions for achievement lookups

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
    return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get all achievements in a category
 */
export function getAchievementsByCategory(
    category: AchievementCategory
): Achievement[] {
    return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: AchievementTier): string {
    switch (tier) {
        case 'platinum':
            return '#E5E4E2';
        case 'gold':
            return '#FFD700';
        case 'silver':
            return '#C0C0C0';
        case 'bronze':
        default:
            return '#CD7F32';
    }
}

/**
 * Get confetti colors based on tier
 */
export function getAchievementConfettiColors(tier: AchievementTier): string[] {
    switch (tier) {
        case 'platinum':
            return [
                '#E5E4E2',
                '#D4D4D4',
                '#B8B8B8',
                '#FFFFFF',
                '#C0C0C0',
                '#9CDCFE',
                '#B4A7D6',
            ];
        case 'gold':
            return [
                '#FFD700',
                '#FFC107',
                '#FFB300',
                '#FFA000',
                '#FFECB3',
                '#FFE082',
                '#FFD54F',
            ];
        case 'silver':
            return [
                '#C0C0C0',
                '#A8A8A8',
                '#D8D8D8',
                '#B0B0B0',
                '#E8E8E8',
                '#98D8C8',
                '#7EB6FF',
            ];
        case 'bronze':
        default:
            return [
                '#CD7F32',
                '#B87333',
                '#D4A574',
                '#C4956A',
                '#E8B890',
                '#F5D6BA',
                '#8B4513',
            ];
    }
}

/**
 * Get particle count based on tier (more particles for higher tiers)
 */
export function getAchievementParticleCount(tier: AchievementTier): number {
    switch (tier) {
        case 'platinum':
            return 20;
        case 'gold':
            return 15;
        case 'silver':
            return 12;
        case 'bronze':
        default:
            return 8;
    }
}

/**
 * Check if a session milestone has been reached
 */
export function checkSessionMilestone(
    completedSessions: number,
    unlockedIds: string[]
): Achievement | null {
    for (const milestone of SESSION_MILESTONES) {
        const id = `session_${milestone}`;
        if (completedSessions >= milestone && !unlockedIds.includes(id)) {
            return getAchievementById(id) || null;
        }
    }
    return null;
}

/**
 * Check if a streak milestone has been reached
 */
export function checkStreakMilestone(
    currentStreak: number,
    unlockedIds: string[]
): Achievement | null {
    for (const milestone of STREAK_MILESTONES) {
        const id = `streak_${milestone}`;
        if (currentStreak >= milestone && !unlockedIds.includes(id)) {
            return getAchievementById(id) || null;
        }
    }
    return null;
}

/**
 * Check if a first rarity achievement has been earned
 */
export function checkFirstRarityAchievement(
    rarity: Rarity,
    unlockedIds: string[]
): Achievement | null {
    const id = `first_${rarity}`;
    if (!unlockedIds.includes(id)) {
        return getAchievementById(id) || null;
    }
    return null;
}

/**
 * Check if a collection percentage milestone has been reached
 */
export function checkCollectionMilestone(
    collectedUniqueCount: number,
    totalAnimalsCount: number,
    unlockedIds: string[]
): Achievement | null {
    if (totalAnimalsCount <= 0) return null;
    const percent = Math.floor((collectedUniqueCount / totalAnimalsCount) * 100);

    for (const milestone of COLLECTION_PERCENTAGES) {
        const id = `collection_${milestone}`;
        if (percent >= milestone && !unlockedIds.includes(id)) {
            return getAchievementById(id) || null;
        }
    }
    return null;
}

/**
 * Check if the first animal milestone has been reached (very first hatch!)
 * This triggers a special celebration
 */
export function checkFirstAnimalMilestone(
    totalAnimalsHatched: number,
    unlockedIds: string[]
): Achievement | null {
    if (totalAnimalsHatched === 1 && !unlockedIds.includes('first_animal')) {
        return getAchievementById('first_animal') || null;
    }
    return null;
}

/**
 * Check if a collection count milestone has been reached (total animals hatched)
 */
export function checkCollectionCountMilestone(
    totalAnimalsHatched: number,
    unlockedIds: string[]
): Achievement | null {
    for (const milestone of COLLECTION_COUNT_MILESTONES) {
        if (milestone === 1) continue; // Skip first_animal, handled separately
        const id = `hatch_${milestone}`;
        if (totalAnimalsHatched >= milestone && !unlockedIds.includes(id)) {
            return getAchievementById(id) || null;
        }
    }
    return null;
}

/**
 * Check for early streak milestones (3-day)
 */
export function checkEarlyStreakMilestone(
    currentStreak: number,
    unlockedIds: string[]
): Achievement | null {
    const id = 'streak_3';
    if (currentStreak >= 3 && !unlockedIds.includes(id)) {
        return getAchievementById(id) || null;
    }
    return null;
}

/**
 * Determine if this is a special milestone that deserves an enhanced celebration
 */
export type MilestoneCategory =
    | 'first_animal'
    | 'collection_count'
    | 'streak'
    | 'rarity'
    | 'collection_percent'
    | 'session';

export function getMilestoneCategory(achievement: Achievement): MilestoneCategory {
    if (achievement.id === 'first_animal') return 'first_animal';
    if (achievement.id.startsWith('hatch_')) return 'collection_count';
    if (achievement.id.startsWith('streak_')) return 'streak';
    if (achievement.id.startsWith('first_')) return 'rarity';
    if (achievement.id.startsWith('collection_')) return 'collection_percent';
    return 'session';
}

/**
 * Check if an achievement deserves a milestone celebration
 * (vs regular achievement notification)
 */
export function isMilestoneCelebration(achievement: Achievement): boolean {
    const category = getMilestoneCategory(achievement);
    // These categories get the enhanced milestone celebration
    return [
        'first_animal',
        'collection_count',
        'streak',
        'rarity',
    ].includes(category);
}
