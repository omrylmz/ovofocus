import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './storage';
import { getDeviceLanguage } from '../i18n/translations';

/**
 * Data Migration System for Ovo Focus
 *
 * This module handles schema changes gracefully across app updates.
 * Migrations run sequentially and only execute if the stored version
 * is less than the migration version.
 */

// Current data schema version - increment when adding new migrations
export const CURRENT_VERSION = 1;

// Storage key for tracking the data version
export const VERSION_STORAGE_KEY = '@ovofocus/data_version';

/**
 * Migration interface defining the structure of each migration
 */
export interface Migration {
    version: number;
    description: string;
    migrate: () => Promise<void>;
}

/**
 * Get default settings fields dynamically
 * Uses getDeviceLanguage() for language to respect user's device settings
 */
function getDefaultSettingsFields() {
    return {
        focusDuration: 25,
        toleranceSeconds: 20,
        soundEnabled: true,
        hapticsEnabled: true,
        notificationsEnabled: true,
        language: getDeviceLanguage(),
    debugMode: false,
    hasSeenGestureHints: false,
    lastGestureHintSession: 0,
    gestureHintIntervalSessions: 5,
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
}

/**
 * Array of all migrations to run
 * Add new migrations at the end with incrementing version numbers
 */
export const migrations: Migration[] = [
    {
        version: 1,
        description: 'Ensure settings have all new default fields (selectedEggStyle, ambient sounds, pomodoro, etc.)',
        migrate: async () => {
            try {
                const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);

                if (!data) {
                    // No settings exist yet, nothing to migrate
                    console.log('[Migration] No existing settings found, skipping settings migration');
                    return;
                }

                const existingSettings = JSON.parse(data);

                // Merge existing settings with defaults to ensure all fields exist
                // Existing values take precedence over defaults
                // Note: getDefaultSettingsFields() uses getDeviceLanguage() dynamically
                const defaultFields = getDefaultSettingsFields();
                const migratedSettings = {
                    ...defaultFields,
                    ...existingSettings,
                };
                // Don't override user's explicit language choice
                if (existingSettings.language) {
                    migratedSettings.language = existingSettings.language;
                }

                // Save the migrated settings
                await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(migratedSettings));

                console.log('[Migration] Settings migrated successfully with all default fields');
            } catch (error) {
                console.error('[Migration] Failed to migrate settings:', error);
                throw error; // Re-throw to stop migration execution
            }
        },
    },
];

/**
 * Get the current stored data version
 * Returns 0 if no version is stored (fresh install or pre-migration app)
 */
async function getStoredVersion(): Promise<number> {
    try {
        const versionStr = await AsyncStorage.getItem(VERSION_STORAGE_KEY);
        if (versionStr === null) {
            return 0;
        }
        const version = parseInt(versionStr, 10);
        return isNaN(version) ? 0 : version;
    } catch (error) {
        console.error('[Migration] Failed to get stored version:', error);
        return 0;
    }
}

/**
 * Save the current data version to storage
 */
async function setStoredVersion(version: number): Promise<void> {
    try {
        await AsyncStorage.setItem(VERSION_STORAGE_KEY, version.toString());
    } catch (error) {
        console.error('[Migration] Failed to set stored version:', error);
        throw error;
    }
}

/**
 * Run all pending migrations
 *
 * This function:
 * 1. Gets the current stored version (defaults to 0)
 * 2. Runs all migrations with version > stored version, in order
 * 3. Updates stored version after each successful migration
 * 4. Stops execution if any migration fails
 *
 * @returns Promise<boolean> - true if all migrations ran successfully, false if any failed
 */
export async function runMigrations(): Promise<boolean> {
    console.log('[Migration] Starting migration check...');

    try {
        const storedVersion = await getStoredVersion();
        console.log(`[Migration] Current stored version: ${storedVersion}, target version: ${CURRENT_VERSION}`);

        if (storedVersion >= CURRENT_VERSION) {
            console.log('[Migration] No migrations needed, already at current version');
            return true;
        }

        // Sort migrations by version to ensure correct order
        const sortedMigrations = [...migrations].sort((a, b) => a.version - b.version);

        // Filter to only migrations that need to run
        const pendingMigrations = sortedMigrations.filter(m => m.version > storedVersion);

        console.log(`[Migration] ${pendingMigrations.length} migration(s) to run`);

        for (const migration of pendingMigrations) {
            console.log(`[Migration] Running migration v${migration.version}: ${migration.description}`);

            try {
                await migration.migrate();

                // Update stored version after successful migration
                await setStoredVersion(migration.version);
                console.log(`[Migration] Successfully completed migration v${migration.version}`);
            } catch (error) {
                console.error(`[Migration] Migration v${migration.version} failed:`, error);
                // Stop execution on failure - don't run subsequent migrations
                return false;
            }
        }

        console.log(`[Migration] All migrations completed successfully. Now at version ${CURRENT_VERSION}`);
        return true;
    } catch (error) {
        console.error('[Migration] Migration system error:', error);
        return false;
    }
}

/**
 * Reset the stored version to 0
 * Useful for testing migrations
 */
export async function resetMigrationVersion(): Promise<void> {
    try {
        await AsyncStorage.removeItem(VERSION_STORAGE_KEY);
        console.log('[Migration] Migration version reset to 0');
    } catch (error) {
        console.error('[Migration] Failed to reset migration version:', error);
    }
}

/**
 * Get migration status information
 * Useful for debugging and displaying in settings
 */
export async function getMigrationStatus(): Promise<{
    storedVersion: number;
    currentVersion: number;
    pendingMigrations: number;
    migrationDescriptions: string[];
}> {
    const storedVersion = await getStoredVersion();
    const pendingMigrations = migrations.filter(m => m.version > storedVersion);

    return {
        storedVersion,
        currentVersion: CURRENT_VERSION,
        pendingMigrations: pendingMigrations.length,
        migrationDescriptions: pendingMigrations.map(m => `v${m.version}: ${m.description}`),
    };
}
