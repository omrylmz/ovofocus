/**
 * Zod validation schemas for persisted data
 *
 * This module provides runtime validation for all data stored in AsyncStorage.
 * Each schema matches the TypeScript interfaces in storage.ts and provides
 * sensible defaults when validation fails.
 */

import { z } from 'zod';

// ============================================================================
// Enums and Primitive Schemas
// ============================================================================

/** Rarity levels for animals */
export const RaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);

/** Supported languages */
export const LanguageSchema = z.enum(['en', 'tr', 'es']);

/** Theme mode options */
export const ThemeModeSchema = z.enum(['light', 'dark', 'system']);

/** Reduced motion preference */
export const ReducedMotionPreferenceSchema = z.enum(['system', 'on', 'off']);

/** Achievement categories */
export const AchievementCategorySchema = z.enum(['session', 'streak', 'collection', 'milestone']);

/** Achievement tiers */
export const AchievementTierSchema = z.enum(['bronze', 'silver', 'gold', 'platinum']);

// ============================================================================
// Animal Schemas
// ============================================================================

/** Base animal schema */
export const AnimalSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    emoji: z.string().min(1),
    rarity: RaritySchema,
    description: z.string(),
});

/** Collected animal extends Animal with collection metadata */
export const CollectedAnimalSchema = AnimalSchema.extend({
    // Accepts ISO datetime with offset (preferred) or basic ISO format (legacy)
    collectedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
    sessionId: z.string().min(1),
    notes: z.string().optional(),
});

/** Collection is an array of collected animals */
export const CollectionSchema = z.array(CollectedAnimalSchema);

// ============================================================================
// Stats Schema
// ============================================================================

/** Default stats for fallback */
export const defaultStats = {
    totalSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    totalFocusMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: null,
} as const;

/** Stats schema with non-negative number constraints */
export const StatsSchema = z.object({
    totalSessions: z.number().int().nonnegative().default(defaultStats.totalSessions),
    completedSessions: z.number().int().nonnegative().default(defaultStats.completedSessions),
    failedSessions: z.number().int().nonnegative().default(defaultStats.failedSessions),
    totalFocusMinutes: z.number().nonnegative().default(defaultStats.totalFocusMinutes), // Accepts fractional minutes from partial sessions
    currentStreak: z.number().int().nonnegative().default(defaultStats.currentStreak),
    bestStreak: z.number().int().nonnegative().default(defaultStats.bestStreak),
    lastSessionDate: z.string().nullable().default(defaultStats.lastSessionDate),
});

// ============================================================================
// Settings Schema
// ============================================================================

/**
 * Default settings for fallback
 * Note: language default is determined at runtime via getDeviceLanguage()
 * For validation purposes, we use 'en' as the static default
 */
export const defaultSettings = {
    focusDuration: 25,
    toleranceSeconds: 20,
    soundEnabled: true,
    hapticsEnabled: true,
    notificationsEnabled: true,
    language: 'en' as const,
    debugMode: false,
    hasSeenGestureHints: false,
    lastGestureHintSession: 0,
    gestureHintIntervalSessions: 5,
    maxPausesPerSession: 3,
    hasCompletedOnboarding: false,
    dailyGoal: 3,
    emergencyPauseDuration: 60,
    reducedMotion: 'system' as const,
    themeMode: 'system' as const,
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
    // Egg customization
    selectedEggStyle: 'classic',
} as const;

/** Ambient sound options */
export const AmbientSoundSchema = z.enum(['rain', 'forest', 'ocean', 'white_noise', 'cafe']);

