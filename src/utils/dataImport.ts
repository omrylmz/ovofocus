/**
 * Data Import/Restore Utilities for OvoFocus
 * Provides functions to import and restore user data from backup files
 */

import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExportData, EXPORT_VERSION } from './dataExport';
import { CollectedAnimal, Stats, Settings, STORAGE_KEYS } from './storage';

// Validation result types
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data?: ExportData;
}

export interface ImportResult {
    success: boolean;
    message: string;
    importedAt?: string;
}

/**
 * Validates the structure and content of imported data
 */
export function validateImportData(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            errors: ['Invalid file format: expected JSON object'],
            warnings: [],
        };
    }

    const importData = data as Record<string, unknown>;

    // Check required fields
    if (!importData.version) {
        errors.push('Missing version field');
    } else if (typeof importData.version !== 'string') {
        errors.push('Invalid version field type');
    } else if (importData.version !== EXPORT_VERSION) {
        // For now, we only support exact version match
        // In the future, we could add migration logic here
        warnings.push(`Version mismatch: file version is ${importData.version}, expected ${EXPORT_VERSION}`);
    }

    if (!importData.exportDate) {
        warnings.push('Missing export date');
    }

    // Validate collection
    if (!importData.collection) {
        errors.push('Missing collection data');
    } else if (!Array.isArray(importData.collection)) {
        errors.push('Collection must be an array');
    } else {
        // Validate each animal in collection
        const collection = importData.collection as unknown[];
        collection.forEach((item, index) => {
            if (!isValidCollectedAnimal(item)) {
                errors.push(`Invalid animal at collection index ${index}`);
            }
        });
    }

    // Validate stats
    if (!importData.stats) {
        errors.push('Missing stats data');
    } else if (!isValidStats(importData.stats)) {
        errors.push('Invalid stats data structure');
    }

    // Validate settings
    if (!importData.settings) {
        errors.push('Missing settings data');
    } else if (!isValidSettings(importData.settings)) {
        // Settings can have partial data, we'll merge with defaults
        warnings.push('Some settings may be missing, will use defaults');
    }

    // Validate favorites
    if (!importData.favorites) {
        warnings.push('Missing favorites data, will be set to empty');
    } else if (!Array.isArray(importData.favorites)) {
        errors.push('Favorites must be an array');
    } else {
        const favorites = importData.favorites as unknown[];
        if (!favorites.every(f => typeof f === 'string')) {
            errors.push('Favorites must be an array of strings');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? (importData as unknown as ExportData) : undefined,
    };
}

/**
 * Type guard for CollectedAnimal
 */
function isValidCollectedAnimal(item: unknown): item is CollectedAnimal {
    if (!item || typeof item !== 'object') return false;

    const animal = item as Record<string, unknown>;

    return (
        typeof animal.id === 'string' &&
        typeof animal.emoji === 'string' &&
        typeof animal.rarity === 'string' &&
        ['common', 'rare', 'epic', 'legendary'].includes(animal.rarity as string) &&
        typeof animal.collectedAt === 'string' &&
        typeof animal.sessionId === 'string'
    );
}

/**
 * Type guard for Stats
 * Validates that all numeric fields are non-negative and logically consistent
 */
function isValidStats(item: unknown): item is Stats {
    if (!item || typeof item !== 'object') return false;

    const stats = item as Record<string, unknown>;

    // Check type and non-negative validation for all numeric fields
    const totalSessions = stats.totalSessions;
    const completedSessions = stats.completedSessions;
    const failedSessions = stats.failedSessions;
    const totalFocusMinutes = stats.totalFocusMinutes;
    const currentStreak = stats.currentStreak;
    const bestStreak = stats.bestStreak;

    // Type validation
    if (
        typeof totalSessions !== 'number' ||
        typeof completedSessions !== 'number' ||
        typeof failedSessions !== 'number' ||
        typeof totalFocusMinutes !== 'number' ||
        typeof currentStreak !== 'number' ||
        typeof bestStreak !== 'number' ||
        !(stats.lastSessionDate === null || typeof stats.lastSessionDate === 'string')
    ) {
        return false;
    }

    // Sanitize negative values to 0 instead of rejecting
    if (totalSessions < 0) stats.totalSessions = 0;
    if (completedSessions < 0) stats.completedSessions = 0;
    if (failedSessions < 0) stats.failedSessions = 0;
    if (totalFocusMinutes < 0) stats.totalFocusMinutes = 0;
    if (currentStreak < 0) stats.currentStreak = 0;
    if (bestStreak < 0) stats.bestStreak = 0;

    // Logical validation: completed + failed should not exceed total sessions
    if (completedSessions + failedSessions > totalSessions) {
        return false;
    }

    // Logical validation: current streak should not exceed best streak
    if (currentStreak > bestStreak) {
        return false;
    }

    return true;
}

