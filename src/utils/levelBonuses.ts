/**
 * Level Bonuses Utility
 * 
 * Calculates and applies gameplay bonuses based on animal collection levels.
 * Fixes OVOFOCUS-47 and OVOFOCUS-67: Level bonuses are no longer cosmetic-only.
 */

import { Language } from '../i18n/translations';

// Collected animal type (simplified - matches storage.ts)
export interface CollectedAnimalForBonus {
    animalId: string;
    count: number;
}

/**
 * Minimum animal counts required for each level.
 * Index corresponds to level - 1 (0 = level 1, 1 = level 2, etc.)
 * - Level 1: 0+ animals (starting level)
 * - Level 2: 3+ animals
 * - Level 3: 6+ animals
 * - Level 4: 10+ animals
 * - Level 5: 15+ animals (max level)
 */
export const LEVEL_THRESHOLDS = [0, 3, 6, 10, 15];

/**
 * Focus time reduction percentage per level.
 * - Level 1: 0% (no bonus)
 * - Level 2: 0% (cosmetic only - enhanced animations)
 * - Level 3: 2% focus time reduction
 * - Level 4: 3% focus time reduction
 * - Level 5: 5% focus time reduction
 */
export const FOCUS_BONUS_PERCENT = [0, 0, 2, 3, 5];

/**
 * Shield bonus seconds (added to background tolerance) per level.
 * - Level 1: 0s (no bonus)
 * - Level 2: 0s (cosmetic only)
 * - Level 3: 5s additional tolerance
 * - Level 4: 10s additional tolerance
 * - Level 5: 15s additional tolerance
 */
export const SHIELD_BONUS_SECONDS = [0, 0, 5, 10, 15];

/**
 * Maximum caps to prevent exploitation
 */
export const MAX_FOCUS_BONUS_PERCENT = 25; // Max 25% focus reduction
export const MAX_SHIELD_BONUS_SECONDS = 60; // Max 60s additional tolerance

export interface LevelBonuses {
    /** Total focus time reduction percentage (capped at MAX_FOCUS_BONUS_PERCENT) */
    focusPercentage: number;
    /** Total shield bonus seconds (capped at MAX_SHIELD_BONUS_SECONDS) */
    shieldSeconds: number;
    /** Number of animals contributing to bonuses */
    contributingAnimals: number;
}

export interface AnimalLevelInfo {
    level: number;
    focusBonus: number;
    shieldBonus: number;
}

/**
 * Calculate animal level based on duplicate count.
 * @param count - Number of times this animal has been collected
 * @returns Level from 1 to 5
 */
export function getAnimalLevel(count: number): number {
    if (count >= LEVEL_THRESHOLDS[4]) return 5;
    if (count >= LEVEL_THRESHOLDS[3]) return 4;
    if (count >= LEVEL_THRESHOLDS[2]) return 3;
    if (count >= LEVEL_THRESHOLDS[1]) return 2;
    return 1;
}

/**
 * Get bonus values for a specific level.
 * @param level - Animal level (1-5)
 * @returns Focus bonus percentage and shield bonus seconds
 */
export function getLevelBonusValues(level: number): { focusBonus: number; shieldBonus: number } {
    const clampedLevel = Math.max(1, Math.min(5, level));
    return {
        focusBonus: FOCUS_BONUS_PERCENT[clampedLevel - 1] || 0,
        shieldBonus: SHIELD_BONUS_SECONDS[clampedLevel - 1] || 0,
    };
}

/**
 * Calculate total bonuses from the entire collection.
 * Sums bonuses from all animals and applies caps.
 * 
 * @param collection - Array of collected animals with their counts
 * @returns Total focus percentage and shield seconds bonuses
 */
export function calculateCollectionBonuses(collection: CollectedAnimalForBonus[]): LevelBonuses {
    let totalFocusBonus = 0;
    let totalShieldBonus = 0;
    let contributingAnimals = 0;

    for (const animal of collection) {
        const level = getAnimalLevel(animal.count);
        const { focusBonus, shieldBonus } = getLevelBonusValues(level);
        
        if (focusBonus > 0 || shieldBonus > 0) {
            totalFocusBonus += focusBonus;
            totalShieldBonus += shieldBonus;
            contributingAnimals++;
        }
    }

    return {
        focusPercentage: Math.min(totalFocusBonus, MAX_FOCUS_BONUS_PERCENT),
        shieldSeconds: Math.min(totalShieldBonus, MAX_SHIELD_BONUS_SECONDS),
        contributingAnimals,
    };
}

/**
 * Get localized bonus description for display in UI.
 * Shows actual functional bonus values.
 * 
 * @param level - Animal level (1-5)
 * @param language - Display language
 * @returns Localized bonus description string
 */
export function getLevelBonusDescription(level: number, language: Language): string {
    const { focusBonus, shieldBonus } = getLevelBonusValues(level);
    
    const bonuses: Record<number, Record<Language, string>> = {
        1: {
            en: 'No bonus yet',
            tr: 'Henüz bonus yok',
            es: 'Sin bonificación aún',
        },
        2: {
            en: 'Enhanced animations',
            tr: 'Gelişmiş animasyonlar',
            es: 'Animaciones mejoradas',
        },
        3: {
            en: `Focus -${focusBonus}%, Shield +${shieldBonus}s`,
            tr: `Odaklanma -%${focusBonus}, Kalkan +${shieldBonus}sn`,
            es: `Enfoque -${focusBonus}%, Escudo +${shieldBonus}s`,
        },
        4: {
            en: `Focus -${focusBonus}%, Shield +${shieldBonus}s + Aura`,
            tr: `Odaklanma -%${focusBonus}, Kalkan +${shieldBonus}sn + Aura`,
            es: `Enfoque -${focusBonus}%, Escudo +${shieldBonus}s + Aura`,
        },
        5: {
            en: `Focus -${focusBonus}%, Shield +${shieldBonus}s + Master`,
            tr: `Odaklanma -%${focusBonus}, Kalkan +${shieldBonus}sn + Usta`,
            es: `Enfoque -${focusBonus}%, Escudo +${shieldBonus}s + Maestro`,
        },
    };

    return bonuses[level]?.[language] || bonuses[1][language];
}

/**
 * Calculate the effective session duration after applying focus bonus.
 * 
 * @param baseDurationSeconds - Base session duration in seconds
 * @param focusBonusPercent - Focus bonus percentage (0-25)
 * @param minDurationSeconds - Minimum allowed duration (default: 60s)
 * @returns Effective duration in seconds
 */
export function calculateEffectiveDuration(
    baseDurationSeconds: number,
    focusBonusPercent: number,
    minDurationSeconds: number = 60
): number {
    const reduction = baseDurationSeconds * (focusBonusPercent / 100);
    return Math.max(baseDurationSeconds - reduction, minDurationSeconds);
}