/** Settings schema with range constraints matching updateSettings validation */
export const SettingsSchema = z.object({
    focusDuration: z.number().int().min(1).max(120).default(defaultSettings.focusDuration),
    toleranceSeconds: z.number().int().min(0).max(300).default(defaultSettings.toleranceSeconds),
    soundEnabled: z.boolean().default(defaultSettings.soundEnabled),
    hapticsEnabled: z.boolean().default(defaultSettings.hapticsEnabled),
    notificationsEnabled: z.boolean().default(defaultSettings.notificationsEnabled),
    language: LanguageSchema.default(defaultSettings.language),
    debugMode: z.boolean().default(defaultSettings.debugMode),
    hasSeenGestureHints: z.boolean().default(defaultSettings.hasSeenGestureHints),
    lastGestureHintSession: z.number().int().nonnegative().default(defaultSettings.lastGestureHintSession),
    gestureHintIntervalSessions: z.number().int().nonnegative().default(defaultSettings.gestureHintIntervalSessions),
    maxPausesPerSession: z.number().int().min(0).max(10).default(defaultSettings.maxPausesPerSession),
    hasCompletedOnboarding: z.boolean().default(defaultSettings.hasCompletedOnboarding),
    dailyGoal: z.number().int().min(1).max(20).default(defaultSettings.dailyGoal),
    emergencyPauseDuration: z.number().int().min(10).max(300).default(defaultSettings.emergencyPauseDuration),
    reducedMotion: ReducedMotionPreferenceSchema.default(defaultSettings.reducedMotion),
    themeMode: ThemeModeSchema.default(defaultSettings.themeMode),
    // Ambient sound settings
    ambientSoundEnabled: z.boolean().default(defaultSettings.ambientSoundEnabled),
    selectedAmbientSound: z.string().default(defaultSettings.selectedAmbientSound),
    ambientSoundVolume: z.number().int().min(0).max(100).default(defaultSettings.ambientSoundVolume),
    // Pomodoro settings
    pomodoroEnabled: z.boolean().default(defaultSettings.pomodoroEnabled),
    pomodoroWorkDuration: z.number().int().min(1).max(60).default(defaultSettings.pomodoroWorkDuration),
    pomodoroBreakDuration: z.number().int().min(1).max(30).default(defaultSettings.pomodoroBreakDuration),
    pomodoroLongBreakDuration: z.number().int().min(1).max(60).default(defaultSettings.pomodoroLongBreakDuration),
    sessionsBeforeLongBreak: z.number().int().min(2).max(10).default(defaultSettings.sessionsBeforeLongBreak),
    // Egg customization
    selectedEggStyle: z.string().default(defaultSettings.selectedEggStyle),
});

// ============================================================================
// Daily Progress Schema
// ============================================================================

/** Default daily progress (uses current local date at runtime) */
export const getDefaultDailyProgress = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
        date: `${year}-${month}-${day}`,
        completedSessions: 0,
        goalAchieved: false,
    };
};

/** Daily progress schema */
export const DailyProgressSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    completedSessions: z.number().int().nonnegative().default(0),
    goalAchieved: z.boolean().default(false),
});

// ============================================================================
// Shield Item Schema
// ============================================================================

/** Shield item schema */
export const ShieldItemSchema = z.object({
    animalId: z.string().min(1),
    animalName: z.string().min(1),
    rarity: z.string().min(1), // Using string instead of RaritySchema for flexibility
    durationSeconds: z.number().int().positive(),
});

/** Shield inventory is an array of shield items */
export const ShieldInventorySchema = z.array(ShieldItemSchema);

// ============================================================================
// Animal Interaction Schema
// ============================================================================

/** Default animal interaction for a given animalId */
export const getDefaultAnimalInteraction = (animalId: string) => ({
    animalId,
    happiness: 50,
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
});

/** Nullable ISO datetime string */
const NullableDatetimeSchema = z.string().nullable();

/** Animal interaction schema */
export const AnimalInteractionSchema = z.object({
    animalId: z.string().min(1),
    happiness: z.number().int().min(0).max(100).default(50),
    lastPetTime: NullableDatetimeSchema.default(null),
    lastFeedTime: NullableDatetimeSchema.default(null),
    lastPlayTime: NullableDatetimeSchema.default(null),
    lastTrainTime: NullableDatetimeSchema.default(null),
    lastGroomTime: NullableDatetimeSchema.default(null),
    lastTalkTime: NullableDatetimeSchema.default(null),
    petCount: z.number().int().nonnegative().default(0),
    feedCount: z.number().int().nonnegative().default(0),
    playCount: z.number().int().nonnegative().default(0),
    trainCount: z.number().int().nonnegative().default(0),
    groomCount: z.number().int().nonnegative().default(0),
    talkCount: z.number().int().nonnegative().default(0),
});

/** Animal interactions array */
export const AnimalInteractionsSchema = z.array(AnimalInteractionSchema);

// ============================================================================
// Persisted Session Schema
// ============================================================================

/** Persisted session schema for app kill recovery */
export const PersistedSessionSchema = z.object({
    startTime: z.string().min(1), // ISO timestamp
    duration: z.number().int().positive(), // Total session duration in seconds
    pauseCount: z.number().int().nonnegative().default(0),
    isPaused: z.boolean().default(false),
    pausedAt: z.string().nullable().default(null), // ISO timestamp when paused
    accumulatedPauseTime: z.number().int().nonnegative().default(0), // Total pause time in ms; upper bound validated during restore in storage.ts
    focusDuration: z.number().int().positive(), // Focus duration setting in minutes
});