/**
 * Type guard for Settings (partial validation)
 */
function isValidSettings(item: unknown): item is Partial<Settings> {
    if (!item || typeof item !== 'object') return false;

    const settings = item as Record<string, unknown>;

    // Check a few key settings to ensure basic validity
    if (settings.focusDuration !== undefined && typeof settings.focusDuration !== 'number') {
        return false;
    }
    if (settings.soundEnabled !== undefined && typeof settings.soundEnabled !== 'boolean') {
        return false;
    }
    if (settings.language !== undefined && !['en', 'tr'].includes(settings.language as string)) {
        return false;
    }

    return true;
}

/**
 * Opens a file picker to select a backup file
 * @returns The content of the selected file, or null if cancelled
 */
export async function pickBackupFile(): Promise<string | null> {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return null;
        }

        const asset = result.assets[0];
        if (!asset || !asset.uri) {
            return null;
        }

        // Read the file content using the new File API
        const file = new File(asset.uri);
        const content = await file.text();

        // Clean up the cached file
        try {
            await file.delete();
        } catch {
            // Ignore cleanup errors
        }

        return content;
    } catch (error) {
        console.error('[DataImport] Error picking backup file:', error);
        throw new Error('Failed to read backup file');
    }
}

/**
 * Parses and validates a backup file content
 * @param content The JSON string content of the backup file
 */
export function parseBackupFile(content: string): ValidationResult {
    try {
        const data = JSON.parse(content);
        return validateImportData(data);
    } catch {
        return {
            valid: false,
            errors: ['Invalid JSON format: unable to parse file'],
            warnings: [],
        };
    }
}

/**
 * Restores data from a validated backup
 * @param data The validated export data to restore
 */
export async function restoreFromBackup(data: ExportData): Promise<ImportResult> {
    // Backup existing data before overwrite
    let backup: readonly [string, string | null][] = [];
    try {
        const keys = [STORAGE_KEYS.COLLECTION, STORAGE_KEYS.STATS, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.FAVORITES];
        backup = await AsyncStorage.multiGet(keys);
    } catch (backupError) {
        console.warn('[DataImport] Could not backup existing data:', backupError);
    }

    try {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.COLLECTION, JSON.stringify(data.collection)],
            [STORAGE_KEYS.STATS, JSON.stringify(data.stats)],
            [STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings)],
            [STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites || [])],
        ]);
        return { success: true, message: 'Data restored successfully', importedAt: new Date().toISOString() };
    } catch (error) {
        console.error('[DataImport] Error restoring backup:', error);
        // Attempt rollback to previous data
        try {
            const rollbackPairs = backup.filter((pair): pair is [string, string] => pair[1] !== null);
            if (rollbackPairs.length > 0) {
                await AsyncStorage.multiSet(rollbackPairs);
            }
        } catch (rollbackError) {
            console.error('[DataImport] Rollback also failed:', rollbackError);
        }
        return { success: false, message: 'Failed to restore data. Please try again.' };
    }
}

/**
 * Complete import flow - picks file, validates, and returns validation result
 * Does NOT automatically restore - caller should confirm with user first
 */
export async function selectAndValidateBackup(): Promise<ValidationResult | null> {
    const content = await pickBackupFile();

    if (!content) {
        return null; // User cancelled
    }

    return parseBackupFile(content);
}

/**
 * Gets a summary of what will be imported
 */
export function getImportSummary(data: ExportData): {
    animalsCount: number;
    totalSessions: number;
    completedSessions: number;
    totalMinutes: number;
    exportDate: string;
} {
    return {
        animalsCount: data.collection.length,
        totalSessions: data.stats.totalSessions,
        completedSessions: data.stats.completedSessions,
        totalMinutes: data.stats.totalFocusMinutes,
        exportDate: data.exportDate,
    };
}
