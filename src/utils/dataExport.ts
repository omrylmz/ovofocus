/**
 * Data Export Utilities for OvoFocus
 * Provides functions to export user data in JSON and CSV formats
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
    getCollection,
    getStats,
    getSettings,
    getFavorites,
    CollectedAnimal,
    Stats,
    Settings,
} from './storage';
import { Language, getAnimalName } from '../i18n/translations';

// Export data structure
export interface ExportData {
    version: string;
    exportDate: string;
    collection: CollectedAnimal[];
    stats: Stats;
    settings: Settings;
    favorites: string[];
}

// Current export format version
export const EXPORT_VERSION = '1.0';

/**
 * Gathers all user data for export
 */
export async function gatherExportData(): Promise<ExportData> {
    const [collection, stats, settings, favorites] = await Promise.all([
        getCollection(),
        getStats(),
        getSettings(),
        getFavorites(),
    ]);

    return {
        version: EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        collection,
        stats,
        settings,
        favorites,
    };
}

/**
 * Generates a timestamp string for file naming
 */
function getTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Exports all user data to JSON format (full backup)
 * @returns File URI of the exported JSON file
 */
export async function exportToJSON(): Promise<string> {
    const data = await gatherExportData();
    const jsonString = JSON.stringify(data, null, 2);
    const filename = `ovofocus_backup_${getTimestamp()}.json`;
    const file = new File(Paths.cache, filename);

    await file.write(jsonString);

    return file.uri;
}

/**
 * Converts stats data to CSV format
 */
function statsToCSV(stats: Stats, exportDate: string): string {
    const headers = [
        'Export Date',
        'Total Sessions',
        'Completed Sessions',
        'Failed Sessions',
        'Total Focus Minutes',
        'Current Streak',
        'Best Streak',
        'Last Session Date',
    ];

    const values = [
        exportDate,
        stats.totalSessions.toString(),
        stats.completedSessions.toString(),
        stats.failedSessions.toString(),
        stats.totalFocusMinutes.toString(),
        stats.currentStreak.toString(),
        stats.bestStreak.toString(),
        stats.lastSessionDate || 'N/A',
    ];

    return `${headers.join(',')}\n${values.join(',')}`;
}

/**
 * Converts collection data to CSV format
 * @param collection The collection of animals to export
 * @param language The language to use for animal names (defaults to 'en')
 */
function collectionToCSV(collection: CollectedAnimal[], language: Language = 'en'): string {
    if (collection.length === 0) {
        return 'No animals collected yet';
    }

    const headers = [
        'Animal ID',
        'Name',
        'Emoji',
        'Rarity',
        'Collected At',
        'Session ID',
    ];

    const rows = collection.map(animal => [
        animal.id,
        getAnimalName(animal.id, language),
        animal.emoji,
        animal.rarity,
        animal.collectedAt,
        animal.sessionId,
    ].join(','));

    return `${headers.join(',')}\n${rows.join('\n')}`;
}

/**
 * Exports stats and collection data to CSV format (for spreadsheet analysis)
 * Creates a ZIP-like structure with multiple CSV sections in one file
 * @returns File URI of the exported CSV file
 */
export async function exportToCSV(): Promise<string> {
    const data = await gatherExportData();

    // Use the user's language setting for translated animal names
    const language: Language = data.settings.language || 'en';

    // Create CSV content with multiple sections
    const sections = [
        '=== OVO FOCUS DATA EXPORT ===',
        `Export Date: ${data.exportDate}`,
        `Version: ${data.version}`,
        '',
        '=== STATISTICS ===',
        statsToCSV(data.stats, data.exportDate),
        '',
        '=== COLLECTION ===',
        collectionToCSV(data.collection, language),
        '',
        '=== FAVORITES ===',
        data.favorites.length > 0 ? data.favorites.join(', ') : 'No favorites yet',
    ];

    const csvContent = sections.join('\n');
    const filename = `ovofocus_stats_${getTimestamp()}.csv`;
    const file = new File(Paths.cache, filename);

    await file.write(csvContent);

    return file.uri;
}

/**
 * Shares an exported file using the device's native share sheet
 * @param fileUri The URI of the file to share
 */
export async function shareExportedFile(fileUri: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
        mimeType: fileUri.endsWith('.json') ? 'application/json' : 'text/csv',
        dialogTitle: 'Export OvoFocus Data',
    });
}

/**
 * Complete export flow - generates file and opens share dialog
 * @param format Export format: 'json' for full backup, 'csv' for stats only
 */
export async function exportAndShare(format: 'json' | 'csv'): Promise<void> {
    const fileUri = format === 'json'
        ? await exportToJSON()
        : await exportToCSV();

    await shareExportedFile(fileUri);

    // Clean up the temp file after sharing
    // Note: We use a longer delay (10s) to ensure the share dialog has fully read the file
    // on slower devices or when sharing to apps that take time to process
    setTimeout(async () => {
        try {
            const file = new File(fileUri);
            await file.delete();
            console.log('[DataExport] Temp file cleaned up successfully:', fileUri);
        } catch (error) {
            console.warn('[DataExport] Failed to clean up temp file:', fileUri, error);
        }
    }, 10000);
}

/**
 * Checks if export functionality is available on this device
 */
export async function isExportAvailable(): Promise<boolean> {
    return Sharing.isAvailableAsync();
}