// ============================================================================
// Favorites Schema
// ============================================================================

/** Favorites is an array of animal IDs */
export const FavoritesSchema = z.array(z.string());

// ============================================================================
// Achievements Schema
// ============================================================================

/** Achievement schema */
export const AchievementSchema = z.object({
    id: z.string().min(1),
    category: AchievementCategorySchema,
    tier: AchievementTierSchema,
    icon: z.string().min(1),
    threshold: z.number().int().nonnegative(),
    rarityRequired: RaritySchema.optional(),
    percentRequired: z.number().int().min(0).max(100).optional(),
});

/** Unlocked achievement schema */
export const UnlockedAchievementSchema = z.object({
    id: z.string().min(1),
    unlockedAt: z.string().min(1), // ISO date string
});

/** Unlocked achievements array */
export const UnlockedAchievementsSchema = z.array(UnlockedAchievementSchema);

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
    success: boolean;
    data: T;
    issues?: z.ZodIssue[];
}

/**
 * Validates data against a Zod schema with fallback to default value
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate (typically from JSON.parse)
 * @param defaultValue - Fallback value if validation fails
 * @returns Validated and typed data, or the default value on failure
 *
 * @example
 * const stats = validateData(StatsSchema, parsedData, defaultStats);
 */
export function validateData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    defaultValue: T
): ValidationResult<T> {
    try {
        const result = schema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data };
        }
        console.warn('[Validation] Data validation failed:', result.error.issues);
        return { success: false, data: defaultValue, issues: result.error.issues };
    } catch (error) {
        console.error('[Validation] Unexpected error during validation:', error);
        return { success: false, data: defaultValue };
    }
}

/**
 * Validates data and returns just the data (simplified interface)
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @param defaultValue - Fallback value if validation fails
 * @returns Validated data or default value
 */
export function validateOrDefault<T>(
    schema: z.ZodType<T>,
    data: unknown,
    defaultValue: T
): T {
    return validateData(schema, data, defaultValue).data;
}

/**
 * Validates an array of items, filtering out invalid entries
 *
 * @param schema - The Zod schema for individual items
 * @param data - The array data to validate
 * @returns Array with only valid items (invalid items are filtered out)
 *
 * @example
 * const validAnimals = validateArray(CollectedAnimalSchema, parsedCollection);
 */
export function validateArray<T>(
    schema: z.ZodType<T>,
    data: unknown
): T[] {
    if (!Array.isArray(data)) {
        console.warn('[Validation] Expected array, got:', typeof data);
        return [];
    }

    const validItems: T[] = [];
    const invalidIndices: number[] = [];

    data.forEach((item, index) => {
        const result = schema.safeParse(item);
        if (result.success) {
            validItems.push(result.data);
        } else {
            invalidIndices.push(index);
        }
    });

    if (invalidIndices.length > 0) {
        console.warn(
            `[Validation] Filtered out ${invalidIndices.length} invalid items at indices:`,
            invalidIndices
        );
    }

    return validItems;
}

/**
 * Merges partial data with defaults, useful for settings migration
 *
 * @param schema - The Zod schema to validate against
 * @param data - Partial data to merge
 * @param defaults - Default values to merge with
 * @returns Merged and validated data
 */
export function validateWithDefaults<T extends object>(
    schema: z.ZodType<T>,
    data: unknown,
    defaults: T
): T {
    if (data === null || data === undefined) {
        return defaults;
    }

    if (typeof data !== 'object') {
        console.warn('[Validation] Expected object, got:', typeof data);
        return defaults;
    }

    // Merge with defaults first
    const merged = { ...defaults, ...data };

    // Then validate the merged object
    const result = schema.safeParse(merged);

    if (result.success) {
        return result.data;
    }

    console.warn('[Validation] Merged data validation failed, using defaults:', result.error.issues);
    return defaults;
}

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type ValidatedAnimal = z.infer<typeof AnimalSchema>;
export type ValidatedCollectedAnimal = z.infer<typeof CollectedAnimalSchema>;
export type ValidatedStats = z.infer<typeof StatsSchema>;
export type ValidatedSettings = z.infer<typeof SettingsSchema>;
export type ValidatedDailyProgress = z.infer<typeof DailyProgressSchema>;
export type ValidatedShieldItem = z.infer<typeof ShieldItemSchema>;
export type ValidatedAnimalInteraction = z.infer<typeof AnimalInteractionSchema>;
export type ValidatedPersistedSession = z.infer<typeof PersistedSessionSchema>;
export type ValidatedUnlockedAchievement = z.infer<typeof UnlockedAchievementSchema>;
